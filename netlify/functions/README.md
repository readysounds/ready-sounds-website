# Stripe Webhook Setup for Ready Sounds

## What This Does
The `stripe-webhook.js` function handles Stripe events and automatically updates user subscriptions in Supabase.

## Events Handled
- ✅ `checkout.session.completed` - When a user completes checkout
- ✅ `customer.subscription.created` - When a new subscription is created
- ✅ `customer.subscription.updated` - When a subscription changes (upgrade/downgrade/cancel)
- ✅ `customer.subscription.deleted` - When a subscription is cancelled completely
- ✅ `invoice.payment_succeeded` - When a recurring payment succeeds
- ✅ `invoice.payment_failed` - When a payment fails

## Setup Instructions

### 1. Install Dependencies
```bash
cd netlify/functions
npm install
```

### 2. Set Environment Variables in Netlify
Go to your Netlify dashboard → Site settings → Environment variables

Add these:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://pfqvrxfazumlydjepwib.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_PRICE_INDIVIDUAL_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...
```

### 3. Deploy to Netlify
```bash
# The function will be available at:
https://readysounds.com/.netlify/functions/stripe-webhook
```

### 4. Configure Stripe Webhook
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://readysounds.com/.netlify/functions/stripe-webhook`
4. Select events to listen to:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Copy the webhook signing secret and add it to Netlify as `STRIPE_WEBHOOK_SECRET`

## What Happens When a User Subscribes

1. User completes checkout on Stripe
2. Stripe sends `checkout.session.completed` event to webhook
3. Webhook updates Supabase `profiles` table:
   - Sets `stripe_customer_id`
   - Sets `stripe_subscription_id`
   - Sets `subscription_status` to 'active'
   - Sets `subscription_plan` (individual_monthly or business_yearly)
4. User can now download tracks!

## Testing

### Test in Development
```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local function
stripe listen --forward-to http://localhost:8888/.netlify/functions/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

### Check Logs
In Netlify dashboard → Functions → stripe-webhook → Recent invocations

## Subscription Statuses

- `active` - User has access to downloads
- `cancelled` - User cancelled but still has access until period end
- `expired` - Subscription ended, no access
- `past_due` - Payment failed, temporarily suspended

## Database Schema Required

Make sure your `profiles` table in Supabase has these columns:
```sql
stripe_customer_id TEXT
stripe_subscription_id TEXT
subscription_status TEXT
subscription_plan TEXT
subscription_current_period_end TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## Troubleshooting

**Webhook not receiving events:**
- Check Stripe webhook signing secret is correct
- Verify webhook URL is correct
- Check Netlify function logs for errors

**Profile not updating:**
- Check SUPABASE_SERVICE_ROLE_KEY is set (not anon key)
- Verify email matches between Stripe and Supabase
- Check Supabase logs for permission errors

**Payments succeed but nothing happens:**
- This was the original issue - now fixed!
- Webhook properly records subscription to Supabase
- Download access is automatically granted
