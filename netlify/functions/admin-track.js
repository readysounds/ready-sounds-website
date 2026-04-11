// Netlify Function for admin track management
// Protected by ADMIN_KEY env var; uses SUPABASE_SERVICE_ROLE_KEY server-side

const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, PATCH, GET, DELETE, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Verify admin key
  const adminKey = event.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const body = JSON.parse(event.body || '{}');
    const { _table = 'tracks', ...rest } = body;
    const table = _table === 'alternates' ? 'alternates' : (_table === 'curated_playlists' ? 'curated_playlists' : 'tracks');

    // GET — list tracks (with alternates), alternates for a specific track, or curated playlists
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};

      if (params.table === 'curated_playlists') {
        const { data, error } = await supabase
          .from('curated_playlists')
          .select('*')
          .order('sort_order');
        if (error) throw error;
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }

      if (params.table === 'users') {
        // Fetch all auth users (includes user_metadata.full_name)
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (authError) throw authError;

        // Fetch all profiles for subscription info
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, subscription_status, subscription_plan');

        const profileMap = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });

        // Fetch all downloads with full detail
        const { data: allDownloads } = await supabase
          .from('downloads')
          .select('user_id, track_title, track_artist, version_title, file_format, downloaded_at')
          .order('downloaded_at', { ascending: false });

        const dlMap = {};
        (allDownloads || []).forEach(d => {
          if (!dlMap[d.user_id]) dlMap[d.user_id] = { count: 0, last: null, downloads: [] };
          dlMap[d.user_id].count++;
          if (!dlMap[d.user_id].last || d.downloaded_at > dlMap[d.user_id].last) {
            dlMap[d.user_id].last = d.downloaded_at;
          }
          dlMap[d.user_id].downloads.push(d);
        });

        const users = (authData.users || []).map(u => {
          const profile = profileMap[u.id] || {};
          const dl = dlMap[u.id] || { count: 0, last: null, downloads: [] };
          return {
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || '',
            created_at: u.created_at,
            subscription_status: profile.subscription_status || null,
            subscription_plan: profile.subscription_plan || null,
            download_count: dl.count,
            last_download: dl.last,
            downloads: dl.downloads,
          };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return { statusCode: 200, headers, body: JSON.stringify(users) };
      }

      if (params.track_id) {
        // Return alternates for a specific track
        const { data, error } = await supabase
          .from('alternates')
          .select('*')
          .eq('track_id', params.track_id)
          .order('sort_order');
        if (error) throw error;
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }

      // Return all tracks
      const { data, error } = await supabase
        .from('tracks')
        .select('id, title, artist, genre, bpm, duration, stream_url, artwork_url, download_album, moods, use_cases, similar_artists, energy, best_moments, is_active, sort_order')
        .order('sort_order');
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // POST — insert track or alternate
    if (event.httpMethod === 'POST') {
      const { data, error } = await supabase
        .from(table)
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // PATCH — update track or alternate (id required)
    if (event.httpMethod === 'PATCH') {
      const { id, ...updates } = rest;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) };
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // DELETE — delete an alternate
    if (event.httpMethod === 'DELETE') {
      const { id } = rest;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) };
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('admin-track error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
