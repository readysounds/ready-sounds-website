const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
    };
  }

  console.log('Stripe event received:', stripeEvent.type);

  // Handle different event types
  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(stripeEvent.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(stripeEvent.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(stripeEvent.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(stripeEvent.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completed:', session.id);

  const customerId = session.customer;
  const customerEmail = session.customer_details?.email || session.customer_email;
  const subscriptionId = session.subscription;

  if (!customerEmail) {
    console.error('No customer email found in session');
    return;
  }

  // Update user profile with Stripe customer ID and subscription ID
  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('email', customerEmail);

  if (error) {
    console.error('Error updating profile after checkout:', error);
    throw error;
  }

  console.log(`Profile updated for ${customerEmail}`);
}

// Handle subscription created
async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);

  const customerId = subscription.customer;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // Get customer email from Stripe
  const customer = await stripe.customers.retrieve(customerId);
  const customerEmail = customer.email;

  if (!customerEmail) {
    console.error('No customer email found');
    return;
  }

  // Determine plan type from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let planType = 'individual_monthly'; // default

  if (priceId === process.env.STRIPE_PRICE_BUSINESS_YEARLY) {
    planType = 'business_yearly';
  }

  // Update user profile
  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
      subscription_plan: planType,
      subscription_current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString()
    })
    .eq('email', customerEmail);

  if (error) {
    console.error('Error updating profile on subscription created:', error);
    throw error;
  }

  console.log(`Subscription created for ${customerEmail}: ${planType}`);
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);

  const subscriptionId = subscription.id;
  const status = subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  // If subscription is set to cancel at period end, update status
  const subscriptionStatus = cancelAtPeriodEnd ? 'cancelled' : status;

  // Update profile by subscription ID
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: subscriptionStatus,
      subscription_current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating profile on subscription updated:', error);
    throw error;
  }

  console.log(`Subscription updated: ${subscriptionId} - Status: ${subscriptionStatus}`);
}

// Handle subscription deleted/cancelled
async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);

  const subscriptionId = subscription.id;

  // Update profile to reflect cancelled subscription
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'expired',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating profile on subscription deleted:', error);
    throw error;
  }

  console.log(`Subscription deleted: ${subscriptionId}`);
}

// Handle successful invoice payment
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', invoice.id);

  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    // One-time payment, not a subscription
    return;
  }

  // Ensure subscription is marked as active after successful payment
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating profile after payment succeeded:', error);
    throw error;
  }

  console.log(`Payment succeeded for subscription: ${subscriptionId}`);
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(invoice) {
  console.log('Invoice payment failed:', invoice.id);

  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    return;
  }

  // Mark subscription as past_due
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating profile after payment failed:', error);
    throw error;
  }

  console.log(`Payment failed for subscription: ${subscriptionId}`);
}
