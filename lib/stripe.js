import Stripe from 'stripe';

// ── Safety Guard ──
// Prevent live Stripe keys from running outside production.
const key = process.env.STRIPE_SECRET_KEY || '';
const baseUrl = process.env.APP_BASE_URL || '';

if (key.startsWith('sk_live_') && baseUrl !== 'https://storybound.love') {
  throw new Error(
    `[STRIPE SAFETY] Live key detected with non-production APP_BASE_URL: "${baseUrl}". ` +
    'Refusing to initialize. Set APP_BASE_URL=https://storybound.love for production, ' +
    'or use a test key (sk_test_) for dev/preview.'
  );
}

// ── Shared Stripe Instance ──
// All server-side Stripe calls should import this instead of creating new instances.
export const stripe = new Stripe(key, {
  apiVersion: '2024-06-20',
});

// Re-export for convenience
export default stripe;
