import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';
import { stripe as stripeClient } from '../lib/stripe.js';

// Vercel: disable automatic body parsing so we can read the raw buffer
export const config = { api: { bodyParser: false } };

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
    // Local development: skip signature verification
    try {
      event = JSON.parse(rawBody.toString());
      console.log('[stripe-webhook] Local dev — skipped signature verification');
    } catch (err) {
      console.error('[stripe-webhook] Invalid JSON:', err.message);
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  } else {
    // Production: verify Stripe signature
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

  // ── Shared Supabase client (after signature verification) ──
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[stripe-webhook] Supabase env vars missing');
    return res.status(200).json({ received: true, error: 'supabase_not_configured' });
  }
  const supabase = createClient(sbUrl, sbKey);

  // ── Idempotency guard — prevent duplicate event processing ──
  // Requires table: stripe_events
  //   id TEXT PRIMARY KEY,
  //   type TEXT,
  //   created_at TIMESTAMPTZ DEFAULT NOW(),
  //   payload JSONB,
  //   processed BOOLEAN DEFAULT FALSE
  {
    const { data: existing } = await supabase
      .from('stripe_events')
      .select('id, processed')
      .eq('id', event.id)
      .single();

    if (existing) {
      if (existing.processed) {
        // Already successfully processed — skip
        console.log(`[stripe-webhook] Duplicate event ${event.id} (already processed), skipping`);
        return res.status(200).json({ received: true });
      }
      // Event exists but processing failed previously — allow retry
      console.log(`[stripe-webhook] Retrying unprocessed event ${event.id}`);
    }

    // Store event with full payload BEFORE processing — ensures audit trail
    // even if processing fails (Stripe will retry, and processed=false signals incomplete).
    // Uses upsert so retries of failed events don't conflict on the existing row.
    if (!existing) {
      const { error: insertErr } = await supabase
        .from('stripe_events')
        .insert({
          id: event.id,
          type: event.type,
          payload: event,
          processed: false,
        });

      if (insertErr) {
        // Race: another instance already inserted — safe to skip
        console.warn(`[stripe-webhook] Event insert race (${event.id}):`, insertErr.message);
        return res.status(200).json({ received: true });
      }
    }
  }

  // ── Process event — all handlers below; mark processed at the end ──
  let processingError = null;
  let detectedUserId = null;
  let checkoutSessionId = null;
  let stripeCustomerIdForEvent = null;
  let checkoutStoryId = null;

  try {

  // ── checkout.session.completed ──
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Metadata is authoritative — client_reference_id is a fallback
    const supabaseUserId = session.metadata?.supabase_user_id || session.client_reference_id;
    detectedUserId = supabaseUserId || null;
    checkoutSessionId = session.id || null;
    const stripeCustomerId = session.customer;
    stripeCustomerIdForEvent = stripeCustomerId || null;
    const stripeSubscriptionId = session.subscription;
    const priceId = session.metadata?.price_id;
    const storyId = session.metadata?.story_id || null;
    checkoutStoryId = storyId;
    const purchaseType = session.metadata?.purchase_type || null;
    if (!priceId) console.warn('[stripe-webhook] No price_id found in session metadata');

    if (!supabaseUserId) {
      console.error('[stripe-webhook] No supabaseUserId in session:', session.id);
      return res.status(200).json({ received: true, error: 'no_user_id' });
    }

    console.log(`[stripe-webhook] checkout.session.completed — user: ${supabaseUserId}, price: ${priceId}, customer: ${stripeCustomerId}, subscription: ${stripeSubscriptionId}, story: ${storyId || 'none'}, type: ${purchaseType || 'unknown'}`);

    const updates = {};
    if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId;
    if (stripeSubscriptionId) updates.stripe_subscription_id = stripeSubscriptionId;

    if (priceId && priceId === process.env.STRIPE_PRICE_ID_STORYPASS) {
      updates.has_storypass = true;
      console.log(`[stripe-webhook] Granting StoryPass to ${supabaseUserId}`);

      // NOTE: Storypass fortunes are story-scoped (stored on storypass_entitlements),
      // NOT added to the global profiles.purchased_fortunes balance.

      // ── Arc-based entitlement — check then insert into storypass_entitlements ──
      const arcNumber = parseInt(session.metadata?.arc_number, 10) || null;
      if (storyId && arcNumber) {
        // Check for existing entitlement before inserting
        const { data: existingArc } = await supabase
          .from('storypass_entitlements')
          .select('id')
          .eq('user_id', supabaseUserId)
          .eq('story_id', storyId)
          .eq('arc_number', arcNumber)
          .single();

        if (existingArc) {
          console.log(`[stripe-webhook] Duplicate Storypass purchase ignored — user: ${supabaseUserId}, story: ${storyId}, arc: ${arcNumber}`);
        } else {
          const { error: arcErr } = await supabase
            .from('storypass_entitlements')
            .insert({
              user_id: supabaseUserId,
              story_id: storyId,
              arc_number: arcNumber,
              storypass_fortunes_remaining: 20,
            });
          if (arcErr) {
            // Unique constraint catch — race condition between check and insert
            if (arcErr.code === '23505') {
              console.log(`[stripe-webhook] Duplicate Storypass purchase ignored (constraint) — user: ${supabaseUserId}, story: ${storyId}, arc: ${arcNumber}`);
            } else {
              console.error(`[stripe-webhook] Failed to create arc entitlement (arc ${arcNumber}, story ${storyId}):`, arcErr.message);
            }
          } else {
            console.log(`[stripe-webhook] Arc entitlement created with 20 story-scoped fortunes — user: ${supabaseUserId}, story: ${storyId}, arc: ${arcNumber}`);
          }
        }
      } else {
        console.warn(`[stripe-webhook] Storypass purchased without arc metadata — story: ${storyId || 'none'}, arc: ${arcNumber || 'none'}`);
      }
    }

    const isSubscription = priceId && (
      priceId === process.env.STRIPE_PRICE_ID_STORIED ||
      priceId === process.env.STRIPE_PRICE_ID_FAVORED
    );

    if (isSubscription) {
      const tier = session.metadata?.subscription_tier;
      const SUB_FORTUNES = { storied: 100, favored: 200, chosen: 400 };
      if (!tier || !SUB_FORTUNES[tier]) {
        console.error(`[stripe-webhook] Subscription session missing valid subscription_tier in metadata. Got: ${tier}. Session: ${session.id}`);
      } else {
        updates.is_subscriber = true;
        updates.subscription_tier = tier;
        updates.subscription_fortunes = SUB_FORTUNES[tier];
        updates.billing_status = 'active';
        updates.billing_grace_until = null;
        console.log(`[stripe-webhook] Granting ${tier} subscription + ${SUB_FORTUNES[tier]} subscription fortunes to ${supabaseUserId}`);
      }
    }

    const _fortunePriceIds = [process.env.STRIPE_PRICE_ID_FORTUNE_PACK, process.env.STRIPE_PRICE_ID_FORTUNE_60, process.env.STRIPE_PRICE_ID_FORTUNE_120, process.env.STRIPE_PRICE_ID_FORTUNE_240, process.env.STRIPE_PRICE_ID_OFFERING].filter(Boolean);
    if (priceId && _fortunePriceIds.includes(priceId)) {
      const fortunesGranted = parseInt(session.metadata?.fortunes_granted, 10) || 10;
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('purchased_fortunes')
        .eq('id', supabaseUserId)
        .single();
      updates.purchased_fortunes = (currentProfile?.purchased_fortunes || 0) + fortunesGranted;
      updates.free_story_consumed = false;
      console.log(`[stripe-webhook] Granting Fortune pack (${fortunesGranted} fortunes) + tease reset to ${supabaseUserId}`);
    }

    if (!updates.has_storypass && !updates.is_subscriber && !updates.purchased_fortunes && !updates.subscription_fortunes) {
      console.warn(`[stripe-webhook] No entitlement matched for priceId: ${priceId}`);
    }

    // ── Mark purchase intent as completed ──
    const purchaseIntentId = session.metadata?.purchase_intent_id;
    if (purchaseIntentId) {
      const { error: intentErr } = await supabase
        .from('purchase_intents')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', purchaseIntentId)
        .eq('status', 'pending');
      if (intentErr) {
        console.warn(`[stripe-webhook] Failed to mark purchase intent ${purchaseIntentId} as completed:`, intentErr.message);
      } else {
        console.log(`[stripe-webhook] Purchase intent ${purchaseIntentId} marked completed`);
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', supabaseUserId);

      if (updateErr) {
        console.error('[stripe-webhook] Supabase update failed:', updateErr);
      } else {
        console.log(`[stripe-webhook] Profile updated for ${supabaseUserId}:`, updates);
      }
    }
  }

  // ── invoice.paid — subscription renewal (or retry success after payment_failed) ──
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    const userId = await resolveProfileBySubscription(supabase, subscriptionId, customerId);
    detectedUserId = userId || null;
    if (userId) {
      // Resolve tier from Stripe subscription to set correct fortune amount
      let renewalTier = null;
      const SUB_FORTUNES_RENEWAL = { storied: 100, favored: 200, chosen: 400 };
      if (subscriptionId) {
        try {
          const sub = await stripeClient.subscriptions.retrieve(subscriptionId);
          const subPriceId = sub.items?.data?.[0]?.price?.id;
          if (subPriceId === process.env.STRIPE_PRICE_ID_STORIED) renewalTier = 'storied';
          else if (subPriceId === process.env.STRIPE_PRICE_ID_FAVORED) renewalTier = 'favored';
        } catch (e) {
          console.warn('[stripe-webhook] invoice.paid — failed to resolve tier from subscription:', e.message);
        }
      }
      // Fallback: read tier from profile if Stripe lookup failed
      if (!renewalTier) {
        const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', userId).single();
        renewalTier = profile?.subscription_tier || 'storied';
      }
      const renewalFortunes = SUB_FORTUNES_RENEWAL[renewalTier] || 100;

      const { error } = await supabase
        .from('profiles')
        .update({ is_subscriber: true, subscription_tier: renewalTier, subscription_fortunes: renewalFortunes, billing_status: 'active', billing_grace_until: null })
        .eq('id', userId);
      if (error) {
        console.error('[stripe-webhook] invoice.paid update failed:', error);
      } else {
        console.log(`[stripe-webhook] invoice.paid — restored ${renewalTier} subscription + ${renewalFortunes} fortunes for ${userId}`);
      }
    } else {
      console.warn(`[stripe-webhook] invoice.paid — no profile found for subscription: ${subscriptionId}, customer: ${customerId}`);
    }
  }

  // ── invoice.payment_failed — payment failure → start grace period ──
  // GRACE MODEL: Server-authoritative. Webhook is the ONLY place grace starts.
  // Clients read billing_status + billing_grace_until but never create grace.
  // Fortunes preserved during grace. Zeroed only on customer.subscription.deleted.
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
          billing_grace_until: graceUntil
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
  // Handles: Stripe dashboard edits, billing portal tier changes, proration events.
  // Syncs subscription_tier and subscription_fortunes to match current Stripe state.
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;
    const customerId = subscription.customer;
    const status = subscription.status; // 'active', 'past_due', 'canceled', 'unpaid', etc.

    const userId = await resolveProfileBySubscription(supabase, subscriptionId, customerId);
    detectedUserId = userId || null;
    if (userId) {
      const SUB_FORTUNES_UPDATE = { storied: 100, favored: 200, chosen: 400 };
      const subPriceId = subscription.items?.data?.[0]?.price?.id;
      let updatedTier = null;
      if (subPriceId === process.env.STRIPE_PRICE_ID_STORIED) updatedTier = 'storied';
      else if (subPriceId === process.env.STRIPE_PRICE_ID_FAVORED) updatedTier = 'favored';

      const updates = {};
      if (status === 'active' || status === 'trialing') {
        // NOTE: Do NOT set is_subscriber=true here. Only invoice.paid restores is_subscriber.
        // subscription.updated with status=active can fire during retry sequences before
        // payment actually succeeds, which would prematurely end the grace period.
        // This handler ONLY syncs tier/fortunes for plan changes (upgrades/downgrades).
        if (updatedTier) {
          updates.subscription_tier = updatedTier;
          updates.subscription_fortunes = SUB_FORTUNES_UPDATE[updatedTier] || 100;
        }
      } else if (status === 'past_due' || status === 'unpaid') {
        // Keep tier info but revoke active flag — grace model handles the rest
        updates.is_subscriber = false;
      } else if (status === 'canceled' || status === 'incomplete_expired') {
        updates.is_subscriber = false;
        updates.subscription_tier = null;
        updates.subscription_fortunes = 0;
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
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;
    const customerId = subscription.customer;

    const userId = await resolveProfileBySubscription(supabase, subscriptionId, customerId);
    detectedUserId = userId || null;
    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_subscriber: false, subscription_tier: null, subscription_fortunes: 0, billing_status: 'canceled', billing_grace_until: null })
        .eq('id', userId);
      if (error) {
        console.error('[stripe-webhook] customer.subscription.deleted update failed:', error);
      } else {
        console.log(`[stripe-webhook] customer.subscription.deleted — revoked subscription for ${userId}`);
      }
    } else {
      console.warn(`[stripe-webhook] customer.subscription.deleted — no profile found for subscription: ${subscriptionId}, customer: ${customerId}`);
    }
  }

  // ── charge.refunded — revoke entitlements for refunded charges ──
  // Resolves what was purchased via Stripe API → metadata.price_id → targeted revocation.
  // Falls back to full revocation if resolution fails.
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const customerId = charge.customer;

    if (customerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, purchased_fortunes')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        detectedUserId = profile.id;
        // Try to resolve what was purchased via checkout session metadata
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

        // Targeted revocation based on price_id
        const updates = {};
        if (priceId === process.env.STRIPE_PRICE_ID_STORYPASS) {
          updates.has_storypass = false;
          // Storypass fortunes are story-scoped (on storypass_entitlements), not global.
          // Zero out any entitlements for this user.
          await supabase
            .from('storypass_entitlements')
            .update({ storypass_fortunes_remaining: 0 })
            .eq('user_id', profile.id);
          console.log(`[stripe-webhook] Zeroed storypass entitlement fortunes for ${profile.id}`);
        } else if (priceId === process.env.STRIPE_PRICE_ID_STORIED || priceId === process.env.STRIPE_PRICE_ID_FAVORED) {
          updates.is_subscriber = false;
          updates.subscription_tier = null;
          updates.subscription_fortunes = 0;
        } else if (fortunesGranted > 0) {
          // Fortune pack refund — deduct granted fortunes, prevent negative
          updates.purchased_fortunes = Math.max(0, (profile.purchased_fortunes || 0) - fortunesGranted);
        } else {
          // Unknown product or lookup failed — full revocation (safe over-revoke)
          updates.has_storypass = false;
          updates.is_subscriber = false;
          updates.subscription_tier = null;
          updates.subscription_fortunes = 0;
          updates.purchased_fortunes = 0;
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

  // ── charge.dispute.created — revoke entitlements on chargeback ──
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object;
    const chargeId = dispute.charge;

    // Resolve customer from the disputed charge
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
            has_storypass: false,
            is_subscriber: false,
            subscription_tier: null,
            subscription_fortunes: 0,
            purchased_fortunes: 0,
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
    if (checkoutStoryId) eventUpdates.story_id = checkoutStoryId;

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

  // ── Debug log for checkout completions ──
  if (checkoutSessionId || stripeCustomerIdForEvent) {
    console.log(`[stripe-webhook] Checkout completed — event: ${event.id}, customer: ${stripeCustomerIdForEvent || 'unknown'}, checkout_session: ${checkoutSessionId || 'unknown'}, story: ${checkoutStoryId || 'none'}`);
  }

  // ── Mark event as processed (or leave false on failure for Stripe retry) ──
  if (!processingError) {
    const { error: markErr } = await supabase
      .from('stripe_events')
      .update({ processed: true })
      .eq('id', event.id);
    if (markErr) {
      console.warn(`[stripe-webhook] Failed to mark event ${event.id} as processed:`, markErr.message);
    } else {
      console.log(`[stripe-webhook] Processed: ${event.id} ${event.type} user=${detectedUserId || 'unknown'}`);
    }
  }

  // Processing failure → 500 so Stripe retries. Guard allows retry (processed=false).
  // Processing success → 200.
  if (processingError) {
    return res.status(500).json({ error: 'webhook_processing_failed' });
  }

  res.status(200).json({ received: true });
}
