import express from 'express';
import { createPayment, createSubscription, getPaymentStatus, updatePaymentStatus, SUBSCRIPTION_PLANS } from '../services/paymentService.js';
import authenticate from '../middleware/authMiddleware.js';

const router = express.Router();

// Get subscription plans
router.get('/plans', (req, res) => {
    res.json(SUBSCRIPTION_PLANS);
});

// Create a new payment
router.post('/create', authenticate, async (req, res) => {
    try {
        const { amount, description } = req.body;
        const userId = req.user.userId;

        // Create URLs for redirect and webhook
        const redirectUrl = `${process.env.FRONTEND_URL}/payment/status`;
        const webhookUrl = `${process.env.BACKEND_URL}/api/payments/webhook`;

        const payment = await createPayment(
            userId,
            amount,
            description,
            redirectUrl,
            webhookUrl
        );

        res.json(payment);
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
        const { id, status } = req.body;
        
        // Update payment status in database
        await updatePaymentStatus(id, status);
        
        // Send 200 OK response to Mollie
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Error processing webhook');
    }
});

export default router; 