const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { email, password, fullName, cfToken } = JSON.parse(event.body || '{}');

  if (!email || !password || !cfToken) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  // Verify Turnstile token with Cloudflare
  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: cfToken,
    }),
  });
  const verifyData = await verifyRes.json();

  if (!verifyData.success) {
    console.log('Turnstile verification failed:', verifyData['error-codes']);
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bot verification failed. Please try again.' }) };
  }

  // Create user via Supabase admin (bypasses RLS). Note: admin.createUser does NOT
  // send a confirmation email by itself, so we explicitly create the user as
  // unconfirmed and then trigger the confirmation email via auth.resend below.
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: fullName || '' },
    email_confirm: false,
  });

  if (error) {
    console.log('Supabase createUser error:', error.message);
    return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
  }

  // Send the verification email using the public client (admin API does not send it).
  const supabaseAnon = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const { error: resendError } = await supabaseAnon.auth.resend({
    type: 'signup',
    email,
  });

  if (resendError) {
    console.log('Supabase resend confirmation error:', resendError.message);
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
};
