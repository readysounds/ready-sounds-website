// Netlify Function for creating Stripe Checkout sessions
// File: netlify/functions/create-checkout-session.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  // Server-side price table — never trust client-supplied prices
  const LICENSE_PRICES = {
    individual: 1000, // $10.00 in cents
    business: 12500   // $125.00 in cents
  };

  // Valid subscription plan combinations
  const SUBSCRIPTION_PRICE_IDS = {
    individual_monthly: process.env.STRIPE_INDIVIDUAL_MONTHLY_PRICE_ID,
    individual_annual:  process.env.STRIPE_INDIVIDUAL_ANNUAL_PRICE_ID,
    business_annual:    process.env.STRIPE_BUSINESS_PRICE_ID
  };

  try {
    const { items, mode, planType, billingPeriod } = JSON.parse(event.body);

    let sessionConfig = {
      payment_method_types: ['card'],
      success_url: `${process.env.URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/browse.html`,
      metadata: {}
    };

    if (mode === 'subscription') {
      // Validate planType and billingPeriod
      const period = billingPeriod === 'monthly' ? 'monthly' : 'annual';
      const key = `${planType}_${period}`;
      const priceId = SUBSCRIPTION_PRICE_IDS[key];

      if (!priceId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid plan selection' })
        };
      }

      sessionConfig.mode = 'subscription';
      sessionConfig.line_items = [{ price: priceId, quantity: 1 }];
      sessionConfig.metadata.planType = planType;
      sessionConfig.metadata.billingPeriod = period;

    } else {
      // One-time payment for à la carte tracks
      if (!Array.isArray(items) || items.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No items provided' })
        };
      }

      sessionConfig.mode = 'payment';
      sessionConfig.line_items = items.map(item => {
        const unitAmount = LICENSE_PRICES[item.license];
        if (!unitAmount) throw new Error(`Invalid license type: ${item.license}`);
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.trackTitle,
              description: `${item.license === 'individual' ? 'Individual' : 'Business'} License`,
              metadata: {
                trackId: item.trackId.toString(),
                license: item.license
              }
            },
            unit_amount: unitAmount
          },
          quantity: 1
        };
      });

      // Store track IDs in metadata for fulfillment
      sessionConfig.metadata.trackIds = items.map(i => i.trackId).join(',');
      sessionConfig.metadata.licenses = items.map(i => i.license).join(',');
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id: session.id, url: session.url })
    };

  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
