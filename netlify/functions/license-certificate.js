// Netlify Function: Generate a printable license certificate for a download
// GET /.netlify/functions/license-certificate?id=<downloadId>
// Requires: Authorization: Bearer <token>

const { createClient } = require('@supabase/supabase-js');

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateCertificateHtml(download, userEmail) {
  const date = new Date(download.downloaded_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const planLabels = {
    individual_yearly: 'Individual License',
    individual_monthly: 'Individual License',
    business_yearly: 'Business License',
  };
  const planLabel = planLabels[download.subscription_plan] || 'Royalty-Free License';

  const permittedUses = download.subscription_plan === 'business_yearly'
    ? 'YouTube, social media, podcasts, client projects, commercial advertising, broadcast &amp; streaming, film &amp; TV productions'
    : 'YouTube, social media, podcasts, personal and commercial projects';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>License Certificate — ${escHtml(download.track_title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f5;
      color: #111;
      padding: 48px 24px;
      min-height: 100vh;
    }
    .page-hint {
      text-align: center;
      font-size: 13px;
      color: #888;
      margin-bottom: 24px;
    }
    .page-hint kbd {
      background: #e0e0e0;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .cert {
      max-width: 760px;
      margin: 0 auto;
      background: white;
      border: 2px solid #9c27b0;
      border-radius: 12px;
      padding: 56px;
    }
    .cert-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 32px;
      border-bottom: 1px solid #eee;
    }
    .logo {
      font-size: 26px;
      font-weight: 700;
      color: #9c27b0;
    }
    .cert-type {
      text-align: right;
    }
    .cert-type h1 {
      font-size: 18px;
      font-weight: 600;
      color: #111;
      margin-bottom: 4px;
    }
    .cert-type p {
      font-size: 13px;
      color: #888;
    }
    .track-info {
      margin-bottom: 36px;
    }
    .track-info h2 {
      font-size: 24px;
      font-weight: 700;
      color: #111;
      margin-bottom: 4px;
    }
    .track-info .artist {
      font-size: 15px;
      color: #555;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 36px;
    }
    td {
      padding: 13px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      vertical-align: top;
    }
    td:first-child {
      color: #888;
      width: 180px;
      font-size: 13px;
      padding-right: 16px;
    }
    td:last-child {
      font-weight: 500;
      color: #111;
    }
    .license-id-block {
      background: #faf5ff;
      border: 1px solid #e1bee7;
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 32px;
    }
    .license-id-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9c27b0;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .license-id-value {
      font-family: 'Courier New', monospace;
      font-size: 20px;
      font-weight: 700;
      color: #6a1b9a;
      letter-spacing: 0.04em;
    }
    .footer {
      font-size: 12px;
      color: #aaa;
      line-height: 1.7;
      border-top: 1px solid #eee;
      padding-top: 24px;
    }
    .footer a {
      color: #9c27b0;
      text-decoration: none;
    }
    @media print {
      body { background: white; padding: 0; }
      .page-hint { display: none; }
      .cert { border-radius: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="page-hint">
    Press <kbd>Cmd+P</kbd> (Mac) or <kbd>Ctrl+P</kbd> (Windows) to save as PDF &nbsp;·&nbsp;
    <a href="javascript:window.print()" style="color:#9c27b0; text-decoration:none;">Print / Save PDF</a>
  </div>

  <div class="cert">
    <div class="cert-header">
      <div class="logo">readysounds.</div>
      <div class="cert-type">
        <h1>License Certificate</h1>
        <p>${escHtml(planLabel)}</p>
      </div>
    </div>

    <div class="track-info">
      <h2>${escHtml(download.track_title)}</h2>
      <p class="artist">${escHtml(download.track_artist)}</p>
    </div>

    <table>
      <tr>
        <td>Version / Format</td>
        <td>${escHtml(download.version_title)} &nbsp;·&nbsp; ${escHtml(download.file_format)}</td>
      </tr>
      <tr>
        <td>Licensee</td>
        <td>${escHtml(userEmail)}</td>
      </tr>
      <tr>
        <td>License Type</td>
        <td>${escHtml(planLabel)}</td>
      </tr>
      <tr>
        <td>Permitted Uses</td>
        <td>${permittedUses}</td>
      </tr>
      <tr>
        <td>Revenue Retention</td>
        <td>100% retained by licensee</td>
      </tr>
      <tr>
        <td>AI-Generated</td>
        <td>No — original human composition</td>
      </tr>
      <tr>
        <td>Download Date</td>
        <td>${escHtml(date)}</td>
      </tr>
    </table>

    <div class="license-id-block">
      <div class="license-id-label">License ID</div>
      <div class="license-id-value">${escHtml(download.license_id)}</div>
    </div>

    <div class="footer">
      <p>This certificate confirms that the track listed above was licensed from Ready Sounds under a royalty-free ${escHtml(planLabel.toLowerCase())}. All Ready Sounds tracks are original compositions by human artists and are not AI-generated. This license grants the rights listed above for the duration of your active subscription and any projects created during it.</p>
      <br>
      <p>Questions or disputes? Contact <a href="mailto:hello@readysounds.co">hello@readysounds.co</a> with your License ID.</p>
    </div>
  </div>
</body>
</html>`;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const downloadId = event.queryStringParameters?.id;

    if (!downloadId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id parameter' }) };
    }

    // Use user-authenticated client so RLS ensures they can only see their own records
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const { data: download, error } = await supabase
      .from('downloads')
      .select('*')
      .eq('id', downloadId)
      .eq('user_id', user.id)
      .single();

    if (error || !download) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Download record not found' }) };
    }

    const html = generateCertificateHtml(download, user.email);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
      body: html,
    };

  } catch (error) {
    console.error('License certificate error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
