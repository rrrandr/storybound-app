import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
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
        title: body.title,
        cover_url: body.cover_url,
        content_json: body.content_json,
        scene_count: body.scene_count,
        status: body.status,
        eroticism_level: body.eroticism_level,
        visibility: body.visibility,
        library_opt_in: body.library_opt_in,
        author_opt_in: body.author_opt_in,
        author_name: body.author_name
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
        title: body.title || 'Untitled',
        cover_url: body.cover_url || null,
        content_json: body.content_json || {},
        scene_count: body.scene_count || 0,
        status: body.status || 'in_progress',
        eroticism_level: body.eroticism_level || 'naughty',
        visibility: body.visibility || 'private',
        library_opt_in: body.library_opt_in !== false,
        author_opt_in: body.author_opt_in || false,
        author_name: body.author_name || null
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ story: data });
  }
}

