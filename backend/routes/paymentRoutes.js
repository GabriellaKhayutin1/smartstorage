import express from 'express';
import { createSubscription, SUBSCRIPTION_PLANS } from '../services/stripeService.js';
import authenticate from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

// Get subscription plans
router.get('/plans', (req, res) => {
    res.json(SUBSCRIPTION_PLANS);
});

// Create a new subscription
router.post('/subscribe', authenticate, async (req, res) => {
    try {
        const { planType } = req.body;
        const userId = req.user.userId;

        if (!SUBSCRIPTION_PLANS[planType]) {
            return res.status(400).json({ error: 'Invalid subscription plan' });
        }

        console.log('Creating subscription with:', {
            userId,
            planType
        });

        const subscription = await createSubscription(userId, planType);

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

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        await handleWebhook(event);
        res.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default router; 