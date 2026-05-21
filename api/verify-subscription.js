// Subscription/fortunes reconciliation endpoint.
//
// Compares the user's Stripe-side reality (active subscriptions, recent
// completed checkout sessions) with their Supabase profile and applies
// any missing baseline grants. Idempotent: never re-grants for a
// subscription_id that's already bound on the profile; never grants for
// a purchase_intent that's already in a non-pending state.
//
// Built in response to a user whose Chosen subscription's webhook event
// silently no-op'd (chosen tier was missing from the webhook's
// isSubscription check — see stripe-webhook.js:177 — so the initial
// checkout.session.completed RPC ran with p_fortunes=0; the optimistic
// client-side balance then expired on reload and the 400F was gone).
// This endpoint surfaces such drift and repairs it without requiring an
// admin to manually update Supabase or re-fire webhooks from Stripe.
//
// POST /api/verify-subscription
// Body: { userId: "<supabase profile id>" }
// Returns: { userId, fortunes_before, fortunes_after, tier_before,
//            tier_after, repairs: [...] }

import { createClient } from '@supabase/supabase-js';
import { stripe } from '../lib/stripe.js';

const SUB_FORTUNES = { storied: 100, favored: 200, chosen: 400 };

function priceIdToTier(priceId) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_STORIED) return 'storied';
  if (priceId === process.env.STRIPE_PRICE_ID_FAVORED) return 'favored';
  if (priceId === process.env.STRIPE_PRICE_ID_CHOSEN)  return 'chosen';
  return null;
}

