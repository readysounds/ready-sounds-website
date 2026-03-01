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
    const table = _table === 'alternates' ? 'alternates' : 'tracks';

    // GET — list tracks (with alternates) or alternates for a specific track
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};

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
        .select('id, title, artist, genre, bpm, duration, stream_url, artwork_url, moods, use_cases, similar_artists, energy, best_moments, is_active, sort_order')
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
