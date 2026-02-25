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

  try {
    const { items, mode, planType, billingPeriod } = JSON.parse(event.body);
    
    let sessionConfig = {
      payment_method_types: ['card'],
      success_url: `${process.env.URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/`,
      metadata: {}
    };

    if (mode === 'subscription') {
      // Subscription checkout (Individual or Business plan)
      let priceId;
      
      if (planType === 'individual') {
        // Individual plan - support both monthly and annual
        priceId = billingPeriod === 'monthly' 
          ? process.env.STRIPE_INDIVIDUAL_MONTHLY_PRICE_ID 
          : process.env.STRIPE_INDIVIDUAL_ANNUAL_PRICE_ID;
      } else {
        // Business plan - annual only
        priceId = process.env.STRIPE_BUSINESS_PRICE_ID;
      }
      
      sessionConfig.mode = 'subscription';
      sessionConfig.line_items = [{
        price: priceId,
        quantity: 1
      }];
      sessionConfig.metadata.planType = planType;
      sessionConfig.metadata.billingPeriod = billingPeriod || 'annual';
      
    } else {
      // One-time payment for à la carte tracks
      sessionConfig.mode = 'payment';
      sessionConfig.line_items = items.map(item => ({
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
          unit_amount: item.price * 100 // Convert to cents
        },
        quantity: 1
      }));
      
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
