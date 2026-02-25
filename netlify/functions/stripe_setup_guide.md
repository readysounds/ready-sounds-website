# Stripe Setup Guide for Ready Sounds Monthly/Annual Billing

## Step 1: Create Stripe Products & Prices

### In your Stripe Dashboard (https://dashboard.stripe.com):

#### 1. Individual Monthly Plan ($4.99/month)
1. Go to **Products** → **Add Product**
2. Name: `Ready Sounds - Individual Monthly`
3. Description: `Individual creator subscription - monthly billing`
4. Pricing:
   - Model: **Recurring**
   - Price: `$4.99`
   - Billing period: **Monthly**
5. Click **Save product**
6. **Copy the Price ID** (starts with `price_...`)

#### 2. Individual Annual Plan ($25/year)
1. Go to **Products** → **Add Product**
2. Name: `Ready Sounds - Individual Annual`
3. Description: `Individual creator subscription - annual billing`
4. Pricing:
   - Model: **Recurring**
   - Price: `$25`
   - Billing period: **Yearly**
5. Click **Save product**
6. **Copy the Price ID** (starts with `price_...`)

#### 3. Business Annual Plan ($1,299/year) - If not already created
1. Go to **Products** → **Add Product**
2. Name: `Ready Sounds - Business Annual`
3. Description: `Business subscription - annual billing`
4. Pricing:
   - Model: **Recurring**
   - Price: `$1,299`
   - Billing period: **Yearly**
5. Click **Save product**
6. **Copy the Price ID** (starts with `price_...`)

---

## Step 2: Update Netlify Environment Variables

### In your Netlify Dashboard:

1. Go to **Site settings** → **Environment variables**
2. Add/Update these variables:

```
STRIPE_INDIVIDUAL_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_INDIVIDUAL_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_BUSINESS_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx (or sk_live_ for production)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Replace the old variable:
- **Remove**: `STRIPE_INDIVIDUAL_PRICE_ID` (if it exists)
- **Add**: `STRIPE_INDIVIDUAL_MONTHLY_PRICE_ID` and `STRIPE_INDIVIDUAL_ANNUAL_PRICE_ID`

---

## Step 3: Deploy Updated Files

1. Replace your current files with the updated versions:
   - `pricing.html` (with toggle functionality)
   - `netlify/functions/create-checkout-session.js` (with billing period support)

2. Push to your Git repository or drag/drop to Netlify

3. Netlify will automatically redeploy

---

## Step 4: Test the Integration

### Test Mode (using test Price IDs):
1. Visit https://readysounds.com/pricing
2. Toggle between Monthly and Annual
3. Click "Subscribe Now" on Individual plan
4. Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any 5-digit ZIP

### Verify:
- Monthly shows $4.99/month
- Annual shows $25/year with "Save $35/year" badge
- Checkout redirects to correct Stripe plan
- Success page loads after payment

---

## Step 5: Switch to Live Mode (when ready)

1. In Stripe Dashboard, toggle to **Live mode**
2. Create the same 3 products with live pricing
3. Copy the **live Price IDs** (they start with `price_...` but different from test)
4. Update Netlify environment variables with:
   - Live Price IDs
   - Live Secret Key (`sk_live_...`)
   - Live Webhook Secret (`whsec_...`)

---

## Current Pricing Structure:

| Plan | Monthly | Annual | Savings |
|------|---------|--------|---------|
| **Individual** | $4.99/mo ($59.88/yr) | $25/yr | $34.88/yr (58%) |
| **Business** | N/A | $1,299/yr | N/A |

---

## Notes:

- The toggle defaults to **Annual** (better value for customers)
- The "Save $35/year" badge only shows when Annual is selected
- Business plan remains annual-only (you can add monthly later if needed)
- The `billingPeriod` parameter is passed to your backend for proper routing
