const db = require('../utilities/database');
const asyncWrapper = require('../middleware/asyncWrapper');
const stripeService = require('../services/stripeService');

/**
 * Create a payment intent for a student
 */
const createPaymentIntent = asyncWrapper(async (req, res) => {
  const { studentId } = req.params;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid payment amount' });
  }

  // Get student details
  const studentResult = await db.query(
    `SELECT paid_amount, academic_level, semester FROM Student WHERE user_id = $1`,
    [studentId]
  );
  const student = studentResult.rows[0];

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  // Calculate total fees
  const coursesResult = await db.query(
    `SELECT co.credit_hours, alf.hour_price, alf.total_fees as fixed_fees
     FROM Enrollment e
     JOIN Class cl ON e.class_id = cl.class_id
     JOIN Courses co ON cl.course_code = co.course_code
     JOIN Student s ON e.user_id = s.user_id
     LEFT JOIN Academic_Level_Fees alf ON s.academic_level = alf.academic_level AND cl.semester = alf.semester
     WHERE e.user_id = $1`,
    [studentId]
  );
  const courses = coursesResult.rows || [];

  const feeInfoResult = await db.query(
    `SELECT hour_price, total_fees 
     FROM Academic_Level_Fees 
     WHERE academic_level = $1 AND semester = $2`,
    [student.academic_level, student.semester]
  );
  const feeInfo = feeInfoResult.rows[0];

  let totalHours = 0;
  courses.forEach(c => totalHours += (c.credit_hours || 0));

  let totalFees = 0;
  if (feeInfo) {
    totalFees = totalHours > 0 ? (totalHours * (feeInfo.hour_price || 0)) : (feeInfo.total_fees || 0);
  }

  const remaining = Math.max(0, totalFees - (student.paid_amount || 0));

  if (Number(amount) > remaining) {
    return res.status(400).json({ 
      success: false, 
      message: `Amount cannot exceed remaining balance of $${remaining}` 
    });
  }

  // Create Stripe payment intent
  const paymentIntent = await stripeService.createPaymentIntent(
    amount,
    'usd',
    {
      student_id: studentId,
      academic_level: student.academic_level,
      semester: student.semester
    }
  );

  res.status(200).json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      currency: 'usd'
    }
  });
});

/**
 * Create a checkout session for Stripe Checkout
 */
const createCheckoutSession = asyncWrapper(async (req, res) => {
  const { studentId } = req.params;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid payment amount' });
  }

  // Get student details
  const studentResult = await db.query(
    `SELECT paid_amount, academic_level, semester FROM Student WHERE user_id = $1`,
    [studentId]
  );
  const student = studentResult.rows[0];

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  // Calculate total fees
  const coursesResult = await db.query(
    `SELECT co.credit_hours, alf.hour_price, alf.total_fees as fixed_fees
     FROM Enrollment e
     JOIN Class cl ON e.class_id = cl.class_id
     JOIN Courses co ON cl.course_code = co.course_code
     JOIN Student s ON e.user_id = s.user_id
     LEFT JOIN Academic_Level_Fees alf ON s.academic_level = alf.academic_level AND cl.semester = alf.semester
     WHERE e.user_id = $1`,
    [studentId]
  );
  const courses = coursesResult.rows || [];

  const feeInfoResult = await db.query(
    `SELECT hour_price, total_fees 
     FROM Academic_Level_Fees 
     WHERE academic_level = $1 AND semester = $2`,
    [student.academic_level, student.semester]
  );
  const feeInfo = feeInfoResult.rows[0];

  let totalHours = 0;
  courses.forEach(c => totalHours += (c.credit_hours || 0));

  let totalFees = 0;
  if (feeInfo) {
    totalFees = totalHours > 0 ? (totalHours * (feeInfo.hour_price || 0)) : (feeInfo.total_fees || 0);
  }

  const remaining = Math.max(0, totalFees - (student.paid_amount || 0));

  if (Number(amount) > remaining) {
    return res.status(400).json({ 
      success: false, 
      message: `Amount cannot exceed remaining balance of $${remaining}` 
    });
  }

  // Create Stripe checkout session
  const session = await stripeService.createCheckoutSession(
    amount,
    'usd',
    process.env.STRIPE_SUCCESS_URL,
    process.env.STRIPE_CANCEL_URL,
    {
      student_id: studentId,
      academic_level: student.academic_level,
      semester: student.semester
    }
  );

  res.status(200).json({
    success: true,
    data: {
      sessionId: session.id,
      url: session.url
    }
  });
});

/**
 * Confirm payment and update student record
 */
