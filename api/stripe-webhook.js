import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';
import { stripe as stripeClient } from '../lib/stripe.js';

// Vercel: disable automatic body parsing so we can read the raw buffer
export const config = { api: { bodyParser: false } };

// Subscription tier → fortune grant amounts (granted additively on first purchase + every renewal)
const SUB_FORTUNES = { storied: 100, favored: 200, chosen: 400 };
// Monthly free Tempt Fate charges per tier (advertised: Favored 1, Chosen 3).
// Granted once per calendar month, idempotent via profiles.tempt_grant_month.
const TEMPT_GRANT = { storied: 0, favored: 1, chosen: 3 };
const _temptMonthKey = () => new Date().toISOString().slice(0, 7); // YYYY-MM (UTC)

/**
 * Look up a profile by stripe_subscription_id first, fall back to stripe_customer_id.
 */
async function resolveProfileBySubscription(supabase, subscriptionId, customerId) {
  if (subscriptionId) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();
    if (data) return data.id;
  }
  if (customerId) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();
    if (data) return data.id;
  }
  return null;
}

/**
 * Read the current fortunes balance for a user.
 * Used before additive grants and refund deductions.
 */
async function readFortunes(supabase, userId) {
  const { data } = await supabase
    .from('profiles')
    .select('fortunes')
    .eq('id', userId)
    .single();
  return data?.fortunes || 0;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let rawBody;
  try {
    rawBody = await buffer(req);
  } catch (err) {
    console.error('[stripe-webhook] Failed to read body:', err);
    return res.status(400).json({ error: 'Bad request' });
  }

  let event;
  if (
    req.headers.host?.includes('localhost') ||
    process.env.VERCEL_ENV === 'development'
  ) {
    try {
      event = JSON.parse(rawBody.toString());
      console.log('[stripe-webhook] Local dev — skipped signature verification');
    } catch (err) {
      console.error('[stripe-webhook] Invalid JSON:', err.message);
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  } else {
    try {
      event = stripeClient.webhooks.constructEvent(
        rawBody,
        req.headers['stripe-signature'],
        secret
      );
    } catch (err) {
      console.error('[stripe-webhook] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  console.log(`[stripe-webhook] Received: ${event.id} ${event.type}`);

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[stripe-webhook] Supabase env vars missing');
    return res.status(200).json({ received: true, error: 'supabase_not_configured' });
  }
  const supabase = createClient(sbUrl, sbKey);

  // ── Idempotency guard — atomic claim via stripe_events.processed flag ──
  // Pattern: best-effort insert, then atomically transition processed false→true
  // with a conditional UPDATE. Whoever wins the UPDATE owns the event and
  // proceeds; concurrent handlers and Stripe redeliveries bail with 200. On
  // processing error we roll the flag back so Stripe's retry can re-claim.
  // This is the single lock for ALL event types — additive grants like
  // invoice.paid (subscription renewal) and charge.refunded reversals are
  // race-safe under it.
  {
    const { error: insertErr } = await supabase
      .from('stripe_events')
      .insert({
        id: event.id,
        type: event.type,
        payload: event,
        processed: false,
      });
    if (insertErr && !/duplicate key/i.test(insertErr.message || '')) {
      console.warn(`[stripe-webhook] Event insert failed (${event.id}):`, insertErr.message);
    }

    const { data: claimed, error: claimErr } = await supabase
      .from('stripe_events')
      .update({ processed: true })
      .eq('id', event.id)
      .eq('processed', false)
      .select('id');

    if (claimErr) {
      console.error(`[stripe-webhook] Claim query failed (${event.id}):`, claimErr.message);
      return res.status(500).json({ error: 'claim_failed' });
    }

    if (!claimed || claimed.length === 0) {
      console.log(`[stripe-webhook] Event ${event.id} already claimed/processed — skipping`);
      return res.status(200).json({ received: true });
    }
    console.log(`[stripe-webhook] Claimed: ${event.id} ${event.type}`);
  }

  let processingError = null;
  let detectedUserId = null;
  let checkoutSessionId = null;
  let stripeCustomerIdForEvent = null;

  try {

  // ── checkout.session.completed ──
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const supabaseUserId = session.metadata?.supabase_user_id || session.client_reference_id;
    detectedUserId = supabaseUserId || null;
    checkoutSessionId = session.id || null;
    const stripeCustomerId = session.customer;
    stripeCustomerIdForEvent = stripeCustomerId || null;
    const stripeSubscriptionId = session.subscription;
    const priceId = session.metadata?.price_id;
    const purchaseType = session.metadata?.purchase_type || null;
    if (!priceId) console.warn('[stripe-webhook] No price_id found in session metadata');

    if (!supabaseUserId) {
      console.error('[stripe-webhook] No supabaseUserId in session:', session.id);
      return res.status(200).json({ received: true, error: 'no_user_id' });
    }

    console.log(`[stripe-webhook] checkout.session.completed — user: ${supabaseUserId}, price: ${priceId}, customer: ${stripeCustomerId}, subscription: ${stripeSubscriptionId}, type: ${purchaseType || 'unknown'}`);

    const updates = {};
    if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId;
    if (stripeSubscriptionId) updates.stripe_subscription_id = stripeSubscriptionId;

    // CHOSEN was missing from this list (bug fixed 2026-05-21): a Chosen
    // checkout would fall through both the subscription block AND the
    // fortune-pack block, leaving fortunesDelta=0 — the grant_purchase_fortunes
    // RPC then transitioned the intent to 'completed' with 0F added, and
    // the optimistic-client-side balance silently expired on the next reload.
    // The renewal branch (line ~291) already covered all three tiers, but
    // the initial-purchase branch did not. Now all three are recognized.
    const isSubscription = priceId && (
      priceId === process.env.STRIPE_PRICE_ID_STORIED ||
      priceId === process.env.STRIPE_PRICE_ID_FAVORED ||
      priceId === process.env.STRIPE_PRICE_ID_CHOSEN
    );

    const fortunePriceIds = [
      process.env.STRIPE_PRICE_ID_FORTUNES_20,
      process.env.STRIPE_PRICE_ID_FORTUNES_60,
      process.env.STRIPE_PRICE_ID_FORTUNES_120,
      process.env.STRIPE_PRICE_ID_FORTUNES_240,
    ].filter(Boolean);
    const isFortunePack = priceId && fortunePriceIds.includes(priceId);

    // Compute the fortunes delta for this purchase (additive in all cases)
    let fortunesDelta = 0;
    if (isSubscription) {
      const tier = session.metadata?.subscription_tier;
      if (!tier || !SUB_FORTUNES[tier]) {
        console.error(`[stripe-webhook] Subscription session missing valid subscription_tier in metadata. Got: ${tier}. Session: ${session.id}`);
      } else {
        updates.is_subscriber = true;
        updates.subscription_tier = tier;
        updates.billing_status = 'active';
        updates.billing_grace_until = null;
        fortunesDelta += SUB_FORTUNES[tier];
        console.log(`[stripe-webhook] Granting ${tier} subscription + ${SUB_FORTUNES[tier]} fortunes (additive) to ${supabaseUserId}`);

        // Monthly free Tempt Fate grant (Favored 1, Chosen 3). Idempotent per
        // calendar month via profiles.tempt_grant_month so re-subscribe /
        // multiple events in the same month don't stack. Written into `updates`
        // (applied at the metadata update below; bonus_tempt_charges is its own
        // column, not owned by the grant_purchase_fortunes RPC).
        if (TEMPT_GRANT[tier]) {
          const monthKey = _temptMonthKey();
          const { data: tp } = await supabase.from('profiles')
            .select('bonus_tempt_charges, tempt_grant_month').eq('id', supabaseUserId).maybeSingle();
          if (!tp || tp.tempt_grant_month !== monthKey) {
            updates.bonus_tempt_charges = (tp?.bonus_tempt_charges || 0) + TEMPT_GRANT[tier];
            updates.tempt_grant_month = monthKey;
            console.log(`[stripe-webhook] Granting ${TEMPT_GRANT[tier]} monthly Tempt Fate(s) (${tier}) → ${updates.bonus_tempt_charges} (month ${monthKey})`);
          }
        }
      }
    }

    if (isFortunePack) {
      const fortunesGranted = parseInt(session.metadata?.fortunes_granted, 10) || 0;
      // SUBSCRIBER BONUS (Roman 2026-05-30): every active subscriber
      // (Storied/Favored/Chosen) gets +10% on Fortune pack purchases,
      // rounded to nearest whole F. Bonus is added on top of the
      // metadata-declared pack size.
      let _subBonus = 0;
      try {
        const { data: _pf } = await supabase.from('profiles')
          .select('is_subscriber, subscription_tier')
          .eq('id', supabaseUserId)
          .maybeSingle();
        if (_pf && _pf.is_subscriber && fortunesGranted > 0) {
          _subBonus = Math.round(fortunesGranted * 0.10);
          console.log(`[stripe-webhook] Subscriber bonus (${_pf.subscription_tier || 'sub'}): +${_subBonus}F on ${fortunesGranted}F pack`);
        }
      } catch (e) {
        console.warn('[stripe-webhook] Subscriber bonus lookup failed:', e.message);
      }
      fortunesDelta += fortunesGranted + _subBonus;
      console.log(`[stripe-webhook] Granting Fortune pack (${fortunesGranted} + ${_subBonus} bonus = ${fortunesGranted + _subBonus} fortunes, additive) to ${supabaseUserId}`);
    }

    if (!updates.is_subscriber && fortunesDelta === 0) {
      console.warn(`[stripe-webhook] No entitlement matched for priceId: ${priceId}`);
    }

    // ── Atomic credit + intent transition (single Postgres transaction) ──
    // The grant_purchase_fortunes RPC merges the pending→completed intent
    // transition AND the additive fortunes update into one transaction. If
    // either fails, both roll back, and Stripe's retry (triggered by the
    // outer try/catch flipping stripe_events.processed back) can re-attempt
    // cleanly. The previous split-query design could leave an intent stuck
    // 'completed' with no fortunes credited if a silent error occurred
    // between the two writes.
    const purchaseIntentId = session.metadata?.purchase_intent_id;
    let intentTransitioned = !purchaseIntentId; // legacy: no intent → proceed (best effort below)

    if (purchaseIntentId) {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('grant_purchase_fortunes', {
        p_user_id: supabaseUserId,
        p_intent_id: purchaseIntentId,
        p_fortunes: fortunesDelta || 0,
      });
      if (rpcErr) {
        // Throw so the outer try/catch rolls back stripe_events.processed and
        // returns 500 — Stripe will retry, the next handler can re-claim.
        throw new Error(`grant_purchase_fortunes RPC: ${rpcErr.message}`);
      }
      // The grant is now gated on the money-path marker (fortunes_granted_at),
      // NOT on the client-controlled intent status — so a client 'resumed'
      // write can no longer skip the credit. granted=true → first credit;
      // already_granted=true → idempotent no-op (still a success, not a miss).
      intentTransitioned = !!(rpcResult && (rpcResult.granted || rpcResult.already_granted));
      if (rpcResult && rpcResult.granted) {
        console.log(`[stripe-webhook] Granted via RPC: +${fortunesDelta}F → balance ${rpcResult.new_balance} (intent ${purchaseIntentId})`);
      } else if (rpcResult && rpcResult.already_granted) {
        console.log(`[stripe-webhook] Intent ${purchaseIntentId} already granted — balance ${rpcResult.new_balance} (idempotent no-op)`);
      } else {
        console.log(`[stripe-webhook] Intent ${purchaseIntentId} grant not applied (${rpcResult?.reason || 'unknown'})`);
      }
    } else if (fortunesDelta > 0) {
      // Legacy path — no intent_id. Best-effort additive credit; not race-safe,
      // but every modern checkout has an intent_id from create-checkout-session.
      const current = await readFortunes(supabase, supabaseUserId);
      const { error: legacyErr } = await supabase
        .from('profiles')
        .update({ fortunes: current + fortunesDelta })
        .eq('id', supabaseUserId);
      if (legacyErr) {
        throw new Error(`legacy fortune credit: ${legacyErr.message}`);
      }
      console.warn(`[stripe-webhook] Legacy credit (no intent_id) +${fortunesDelta}F to ${supabaseUserId}`);
    }

    // Subscription / customer metadata — applied UNCONDITIONALLY (not gated on
    // intentTransitioned). These are idempotent IDENTITY fields (is_subscriber,
    // subscription_tier, stripe_customer_id, stripe_subscription_id,
    // billing_status) plus the monthly-idempotent tempt grant. The event-level
    // stripe_events claim already guarantees this event is processed once, so
    // there's no double-apply risk. Previously this was gated on the FORTUNE
    // grant succeeding — so a non-pending / duplicate intent ("intent not
    // pending — skipping grant") left the profile NEVER BOUND to the
    // subscription, which broke renewal resolution AND verify-subscription
    // (they look the profile up by stripe_subscription_id / stripe_customer_id).
    // fortunes are NEVER in this object — the RPC owns that field.
    delete updates.fortunes;
    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', supabaseUserId);
      if (updateErr) {
        throw new Error(`profile metadata update: ${updateErr.message}`);
      }
      console.log(`[stripe-webhook] Profile metadata bound for ${supabaseUserId}:`, updates);
    }
  }

  // ── invoice.paid — subscription renewal (or retry success after payment_failed) ──
  // Renewal is ADDITIVE: each cycle deposits SUB_FORTUNES[tier] on top of existing balance.
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    const userId = await resolveProfileBySubscription(supabase, subscriptionId, customerId);
    detectedUserId = userId || null;
    if (userId) {
      let renewalTier = null;
      if (subscriptionId) {
        try {
          const sub = await stripeClient.subscriptions.retrieve(subscriptionId);
          const subPriceId = sub.items?.data?.[0]?.price?.id;
          if (subPriceId === process.env.STRIPE_PRICE_ID_STORIED) renewalTier = 'storied';
          else if (subPriceId === process.env.STRIPE_PRICE_ID_FAVORED) renewalTier = 'favored';
          else if (subPriceId === process.env.STRIPE_PRICE_ID_CHOSEN) renewalTier = 'chosen';
        } catch (e) {
          console.warn('[stripe-webhook] invoice.paid — failed to resolve tier from subscription:', e.message);
        }
      }
      if (!renewalTier) {
        const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', userId).single();
        renewalTier = profile?.subscription_tier || 'storied';
      }
      const renewalFortunes = SUB_FORTUNES[renewalTier] || 100;
      const current = await readFortunes(supabase, userId);

      const renewalUpdate = {
        is_subscriber: true,
        subscription_tier: renewalTier,
        fortunes: current + renewalFortunes,
        billing_status: 'active',
        billing_grace_until: null,
      };
      // Monthly Tempt Fate grant on renewal — idempotent per calendar month so
      // a renewal in a month already granted (e.g. a payment retry) won't stack.
      if (TEMPT_GRANT[renewalTier]) {
        const monthKey = _temptMonthKey();
        const { data: tp } = await supabase.from('profiles')
          .select('bonus_tempt_charges, tempt_grant_month').eq('id', userId).maybeSingle();
        if (!tp || tp.tempt_grant_month !== monthKey) {
          renewalUpdate.bonus_tempt_charges = (tp?.bonus_tempt_charges || 0) + TEMPT_GRANT[renewalTier];
          renewalUpdate.tempt_grant_month = monthKey;
          console.log(`[stripe-webhook] invoice.paid — +${TEMPT_GRANT[renewalTier]} monthly Tempt Fate(s) (${renewalTier}, month ${monthKey})`);
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(renewalUpdate)
        .eq('id', userId);
      if (error) {
        console.error('[stripe-webhook] invoice.paid update failed:', error);
      } else {
        console.log(`[stripe-webhook] invoice.paid — restored ${renewalTier} sub + ${renewalFortunes}F (additive) for ${userId}, total ${current + renewalFortunes}F`);
      }
    } else {
      console.warn(`[stripe-webhook] invoice.paid — no profile found for subscription: ${subscriptionId}, customer: ${customerId}`);
    }
  }

  // ── invoice.payment_failed — start grace period ──
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    const userId = await resolveProfileBySubscription(supabase, subscriptionId, customerId);
    detectedUserId = userId || null;
    if (userId) {
      const graceUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({
          is_subscriber: false,
          billing_status: 'grace',
          billing_grace_until: graceUntil,
        })
        .eq('id', userId);
      if (error) {
        console.error('[stripe-webhook] invoice.payment_failed update failed:', error);
      } else {
        console.log(`[stripe-webhook] invoice.payment_failed — grace started for ${userId}, expires: ${graceUntil}`);
      }
    } else {
      console.warn(`[stripe-webhook] invoice.payment_failed — no profile found for subscription: ${subscriptionId}, customer: ${customerId}`);
    }
  }

  // ── customer.subscription.updated — tier change, status change, or plan modification ──
  // Tracks tier metadata; does NOT touch the unified fortunes balance (renewals handle that).
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;
    const customerId = subscription.customer;
    const status = subscription.status;

    const userId = await resolveProfileBySubscription(supabase, subscriptionId, customerId);
    detectedUserId = userId || null;
    if (userId) {
      const subPriceId = subscription.items?.data?.[0]?.price?.id;
      let updatedTier = null;
      if (subPriceId === process.env.STRIPE_PRICE_ID_STORIED) updatedTier = 'storied';
      else if (subPriceId === process.env.STRIPE_PRICE_ID_FAVORED) updatedTier = 'favored';
      else if (subPriceId === process.env.STRIPE_PRICE_ID_CHOSEN) updatedTier = 'chosen';

      const updates = {};
      if (status === 'active' || status === 'trialing') {
        if (updatedTier) updates.subscription_tier = updatedTier;
        // Detect portal-cancellation: subscription stays active until
        // period_end but cancel_at_period_end flips to true. Surface this
        // to the client via billing_status='canceling' + the end timestamp
        // stashed in billing_grace_until (column already exists; semantics
        // extend cleanly — for 'grace' it's "benefits guaranteed until X";
        // for 'canceling' it's "subscription ends at X"). Re-activation
        // through the portal sets cancel_at_period_end back to false; we
        // clear the canceling flag in that branch.
        if (subscription.cancel_at_period_end === true) {
          updates.billing_status = 'canceling';
          // cancel_at is the canonical "when does this end" timestamp on
          // the new Stripe API; current_period_end is the older fallback.
          const _endTsSec = subscription.cancel_at || subscription.current_period_end || null;
          updates.billing_grace_until = _endTsSec ? new Date(_endTsSec * 1000).toISOString() : null;
        } else if (subscription.cancel_at_period_end === false) {
          // Portal re-activation OR a freshly-created sub that's not
          // cancelling. Clear stale canceling flag if present; leave
          // 'active' for the normal case.
          updates.billing_status = 'active';
          updates.billing_grace_until = null;
        }
      } else if (status === 'past_due' || status === 'unpaid') {
        updates.is_subscriber = false;
      } else if (status === 'canceled' || status === 'incomplete_expired') {
        updates.is_subscriber = false;
        updates.subscription_tier = null;
        // Clear canceling metadata once Stripe actually ends the sub.
        updates.billing_status = 'canceled';
        updates.billing_grace_until = null;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
        if (error) {
          console.error('[stripe-webhook] customer.subscription.updated failed:', error);
        } else {
          console.log(`[stripe-webhook] customer.subscription.updated — status: ${status}, tier: ${updatedTier || 'unchanged'}, updates:`, updates);
        }
      }
    } else {
      console.warn(`[stripe-webhook] customer.subscription.updated — no profile found for subscription: ${subscriptionId}, customer: ${customerId}`);
    }
  }

  // ── customer.subscription.deleted — subscription cancelled ──
  // User keeps their unified fortunes balance; only subscription metadata clears.
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;
    const customerId = subscription.customer;

    const userId = await resolveProfileBySubscription(supabase, subscriptionId, customerId);
    detectedUserId = userId || null;
    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_subscriber: false,
          subscription_tier: null,
          billing_status: 'canceled',
          billing_grace_until: null,
        })
        .eq('id', userId);
      if (error) {
        console.error('[stripe-webhook] customer.subscription.deleted update failed:', error);
      } else {
        console.log(`[stripe-webhook] customer.subscription.deleted — revoked subscription metadata for ${userId} (fortunes balance preserved)`);
      }
    } else {
      console.warn(`[stripe-webhook] customer.subscription.deleted — no profile found for subscription: ${subscriptionId}, customer: ${customerId}`);
    }
  }

  // ── charge.refunded — deduct refunded fortunes from the unified balance ──
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const customerId = charge.customer;

    if (customerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, fortunes')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        detectedUserId = profile.id;
        let priceId = null;
        let fortunesGranted = 0;
        try {
          const paymentIntent = charge.payment_intent;
          if (paymentIntent) {
            const sessions = await stripeClient.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
            const session = sessions.data?.[0];
            if (session?.metadata) {
              priceId = session.metadata.price_id || null;
              fortunesGranted = parseInt(session.metadata.fortunes_granted, 10) || 0;
            }
          }
        } catch (err) {
          console.warn('[stripe-webhook] charge.refunded — Stripe lookup failed, full revocation:', err.message);
        }

        const updates = {};
        if (priceId === process.env.STRIPE_PRICE_ID_STORIED || priceId === process.env.STRIPE_PRICE_ID_FAVORED) {
          // Subscription refund — revoke sub status, deduct the granted fortunes
          updates.is_subscriber = false;
          updates.subscription_tier = null;
          if (fortunesGranted > 0) {
            updates.fortunes = Math.max(0, (profile.fortunes || 0) - fortunesGranted);
          }
        } else if (fortunesGranted > 0) {
          // Fortune pack refund — deduct granted fortunes, prevent negative
          updates.fortunes = Math.max(0, (profile.fortunes || 0) - fortunesGranted);
        } else {
          // Unknown product or lookup failed — full revocation (safe over-revoke)
          updates.is_subscriber = false;
          updates.subscription_tier = null;
          updates.fortunes = 0;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', profile.id);
        if (error) {
          console.error('[stripe-webhook] charge.refunded update failed:', error);
        } else {
          console.log(`[stripe-webhook] charge.refunded — revoked for ${profile.id}:`, Object.keys(updates).join(', '));
        }
      } else {
        console.warn(`[stripe-webhook] charge.refunded — no profile found for customer: ${customerId}`);
      }
    }
  }

  // ── charge.dispute.created — chargeback nukes balance ──
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object;
    const chargeId = dispute.charge;

    let customerId = null;
    try {
      const charge = await stripeClient.charges.retrieve(chargeId);
      customerId = charge.customer;
    } catch (err) {
      console.error('[stripe-webhook] charge.dispute.created — failed to retrieve charge:', err.message);
    }

    if (customerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        detectedUserId = profile.id;
        const { error } = await supabase
          .from('profiles')
          .update({
            is_subscriber: false,
            subscription_tier: null,
            fortunes: 0,
          })
          .eq('id', profile.id);
        if (error) {
          console.error('[stripe-webhook] charge.dispute.created update failed:', error);
        } else {
          console.log(`[stripe-webhook] charge.dispute.created — revoked entitlements for ${profile.id}`);
        }
      } else {
        console.warn(`[stripe-webhook] charge.dispute.created — no profile found for customer: ${customerId}`);
      }
    }
  }

  } catch (err) {
    processingError = err;
    console.error(`[stripe-webhook] Failed: ${event.id} ${event.type} user=${detectedUserId || 'unknown'}`, err.message);
  }

  // ── Store traceability fields on event record for debugging ──
  {
    const eventUpdates = {};
    if (detectedUserId) eventUpdates.user_id = detectedUserId;
    if (checkoutSessionId) eventUpdates.checkout_session_id = checkoutSessionId;
    if (stripeCustomerIdForEvent) eventUpdates.stripe_customer_id = stripeCustomerIdForEvent;

    if (Object.keys(eventUpdates).length > 0) {
      const { error: traceErr } = await supabase
        .from('stripe_events')
        .update(eventUpdates)
        .eq('id', event.id);
      if (traceErr) {
        console.warn(`[stripe-webhook] Failed to store traceability fields on event ${event.id}:`, traceErr.message);
      }
    }
  }

  if (checkoutSessionId || stripeCustomerIdForEvent) {
    console.log(`[stripe-webhook] Checkout completed — event: ${event.id}, customer: ${stripeCustomerIdForEvent || 'unknown'}, checkout_session: ${checkoutSessionId || 'unknown'}`);
  }

  if (processingError) {
    // Rollback the claim so Stripe's automatic retry (or a manual resend) can
    // re-claim the event and process it cleanly. Without this, a crash here
    // would leave processed=true with no actual side-effects committed.
    const { error: rollbackErr } = await supabase
      .from('stripe_events')
      .update({ processed: false })
      .eq('id', event.id);
    if (rollbackErr) {
      console.warn(`[stripe-webhook] Failed to rollback claim on ${event.id}:`, rollbackErr.message);
    } else {
      console.log(`[stripe-webhook] Rolled back claim on ${event.id} for retry`);
    }
    return res.status(500).json({ error: 'webhook_processing_failed' });
  }

  console.log(`[stripe-webhook] Processed: ${event.id} ${event.type} user=${detectedUserId || 'unknown'}`);

  res.status(200).json({ received: true });
}
