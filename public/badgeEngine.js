/**
 * Badge Engine — minimal, idempotent badge progression for Storybound.
 * Accepts Supabase client as first parameter from caller.
 * Never downgrades earned. Never deletes. Never resets progress.
 */
(function () {
  'use strict';

  /**
   * Show trophy earned notification — gold toast with trophy name + sparkle.
   * Diegetic, not system-UI: feels like Fate acknowledging the player.
   */
  function _showTrophyNotification(badgeId) {
    var meta = window.TROPHY_META || {};
    var info = meta[badgeId];
    var title = info ? info.title : badgeId.replace(/_/g, ' ');
    var desc = info ? info.desc : '';

    // Create floating notification
    var notif = document.createElement('div');
    notif.className = 'trophy-notification';
    notif.innerHTML =
      '<div class="trophy-notif-icon">\u2728</div>' +
      '<div class="trophy-notif-text">' +
        '<div class="trophy-notif-title">' + title + '</div>' +
        (desc ? '<div class="trophy-notif-desc">' + desc + '</div>' : '') +
      '</div>';

    document.body.appendChild(notif);

    // Animate in
    requestAnimationFrame(function() {
      notif.classList.add('trophy-notif-visible');
    });

    // Auto-dismiss after 4 seconds
    setTimeout(function() {
      notif.classList.remove('trophy-notif-visible');
      notif.classList.add('trophy-notif-out');
      setTimeout(function() { notif.remove(); }, 600);
    }, 4000);

    // Click to dismiss early
    notif.addEventListener('click', function() {
      notif.classList.remove('trophy-notif-visible');
      notif.classList.add('trophy-notif-out');
      setTimeout(function() { notif.remove(); }, 600);
    });

    console.log('[TROPHY] Earned:', badgeId, '—', title);
  }

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

      const { data: result, error: upErr } = await supabase
        .from('user_badges')
        .upsert({
          profile_id: profileId,
          badge_id: badgeId,
          progress: newProgress
        }, { onConflict: 'profile_id,badge_id' })
        .select('earned')
        .maybeSingle();

      // Surface the real Postgres cause (2026-06-09): supabase-js returns the
      // error in-band (no throw), so the old silent catch hid the 409's code.
      // 23503 = FK (badge_id not seeded in the badges table / bad profile_id);
      // 23505 = unique violation (missing UNIQUE(profile_id,badge_id) to merge on).
      if (upErr) {
        console.warn('[BADGE] increment upsert failed for "' + badgeId + '" — ' + (upErr.code || '?') + ' ' + (upErr.message || '') + (upErr.details ? ' | ' + upErr.details : ''));
        return;
      }

      // Check if the DB trigger set earned=true (threshold met)
      if (result && result.earned) {
        _showTrophyNotification(badgeId);
      }
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

      const { error: awErr } = await supabase
        .from('user_badges')
        .upsert({
          profile_id: profileId,
          badge_id: badgeId,
          earned: true,
          earned_at: new Date().toISOString()
        }, { onConflict: 'profile_id,badge_id' });

      if (awErr) {
        console.warn('[BADGE] award upsert failed for "' + badgeId + '" — ' + (awErr.code || '?') + ' ' + (awErr.message || '') + (awErr.details ? ' | ' + awErr.details : ''));
        return;
      }

      // Newly earned — show notification
      _showTrophyNotification(badgeId);
    } catch (_) { /* silent */ }
  }

  window.incrementBadge = incrementBadge;
  window.awardBadge = awardBadge;
})();
