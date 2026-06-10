import { createClient } from '@supabase/supabase-js';

// ────────────────────────────────────────────────────────────────────
// SECURITY: short-field hygiene for stored story fields.
//
// SCOPE intentionally LIMITED to: length cap + invisible-character strip.
//
// We do NOT run prompt-injection regex on persisted titles / author names
// because they are legitimate user content, displayed verbatim to other
// users, and a title like "Ignore Previous Instructions" or "Human: A
// Memoir" must round-trip unmangled. Prompt-injection sanitation belongs
// on prompt-bound fields at the point they enter an LLM prompt, not on
// the storage layer. Cross-user XSS is handled by escapeHTML on render
// (verified in app.js + admin/bug-reports.html).
// ────────────────────────────────────────────────────────────────────
function sanitizeStoryShortField(value, maxLen) {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') return null; // refuse non-strings rather than coerce
  let t = value
    // C0 controls except \t (0x09) and \n (0x0A), plus DEL (0x7F)
    .replace(/[ --]/g, '')
    // Zero-width / RTL-override / BOM / interlinear unicode (prompt-padding,
    // invisible-character bidi attacks)
    .replace(/[​-‏ - ⁠-⁯﻿￹-￻]/g, '')
    .trim();
  if (!t) return null;
  if (t.length > maxLen) t = t.slice(0, maxLen);
  return t;
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  // Create Supabase client with user JWT so RLS applies
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  // Resolve authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const body = req.body || {};

  // SECURITY (cap + invisible-char strip only — see sanitizeStoryShortField above).
  // Computed once, used by both PUT and POST below.
  const safeTitle = sanitizeStoryShortField(body.title, 200);
  const safeAuthorName = sanitizeStoryShortField(body.author_name, 100);

  // ============================================================
  // UPDATE STORY
  // ============================================================
  if (req.method === 'PUT') {
    if (!body.id) {
      return res.status(400).json({ error: 'Story ID required' });
    }

    const { data, error } = await supabase
      .from('stories')
      .update({
        updated_at: new Date().toISOString(),
        title: safeTitle,
        cover_url: body.cover_url,
        content_json: body.content_json,
        scene_count: body.scene_count,
        status: body.status,
        eroticism_level: body.eroticism_level,
        visibility: body.visibility,
        library_opt_in: body.library_opt_in,
        author_opt_in: body.author_opt_in,
        author_name: safeAuthorName
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ story: data });
  }

  // ============================================================
  // CREATE STORY
  // ============================================================
  if (req.method === 'POST') {
    const { data, error } = await supabase
      .from('stories')
      .insert({
        author_user_id: user.id,
        title: safeTitle || 'Untitled',
        cover_url: body.cover_url || null,
        content_json: body.content_json || {},
        scene_count: body.scene_count || 0,
        status: body.status || 'in_progress',
        eroticism_level: body.eroticism_level || 'naughty',
        visibility: body.visibility || 'private',
        library_opt_in: body.library_opt_in !== false,
        author_opt_in: body.author_opt_in || false,
        author_name: safeAuthorName || null
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ story: data });
  }
}
