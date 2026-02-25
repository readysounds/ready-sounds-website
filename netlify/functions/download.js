// Netlify Function for secure downloads from Cloudflare R2
// File: netlify/functions/download.js

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get the authorization token from headers
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - No token provided' })
      };
    }

    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Verify the user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - Invalid token' })
      };
    }

    console.log('Authenticated user:', user.email);

    // Check if user has an active subscription (stored in profiles table)
    const { data: profile, error: subError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .eq('subscription_status', 'active')
      .single();

    if (subError || !profile) {
      console.log('Subscription check failed:', subError);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'No active subscription found' })
      };
    }

    console.log('User has active subscription:', profile.subscription_plan);

    // Parse the request body
    const { filePath } = JSON.parse(event.body);
    
    if (!filePath) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing filePath parameter' })
      };
    }

    console.log('Generating download URL for:', filePath);

    // Initialize R2 S3 client
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    // Generate a pre-signed URL (valid for 5 minutes)
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filePath,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    console.log('Generated signed URL successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        downloadUrl: signedUrl,
        expiresIn: 300 // 5 minutes
      })
    };

  } catch (error) {
    console.error('Download function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate download URL',
        message: error.message 
      })
    };
  }
};
