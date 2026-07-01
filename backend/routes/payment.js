const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifytoken");
const {
  createPaymentIntent,
  createCheckoutSession,
  confirmPayment,
  handleWebhook
} = require("../controllers/paymentController");

// Webhook endpoint (no authentication required - must be before verifyToken)
router.post("/webhook", express.raw({ type: 'application/json' }), (req, res, next) => {
  req.body = req.body.toString(); // Convert buffer to string
  handleWebhook(req, res, next);
});

// All other payment routes require authentication
router.use(verifyToken);

// Create payment intent for Stripe Elements
router.post("/:studentId/create-intent", createPaymentIntent);

// Create checkout session for Stripe Checkout
router.post("/:studentId/create-checkout-session", createCheckoutSession);

// Confirm payment (for manual confirmation after payment)
router.post("/confirm", confirmPayment);

module.exports = router;
