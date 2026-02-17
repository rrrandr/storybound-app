import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
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
    console.error('[record-legal] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // Extract real IP from proxy headers
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || null;

  const userAgent = req.headers['user-agent'] || null;

  const supabase = createClient(sbUrl, sbKey);

  const { error } = await supabase
    .from('profiles')
    .update({
      legal_ip: ip,
      legal_user_agent: userAgent
    })
    .eq('id', userId);

  if (error) {
    console.error('[record-legal] Update failed:', error);
    return res.status(500).json({ error: 'update_failed' });
  }

  console.log(`[record-legal] Recorded IP=${ip} for user ${userId}`);
  return res.status(200).json({ success: true });
}
