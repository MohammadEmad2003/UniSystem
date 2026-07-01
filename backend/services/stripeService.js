const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create a payment intent for Stripe payment
 * @param {number} amount - Amount in cents
 * @param {string} currency - Currency code (default: usd)
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} Payment intent
 */
const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
};

/**
 * Create a checkout session for Stripe Checkout
 * @param {number} amount - Amount in cents
 * @param {string} currency - Currency code (default: usd)
 * @param {string} successUrl - URL to redirect after successful payment
 * @param {string} cancelUrl - URL to redirect after cancelled payment
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} Checkout session
 */
const createCheckoutSession = async (amount, currency = 'usd', successUrl, cancelUrl, metadata = {}) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: 'Tuition Payment',
              description: 'University tuition fee payment',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || process.env.STRIPE_SUCCESS_URL,
      cancel_url: cancelUrl || process.env.STRIPE_CANCEL_URL,
      metadata,
    });
    return session;
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }
};

/**
 * Confirm a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<object>} Payment intent
 */
const confirmPayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe confirm payment error:', error);
    throw new Error(`Failed to confirm payment: ${error.message}`);
  }
};

/**
 * Handle Stripe webhook events
 * @param {string} signature - Stripe signature header
 * @param {string} payload - Raw webhook payload
 * @returns {Promise<object>} Webhook event
 */
const handleWebhook = async (signature, payload) => {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (error) {
    console.error('Stripe webhook error:', error);
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
};

/**
 * Create a customer for a user
 * @param {string} email - Customer email
 * @param {string} name - Customer name
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} Customer
 */
const createCustomer = async (email, name, metadata = {}) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });
    return customer;
  } catch (error) {
    console.error('Stripe create customer error:', error);
    throw new Error(`Failed to create customer: ${error.message}`);
  }
};

/**
 * Get payment intent details
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<object>} Payment intent
 */
const getPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe get payment intent error:', error);
    throw new Error(`Failed to get payment intent: ${error.message}`);
  }
};

module.exports = {
  createPaymentIntent,
  createCheckoutSession,
  confirmPayment,
  handleWebhook,
  createCustomer,
  getPaymentIntent,
};
