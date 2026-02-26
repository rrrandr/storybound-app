/**
 * Badge Engine — minimal, idempotent badge progression for Storybound.
 * Accepts Supabase client as first parameter from caller.
 * Never downgrades earned. Never deletes. Never resets progress.
 */
(function () {
  'use strict';

  /**
   * Increment badge progress by amount. If badge threshold is met server-side,
   * earned flag is set by DB trigger — this function only bumps progress.
   * Idempotent: skips if already earned.
   */
  async function incrementBadge(supabase, profileId, badgeId, amount) {
    if (!supabase || !profileId || !badgeId) return;
    if (typeof amount !== 'number') amount = 1;
    try {
      const { data: existing } = await supabase
        .from('user_badges')
        .select('progress, earned')
        .eq('profile_id', profileId)
        .eq('badge_id', badgeId)
        .maybeSingle();

      if (existing && existing.earned) return;

      const newProgress = ((existing && existing.progress) || 0) + amount;

      await supabase
        .from('user_badges')
        .upsert({
          profile_id: profileId,
          badge_id: badgeId,
          progress: newProgress
        }, { onConflict: 'profile_id,badge_id' });
    } catch (_) { /* silent */ }
  }

  /**
   * Award a badge immediately (progress irrelevant).
   * Idempotent: no-op if already earned.
   */
  async function awardBadge(supabase, profileId, badgeId) {
    if (!supabase || !profileId || !badgeId) return;
    try {
      const { data: existing } = await supabase
        .from('user_badges')
        .select('earned')
        .eq('profile_id', profileId)
        .eq('badge_id', badgeId)
        .maybeSingle();

      if (existing && existing.earned) return;

      await supabase
        .from('user_badges')
        .upsert({
          profile_id: profileId,
          badge_id: badgeId,
          earned: true,
          earned_at: new Date().toISOString()
        }, { onConflict: 'profile_id,badge_id' });
    } catch (_) { /* silent */ }
  }

  window.incrementBadge = incrementBadge;
  window.awardBadge = awardBadge;
})();