function priceIdToFortunePackAmount(priceId) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_FORTUNES_20)  return 20;
  if (priceId === process.env.STRIPE_PRICE_ID_FORTUNES_60)  return 60;
  if (priceId === process.env.STRIPE_PRICE_ID_FORTUNES_120) return 120;
  if (priceId === process.env.STRIPE_PRICE_ID_FORTUNES_240) return 240;
  return null;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' ||
                        origin === 'https://www.storybound.love' ||
                        origin.startsWith('http://localhost')
                          ? origin
                          : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[verify-subscription] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[verify-subscription] STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const supabase = createClient(sbUrl, sbKey);

  // 1. Load the profile.
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, fortunes, stripe_customer_id, stripe_subscription_id, is_subscriber, subscription_tier, billing_status')
    .eq('id', userId)
    .maybeSingle();
  if (pErr) {
    console.error('[verify-subscription] profile load failed:', pErr.message);
    return res.status(500).json({ error: 'profile_load_failed' });
  }
  if (!profile) return res.status(404).json({ error: 'profile_not_found' });

  const summary = {
    userId,
    fortunes_before: profile.fortunes || 0,
    fortunes_after: profile.fortunes || 0,
    tier_before: profile.subscription_tier || null,
    tier_after: profile.subscription_tier || null,
    repairs: [],
  };

  if (!profile.stripe_customer_id) {
    summary.action = 'no_stripe_customer';
    summary.note = 'Profile has no stripe_customer_id; nothing to reconcile.';
    return res.status(200).json(summary);
  }

  // 2. Query Stripe for the customer's active subscription (if any).
  let activeSub = null;
  try {
    const subs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 5,
    });
    activeSub = (subs.data || [])[0] || null;
  } catch (e) {
    console.warn('[verify-subscription] subscriptions.list failed:', e.message);
  }

  // 3. Active subscription reconciliation. Idempotency key:
  //    profile.stripe_subscription_id === activeSub.id means we've
  //    already bound + granted this specific subscription. If it
  //    differs (or is null), the initial grant for this subscription
  //    never landed correctly — apply it now.
  if (activeSub) {
    const subPriceId = activeSub.items?.data?.[0]?.price?.id;
    const expectedTier = priceIdToTier(subPriceId);
    if (expectedTier) {
      const alreadyBound = profile.stripe_subscription_id === activeSub.id;
      if (!alreadyBound) {
        const grantAmount = SUB_FORTUNES[expectedTier];
        const newBalance = (profile.fortunes || 0) + grantAmount;
        const updates = {
          is_subscriber: true,
          subscription_tier: expectedTier,
          stripe_subscription_id: activeSub.id,
          fortunes: newBalance,
          billing_status: 'active',
          billing_grace_until: null,
        };
        const { error: uErr } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);
        if (uErr) {
          console.warn('[verify-subscription] subscription drift repair failed:', uErr.message);
        } else {
          console.log(`[verify-subscription] user ${userId} missed-subscription-grant repaired: tier=${expectedTier} sub=${activeSub.id} +${grantAmount}F (balance ${profile.fortunes} → ${newBalance})`);
          summary.repairs.push({
            kind: 'missed_subscription_grant',
            subscription_id: activeSub.id,
            tier: expectedTier,
            fortunes_granted: grantAmount,
            new_balance: newBalance,
            reason: profile.stripe_subscription_id
              ? 'stripe_subscription_id_mismatch'
              : 'stripe_subscription_id_unset',
          });
          // Reflect the post-update state on the profile object for
          // downstream pending-intent checks.
          profile.fortunes = newBalance;
          profile.stripe_subscription_id = activeSub.id;
          profile.is_subscriber = true;
          profile.subscription_tier = expectedTier;
          summary.fortunes_after = newBalance;
          summary.tier_after = expectedTier;
        }
      } else if (profile.subscription_tier !== expectedTier ||
                 profile.is_subscriber !== true) {
        // Subscription is bound but metadata drifted (tier mismatch, or
        // is_subscriber=false somehow). Repair metadata only — fortunes
        // are NOT re-granted because this subscription has already been
        // bound (alreadyBound=true).
        const { error: uErr } = await supabase
          .from('profiles')
          .update({
            is_subscriber: true,
            subscription_tier: expectedTier,
            billing_status: 'active',
            billing_grace_until: null,
          })
          .eq('id', userId);
        if (!uErr) {
          summary.repairs.push({
            kind: 'tier_metadata_corrected',
            subscription_id: activeSub.id,
            tier: expectedTier,
            note: 'metadata drift repaired; fortunes not regranted',
          });
          summary.tier_after = expectedTier;
        }
      }
    }
  } else if (profile.is_subscriber && profile.stripe_subscription_id) {
    // Profile claims active subscription but Stripe says none. This is
    // a different drift class (cancellation / lapse not reflected
    // locally). The webhook should handle this via customer.subscription.deleted,
    // but if it missed, flag for visibility — don't auto-downgrade here
    // (don't want to revoke entitlements without strong signal).
    console.warn(`[verify-subscription] user ${userId} profile shows is_subscriber=true sub=${profile.stripe_subscription_id} but Stripe has no active subscription`);
    summary.repairs.push({
      kind: 'stripe_shows_no_active_subscription',
      note: 'profile claims active sub; not auto-downgraded (manual review)',
    });
  }

  // 4. Pending purchase_intents — recover missed fortune-pack grants
  //    (and any subscription grants whose intent never transitioned).
  //    Only intents in 'pending' status are eligible: 'completed'/'resumed'
  //    means we've already finalized them (even if the grant amount was
  //    wrong, that's a separate class handled by the subscription
  //    reconciliation above for subs; for fortune packs we'd need a
  //    different signal which we don't have today, so 'completed' is
  //    treated as authoritative).
  let recentSessions = [];
  try {
    const s = await stripe.checkout.sessions.list({
      customer: profile.stripe_customer_id,
      limit: 20,
    });
    recentSessions = (s.data || []).filter(sess => sess.status === 'complete');
  } catch (e) {
    console.warn('[verify-subscription] checkout.sessions.list failed:', e.message);
  }

  for (const session of recentSessions) {
    const intentId = session.metadata?.purchase_intent_id;
    const priceId = session.metadata?.price_id;
    if (!intentId || !priceId) continue;

    const { data: intent, error: iErr } = await supabase
      .from('purchase_intents')
      .select('id, status, type')
      .eq('id', intentId)
      .maybeSingle();
    if (iErr) {
      console.warn('[verify-subscription] intent load failed:', iErr.message);
      continue;
    }
    if (!intent || intent.status !== 'pending') continue;

    // Determine fortunes to grant.
    let fortunesToGrant = 0;
    const tier = priceIdToTier(priceId);
    const packAmount = priceIdToFortunePackAmount(priceId);
    if (tier) {
      // If the subscription reconciliation above already applied this
      // tier's grant for this subscription, skip — avoid double-granting
      // when a stale 'pending' intent and a new active subscription
      // refer to the same grant.
      const alreadyGrantedByActiveSubBlock = summary.repairs.some(r =>
        r.kind === 'missed_subscription_grant' && r.tier === tier
      );
      if (alreadyGrantedByActiveSubBlock) continue;
      fortunesToGrant = SUB_FORTUNES[tier];
    } else if (packAmount) {
      fortunesToGrant = packAmount;
    } else {
      continue;
    }

    const { data: rpcResult, error: rpcErr } = await supabase.rpc('grant_purchase_fortunes', {
      p_user_id: userId,
      p_intent_id: intentId,
      p_fortunes: fortunesToGrant,
    });
    if (rpcErr) {
      console.warn(`[verify-subscription] grant_purchase_fortunes RPC failed (intent ${intentId}):`, rpcErr.message);
      continue;
    }
    if (rpcResult && rpcResult.granted) {
      console.log(`[verify-subscription] user ${userId} pending-intent grant applied: intent=${intentId} +${fortunesToGrant}F → balance ${rpcResult.new_balance}`);
      summary.repairs.push({
        kind: 'pending_intent_grant_applied',
        intent_id: intentId,
        session_id: session.id,
        price_id: priceId,
        tier: tier || null,
        fortunes_granted: fortunesToGrant,
        new_balance: rpcResult.new_balance,
      });
      summary.fortunes_after = rpcResult.new_balance || summary.fortunes_after;
    }
  }

  if (summary.repairs.length === 0) {
    summary.action = 'no_drift';
  }

  return res.status(200).json(summary);
}