const confirmPayment = asyncWrapper(async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    return res.status(400).json({ success: false, message: 'Payment intent ID is required' });
  }

  // Get payment intent details from Stripe
  const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    return res.status(400).json({ 
      success: false, 
      message: 'Payment has not been completed yet' 
    });
  }

  const studentId = paymentIntent.metadata.student_id;
  const amount = paymentIntent.amount / 100; // Convert from cents

  if (!studentId) {
    return res.status(400).json({ success: false, message: 'Student ID not found in payment metadata' });
  }

  // Get current student data
  const studentResult = await db.query(
    `SELECT paid_amount, academic_level, semester FROM Student WHERE user_id = $1`,
    [studentId]
  );
  const student = studentResult.rows[0];

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  // Calculate total fees
  const coursesResult = await db.query(
    `SELECT co.credit_hours, alf.hour_price, alf.total_fees as fixed_fees
     FROM Enrollment e
     JOIN Class cl ON e.class_id = cl.class_id
     JOIN Courses co ON cl.course_code = co.course_code
     JOIN Student s ON e.user_id = s.user_id
     LEFT JOIN Academic_Level_Fees alf ON s.academic_level = alf.academic_level AND cl.semester = alf.semester
     WHERE e.user_id = $1`,
    [studentId]
  );
  const courses = coursesResult.rows || [];

  const feeInfoResult = await db.query(
    `SELECT hour_price, total_fees 
     FROM Academic_Level_Fees 
     WHERE academic_level = $1 AND semester = $2`,
    [student.academic_level, student.semester]
  );
  const feeInfo = feeInfoResult.rows[0];

  let totalHours = 0;
  courses.forEach(c => totalHours += (c.credit_hours || 0));

  let totalFees = 0;
  if (feeInfo) {
    totalFees = totalHours > 0 ? (totalHours * (feeInfo.hour_price || 0)) : (feeInfo.total_fees || 0);
  }

  const newPaidAmount = (student.paid_amount || 0) + amount;
  let newStatus = 'Unpaid';
  if (newPaidAmount >= totalFees && totalFees > 0) {
    newStatus = 'Paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'Partial';
  }

  // Update student record
  await db.query(
    `UPDATE Student SET paid_amount = $1, payment_status = $2 WHERE user_id = $3`,
    [newPaidAmount, newStatus, studentId]
  );

  res.status(200).json({
    success: true,
    message: 'Payment confirmed successfully',
    data: {
      paid_amount: newPaidAmount,
      payment_status: newStatus,
      total_fees: totalFees,
      remaining_amount: Math.max(0, totalFees - newPaidAmount)
    }
  });
});

/**
 * Handle Stripe webhook events
 */
const handleWebhook = asyncWrapper(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const payload = req.body;

  try {
    const event = await stripeService.handleWebhook(signature, payload);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const studentId = paymentIntent.metadata.student_id;
        const amount = paymentIntent.amount / 100;

        if (studentId) {
          // Update student payment status
          const studentResult = await db.query(
            `SELECT paid_amount, academic_level, semester FROM Student WHERE user_id = $1`,
            [studentId]
          );
          const student = studentResult.rows[0];

          if (student) {
            const coursesResult = await db.query(
              `SELECT co.credit_hours, alf.hour_price, alf.total_fees as fixed_fees
               FROM Enrollment e
               JOIN Class cl ON e.class_id = cl.class_id
               JOIN Courses co ON cl.course_code = co.course_code
               JOIN Student s ON e.user_id = s.user_id
               LEFT JOIN Academic_Level_Fees alf ON s.academic_level = alf.academic_level AND cl.semester = alf.semester
               WHERE e.user_id = $1`,
              [studentId]
            );
            const courses = coursesResult.rows || [];

            const feeInfoResult = await db.query(
              `SELECT hour_price, total_fees 
               FROM Academic_Level_Fees 
               WHERE academic_level = $1 AND semester = $2`,
              [student.academic_level, student.semester]
            );
            const feeInfo = feeInfoResult.rows[0];

            let totalHours = 0;
            courses.forEach(c => totalHours += (c.credit_hours || 0));

            let totalFees = 0;
            if (feeInfo) {
              totalFees = totalHours > 0 ? (totalHours * (feeInfo.hour_price || 0)) : (feeInfo.total_fees || 0);
            }

            const newPaidAmount = (student.paid_amount || 0) + amount;
            let newStatus = 'Unpaid';
            if (newPaidAmount >= totalFees && totalFees > 0) {
              newStatus = 'Paid';
            } else if (newPaidAmount > 0) {
              newStatus = 'Partial';
            }

            await db.query(
              `UPDATE Student SET paid_amount = $1, payment_status = $2 WHERE user_id = $3`,
              [newPaidAmount, newStatus, studentId]
            );

            console.log(`✅ Payment succeeded for student ${studentId}: $${amount}`);
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log(`❌ Payment failed: ${paymentIntent.id}`);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = {
  createPaymentIntent,
  createCheckoutSession,
  confirmPayment,
  handleWebhook
};
