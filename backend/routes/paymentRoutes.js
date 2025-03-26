import express from 'express';
import { createPayment, createSubscription, getPaymentStatus, updatePaymentStatus, SUBSCRIPTION_PLANS } from '../services/paymentService.js';
import authenticate from '../middleware/authMiddleware.js';
import { createMollieClient } from '@mollie/api-client';
import User from '../models/User.js'; // ⬅️ User model for DB lookups

const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });



const router = express.Router();

// Get subscription plans
router.get('/plans', (req, res) => {
    res.json(SUBSCRIPTION_PLANS);
});

// Create a new payment
router.post('/create', authenticate, async (req, res) => {
    try {
        const { amount, description } = req.body;
        if (!amount || isNaN(Number(amount))) {
            return res.status(400).json({ error: 'Invalid or missing payment amount' });
        }
        
        const userId = req.user.userId;

        // Fetch the user from DB to get their Mollie Customer ID
        const user = await User.findById(userId);
        if (!user || !user.mollieCustomerId) {
            return res.status(400).json({ error: "Mollie customer not found" });
        }

        // Create URLs for redirect and webhook
        const redirectUrl = `${process.env.FRONTEND_URL}/payment/status`;
        const webhookUrl = `${process.env.BACKEND_URL}/api/payments/webhook`;

        const payment = await mollieClient.payments.create({
            amount: {
              currency: "EUR",
              value: amount // send "0.00" from frontend for mandate setup
            },
            customerId: user.mollieCustomerId,
            description,
            sequenceType: "first", // important for mandate
            redirectUrl,
            webhookUrl
        });
          res.json({
            url: payment.getCheckoutUrl(),
            paymentId: payment.id // helpful for tracking status from frontend
          });
           // this is what you redirect to on frontend
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});


// Create a new subscription
router.post('/subscribe', authenticate, async (req, res) => {
    try {
        const { planType, redirectUrl, webhookUrl } = req.body;
        const userId = req.user.userId;

        if (!SUBSCRIPTION_PLANS[planType]) {
            return res.status(400).json({ error: 'Invalid subscription plan' });
        }

        console.log('Creating subscription with:', {
            userId,
            planType,
            redirectUrl,
            webhookUrl
        });

        const subscription = await createSubscription(
            userId,
            planType,
            redirectUrl,
            webhookUrl
        );

        console.log('Subscription created:', subscription);
        res.json(subscription);
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ 
            error: 'Failed to create subscription',
            details: error.message
        });
    }
});

// Get payment status
router.get('/status/:paymentId', authenticate, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const status = await getPaymentStatus(paymentId);
        res.json({ status });
    } catch (error) {
        console.error('Error getting payment status:', error);
        res.status(500).json({ error: 'Failed to get payment status' });
    }
});

// Webhook endpoint for Mollie payment status updates
router.post('/webhook', async (req, res) => {
    try {
        const paymentId = req.body.id;

        // 1. Fetch payment from Mollie to verify its status
        const payment = await mollieClient.payments.get(paymentId);
        if (!payment.customerId || !payment.mandateId) {
            console.warn("⚠️ Webhook: Missing customerId or mandateId in payment.");
            return res.status(200).send("OK"); // still return 200 to Mollie
          }

        if (payment.isPaid() && payment.sequenceType === "first") {
            const customerId = payment.customerId;
            const mandateId = payment.mandateId;

            // 2. Find the user with this Mollie customer ID
            const user = await User.findOne({ mollieCustomerId: customerId });

            if (user) {
                console.log(`✅ Mandate set up for user: ${user.email}`);

                // 3. Optionally store the mandate ID in your User model
                user.mandateId = mandateId;
                await user.save();
            }
        }

        // 4. Update payment status in your database if you're tracking payments
        await updatePaymentStatus(payment.id, payment.status);
        res.status(200).send("OK");
    } catch (error) {
        console.error('❌ Error in webhook handler:', error);
        res.status(500).send("Webhook error");
    }
});


export default router; 