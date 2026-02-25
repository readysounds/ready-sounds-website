# Ready Sounds - Secure Download Setup Guide

## Step 1: Add the Download Function

1. Copy `download.js` to your project: `netlify/functions/download.js`
2. Update your `package.json` to include these dependencies (or merge with existing):

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.450.0",
    "@aws-sdk/s3-request-presigner": "^3.450.0",
    "@supabase/supabase-js": "^2.38.0",
    "stripe": "^14.0.0"
  }
}
```

## Step 2: Add Environment Variables to Netlify

Go to your Netlify dashboard → Site settings → Environment variables

Add these new variables:

### Cloudflare R2 Credentials:
```
R2_ENDPOINT=YOUR_R2_ENDPOINT
R2_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=YOUR_R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME=YOUR_R2_BUCKET_NAME
```

### Supabase Credentials (if not already added):
```
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Step 3: Update Frontend Download Code

Replace the `downloadFile` function in your `index.html` (around line 5359):

### OLD CODE (remove this):
```javascript
async function downloadFile(url, filename) {
    try {
        console.log('Downloading:', filename);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Download failed');
        }
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        console.log('Download completed:', filename);
    } catch (error) {
        console.error('Download error:', error);
        alert('Download failed. Please try again.');
    }
}
```

### NEW CODE (replace with this):
```javascript
async function downloadFile(url, filename) {
    try {
        console.log('Requesting download for:', filename);
        
        // Get user's auth token
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            alert('Please log in to download files.');
            return;
        }
        
        // Convert the R2 public URL to a file path
        // Example: https://pub-xxx.r2.dev/downloads/primum-electronic/track.wav
        // Extract: downloads/primum-electronic/track.wav
        const urlObj = new URL(url);
        const filePath = urlObj.pathname.substring(1); // Remove leading slash
        
        console.log('Requesting secure download URL for:', filePath);
        
        // Call our Netlify function to get a signed URL
        const response = await fetch('/.netlify/functions/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ filePath })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Download failed');
        }
        
        const { downloadUrl } = await response.json();
        
        // Now download the file using the signed URL
        const fileResponse = await fetch(downloadUrl);
        if (!fileResponse.ok) {
            throw new Error('Failed to download file');
        }
        
        const blob = await fileResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        
        console.log('Download completed:', filename);
    } catch (error) {
        console.error('Download error:', error);
        alert('Download failed. Please try again.');
    }
}
```

## Step 4: Deploy

1. Commit and push all changes to your Git repository
2. Netlify will automatically redeploy
3. Test the download functionality with a logged-in subscriber

## Testing Checklist

- [ ] User must be logged in to download
- [ ] User must have active subscription
- [ ] Downloads work for MP3 files
- [ ] Downloads work for WAV files
- [ ] Downloads work for stems (ZIP)
- [ ] Non-subscribers see error message
- [ ] Logged-out users are prompted to log in

## Troubleshooting

### "Unauthorized" error:
- Check that SUPABASE_URL and SUPABASE_ANON_KEY are set in Netlify

### "No active subscription" error:
- Verify the user has a record in the `subscriptions` table in Supabase
- Check that subscription status is 'active'

### "Failed to generate download URL" error:
- Check R2 credentials are correct in Netlify environment variables
- Verify the file path exists in your R2 bucket

### Downloads still failing:
- Check Netlify function logs for detailed error messages
- Verify the function deployed successfully (check Netlify deploy log)
