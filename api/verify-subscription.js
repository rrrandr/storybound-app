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
// Monthly free Tempt Fate charges per tier (Favored 1, Chosen 3). Idempotent
// per calendar month via profiles.tempt_grant_month.
const TEMPT_GRANT = { storied: 0, favored: 1, chosen: 3 };
const _temptMonthKey = () => new Date().toISOString().slice(0, 7);

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

// Fortune-pack amount from the purchase_intents.type ('fortune_240' → 240).
// Used by the intent-keyed recovery (which has the intent type even when the
// session's price_id metadata is absent). Roman 2026-06-10.
function typeToFortunePackAmount(type) {
  switch (type) {
    case 'fortune_20':  return 20;
    case 'fortune_60':  return 60;
    case 'fortune_120': return 120;
    case 'fortune_240': return 240;
    default: return null;
  }
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
    .select('id, fortunes, stripe_customer_id, stripe_subscription_id, is_subscriber, subscription_tier, billing_status, bonus_tempt_charges, tempt_grant_month')
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
      // ── Monthly Tempt Fate reconcile (independent of the one-time fortune
      // grant) ── The free Tempt Fate grant (Favored 1, Chosen 3) must fire for
      // ANY active subscriber who hasn't been granted this calendar month —
      // whether or not the subscription is newly bound. (The fortune grant
      // below only fires when the sub was never bound; an already-bound
      // subscriber would otherwise never get their monthly Tempt Fates here.)
      // Idempotent via profiles.tempt_grant_month.
      const _tMonth = _temptMonthKey();
      if (TEMPT_GRANT[expectedTier] && profile.tempt_grant_month !== _tMonth) {
        const _newTempt = (profile.bonus_tempt_charges || 0) + TEMPT_GRANT[expectedTier];
        const { error: _tErr } = await supabase
          .from('profiles')
          .update({ bonus_tempt_charges: _newTempt, tempt_grant_month: _tMonth })
          .eq('id', userId);
        if (_tErr) {
          console.warn('[verify-subscription] monthly tempt grant failed:', _tErr.message);
        } else {
          console.log(`[verify-subscription] user ${userId} monthly Tempt Fate grant: +${TEMPT_GRANT[expectedTier]} (${expectedTier}, month ${_tMonth}) → ${_newTempt}`);
          summary.repairs.push({
            kind: 'monthly_tempt_grant',
            tier: expectedTier,
            tempt_charges_granted: TEMPT_GRANT[expectedTier],
            bonus_tempt_charges: _newTempt,
            month: _tMonth,
          });
          profile.bonus_tempt_charges = _newTempt;
          profile.tempt_grant_month = _tMonth;
        }
      }
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
          // Best-effort ledger credit row (audit only — NEVER block the repair on this).
          try {
            const { error: ledErr } = await supabase.from('fortune_ledger').insert({
              user_id: userId,
              amount: grantAmount,
              direction: 'credit',
              context: 'subscription',
              balance_after: newBalance,
              source_endpoint: 'verify-subscription',
              metadata: { repair: 'missed_subscription_grant', subscription_id: activeSub.id, tier: expectedTier },
            });
            if (ledErr) console.warn('[verify-subscription] repair credit ledger insert failed (non-fatal):', ledErr.message);
          } catch (e) {
            console.warn('[verify-subscription] repair credit ledger insert threw (non-fatal):', e.message);
          }
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

  // 4. UNGRANTED purchase_intents — recover missed fortune-pack grants (and any
  //    subscription grant whose intent never credited). Eligibility is now the
  //    MONEY-PATH marker `fortunes_granted_at IS NULL`, NOT status — so an
  //    intent the client marked 'resumed' before the webhook ran (the race
  //    this whole change fixes) is still recoverable here. grant_purchase_fortunes
  //    is idempotent on the same marker, so calling it for an already-granted
  //    intent is a safe no-op.
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
      .select('id, status, type, fortunes_granted_at')
      .eq('id', intentId)
      .maybeSingle();
    if (iErr) {
      console.warn('[verify-subscription] intent load failed:', iErr.message);
      continue;
    }
    // Skip only if the money-path marker says it was already credited —
    // NOT based on status (a 'resumed'/'completed' status no longer implies
    // the fortunes actually landed).
    if (!intent || intent.fortunes_granted_at) continue;

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
      // SUBSCRIBER BONUS (Roman 2026-05-30): +10% on Fortune pack purchases
      // for active subscribers (matches stripe-webhook.js). The profile was
      // loaded above; use is_subscriber as the gate.
      if (profile && profile.is_subscriber) {
        const _packBonus = Math.round(packAmount * 0.10);
        if (_packBonus > 0) {
          fortunesToGrant += _packBonus;
          console.log(`[verify-subscription] Subscriber bonus on missed pack: +${_packBonus}F on ${packAmount}F`);
        }
      }
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

  // 4b. INTENT-KEYED recovery (Roman 2026-06-10) — the customer-list pass above
  //     queries Stripe BY customer, which MISSES pack sessions created without a
  //     `customer` link (payment-mode Checkout spawns a guest customer, so the
  //     session is never attached to profile.stripe_customer_id). That left
  //     genuinely-paid fortune packs un-granted with NO recovery path whenever the
  //     webhook didn't land (localhost; webhook outage). Recover directly from the
  //     user's OWN ungranted purchase_intents — each stores its stripe_session_id —
  //     retrieving + confirming the session was actually PAID before granting.
  //     Independent of customer linkage. grant_purchase_fortunes is idempotent.
  //
  //     HARD TIME BOUND (Roman 2026-06-10): only recover sessions paid in the last
  //     RECOVERY_WINDOW. This pass queries by user_id (not customer + last-20 like the
  //     pass above), so WITHOUT this bound it sweeps the user's ENTIRE history — and
  //     historical intents in the 'resumed' race-state carry a NULL fortunes_granted_at
  //     even though they were already credited (the idempotency backfill only stamped
  //     status='completed'), so they get RE-GRANTED. That over-credits (observed: a
  //     reconcile jumped to 912F / repairs:4 by re-granting old packs). The legitimate
  //     job here is recovering the checkout the user JUST returned from, so bound it to
  //     recently-paid sessions via Stripe's own session.created timestamp.
  const _RECOVERY_WINDOW_S = 6 * 3600; // 6h — generous for return latency, excludes history
  const _nowS = Math.floor(Date.now() / 1000);
  try {
    const { data: pendingIntents, error: piErr } = await supabase
      .from('purchase_intents')
      .select('id, type, stripe_session_id, fortunes_granted_at')
      .eq('user_id', userId)
      .is('fortunes_granted_at', null)
      .not('stripe_session_id', 'is', null)
      .limit(25);
    if (piErr) console.warn('[verify-subscription] pending-intent query failed:', piErr.message);
    for (const intent of (pendingIntents || [])) {
      if (summary.repairs.some(r => r.intent_id === intent.id)) continue; // already handled by the customer-list pass
      let session;
      try { session = await stripe.checkout.sessions.retrieve(intent.stripe_session_id); }
      catch (e) { console.warn(`[verify-subscription] session ${intent.stripe_session_id} retrieve failed:`, e.message); continue; }
      // Grant ONLY on a genuinely complete + PAID session (never trust the intent row alone).
      if (!session || session.status !== 'complete' || session.payment_status !== 'paid') continue;
      // Time bound: never re-grant an old purchase whose marker is spuriously NULL.
      if (session.created && (_nowS - session.created) > _RECOVERY_WINDOW_S) {
        console.log(`[verify-subscription] intent ${intent.id} skipped — session ${(_nowS - session.created)}s old (> ${_RECOVERY_WINDOW_S}s recovery window); not a just-completed checkout.`);
        continue;
      }
      const priceId = session.metadata?.price_id;
      const tier = priceIdToTier(priceId);
      let fortunesToGrant = 0;
      const packAmount = priceIdToFortunePackAmount(priceId) || typeToFortunePackAmount(intent.type);
      if (tier) {
        if (summary.repairs.some(r => r.kind === 'missed_subscription_grant' && r.tier === tier)) continue;
        fortunesToGrant = SUB_FORTUNES[tier];
      } else if (packAmount) {
        fortunesToGrant = packAmount;
        if (profile && profile.is_subscriber) {
          const _packBonus = Math.round(packAmount * 0.10);
          if (_packBonus > 0) {
            fortunesToGrant += _packBonus;
            console.log(`[verify-subscription] Subscriber bonus on intent-keyed pack: +${_packBonus}F on ${packAmount}F`);
          }
        }
      } else {
        continue;
      }
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('grant_purchase_fortunes', {
        p_user_id: userId,
        p_intent_id: intent.id,
        p_fortunes: fortunesToGrant,
      });
      if (rpcErr) {
        console.warn(`[verify-subscription] intent-keyed grant RPC failed (intent ${intent.id}):`, rpcErr.message);
        continue;
      }
      if (rpcResult && rpcResult.granted) {
        console.log(`[verify-subscription] user ${userId} intent-keyed grant applied: intent=${intent.id} +${fortunesToGrant}F → balance ${rpcResult.new_balance}`);
        summary.repairs.push({
          kind: 'intent_keyed_grant_applied',
          intent_id: intent.id,
          session_id: intent.stripe_session_id,
          price_id: priceId || null,
          tier: tier || null,
          fortunes_granted: fortunesToGrant,
          new_balance: rpcResult.new_balance,
        });
        summary.fortunes_after = rpcResult.new_balance || summary.fortunes_after;
      }
    }
  } catch (e) {
    console.warn('[verify-subscription] intent-keyed recovery threw:', e.message);
  }

  if (summary.repairs.length === 0) {
    summary.action = 'no_drift';
  }

  return res.status(200).json(summary);
}
