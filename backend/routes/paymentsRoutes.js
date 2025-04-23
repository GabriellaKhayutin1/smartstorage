import express from 'express';
import Stripe from 'stripe';
import authenticate from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const router = express.Router();

// Initialize Stripe with the secret key
const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16'
});

console.log('PaymentsRoutes - Secret Key loaded:', stripeSecretKey.substring(0, 8) + '...');

// Create a checkout session for subscription
router.post('/create-checkout-session', authenticate, async (req, res) => {
    try {
        const { user } = req;
        console.log('Creating checkout session for user:', user);

        // Create or get customer
        let customer;
        try {
            const existingCustomers = await stripe.customers.list({
                email: user.email,
                limit: 1
            });
            console.log('Existing customers:', existingCustomers.data);

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
                console.log('Using existing customer:', customer.id);
            } else {
                customer = await stripe.customers.create({
                    email: user.email,
                    metadata: {
                        userId: user.userId
                    }
                });
                console.log('Created new customer:', customer.id);
            }
        } catch (error) {
            console.error('Error with customer creation/retrieval:', error);
            throw error;
        }

        // Verify price ID is available
        const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
        if (!priceId) {
            throw new Error('Stripe price ID is not configured');
        }

        console.log('Using STRIPE_PREMIUM_PRICE_ID:', priceId);
        console.log('Using FRONTEND_URL:', process.env.FRONTEND_URL);

        // Create checkout session
        try {
            const baseUrl = process.env.NODE_ENV === 'production'
                ? 'https://smartstorage-k0v4.onrender.com'
                : 'http://localhost:5003';

            const session = await stripe.checkout.sessions.create({
                customer: customer.id,
                payment_method_types: ['card'],
                mode: 'subscription',
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                success_url: `${baseUrl}/subscribe_payment.html?session_id={CHECKOUT_SESSION_ID}&status=success`,
                cancel_url: `${baseUrl}/subscribe_payment.html?status=cancelled`,
                metadata: {
                    userId: user.userId
                }
            });

            console.log('Checkout session created:', session.id);
            res.json({ sessionId: session.id });
        } catch (error) {
            console.error('Error creating checkout session:', error);
            console.error('Error details:', {
                message: error.message,
                type: error.type,
                code: error.code,
                param: error.param
            });
            throw error;
        }
    } catch (error) {
        console.error('Stripe session creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create checkout session',
            details: error.message,
            type: error.type,
            code: error.code
        });
    }
});

// Add this new endpoint after the create-checkout-session endpoint
router.post('/verify-subscription', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const { user } = req;

        console.log('🔍 Verifying subscription:', {
            sessionId,
            userId: user.userId,
            email: user.email
        });

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log('📦 Retrieved checkout session:', {
            sessionId: session.id,
            customerId: session.customer,
            subscriptionId: session.subscription,
            status: session.status
        });
        
        // Verify that this session belongs to this user
        if (session.metadata.userId !== user.userId.toString()) {
            console.error('❌ Session user ID mismatch:', {
                sessionUserId: session.metadata.userId,
                requestUserId: user.userId.toString()
            });
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        console.log('📦 Retrieved subscription:', {
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        });
        
        // Update user's subscription status
        await updateUserSubscription(user.userId, {
            subscriptionStatus: subscription.status,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        });

        // Get updated user data
        const updatedUser = await User.findById(user.userId);
        console.log('✅ User subscription updated:', {
            userId: updatedUser._id,
            status: updatedUser.subscriptionStatus,
            currentPeriodEnd: updatedUser.currentPeriodEnd
        });

        res.json({
            status: 'success',
            subscription: {
                status: subscription.status,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            }
        });
    } catch (error) {
        console.error('❌ Error verifying subscription:', error);
        res.status(500).json({
            error: 'Failed to verify subscription',
            details: error.message
        });
    }
});

// Check subscription status
router.get('/check-subscription', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Get subscription details if there is an active subscription
        let subscriptionDetails = null;
        if (user.stripeSubscriptionId) {
            try {
                const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
                subscriptionDetails = {
                    status: subscription.status,
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000)
                };
            } catch (error) {
                console.error('Error fetching subscription details:', error);
            }
        }

        res.json({
            status: user.subscriptionStatus,
            trialEnds: user.trialEnds,
            subscriptionStart: user.subscriptionStart,
            currentPeriodEnd: user.currentPeriodEnd,
            hasActiveSubscription: user.hasActiveSubscription(),
            stripeDetails: subscriptionDetails
        });
    } catch (error) {
        console.error('Error checking subscription:', error);
        res.status(500).json({ error: 'Failed to check subscription status' });
    }
});

// Webhook to handle successful payments
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    console.log('🔔 Received webhook request');

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log('✅ Webhook signature verified, event type:', event.type);
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                console.log('💳 Checkout session completed:', {
                    sessionId: session.id,
                    customerId: session.customer,
                    subscriptionId: session.subscription,
                    userId: session.metadata?.userId
                });

                // Retrieve the subscription details
                const checkoutSubscription = await stripe.subscriptions.retrieve(session.subscription);
                console.log('📦 Subscription details:', {
                    status: checkoutSubscription.status,
                    currentPeriodEnd: new Date(checkoutSubscription.current_period_end * 1000)
                });

                // Update user subscription status
                const checkoutUserId = session.metadata.userId;
                const checkoutUser = await User.findById(checkoutUserId);
                
                if (!checkoutUser) {
                    throw new Error(`User not found: ${checkoutUserId}`);
                }

                checkoutUser.subscriptionStatus = 'active';
                checkoutUser.stripeSubscriptionId = session.subscription;
                checkoutUser.subscriptionStart = new Date();
                checkoutUser.currentPeriodEnd = new Date(checkoutSubscription.current_period_end * 1000);
                
                await checkoutUser.save();
                console.log('✅ User subscription updated:', {
                    userId: checkoutUser._id,
                    status: checkoutUser.subscriptionStatus,
                    subscriptionId: checkoutUser.stripeSubscriptionId,
                    currentPeriodEnd: checkoutUser.currentPeriodEnd
                });
                break;

            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                console.log('💰 Invoice payment succeeded:', {
                    invoiceId: invoice.id,
                    customerId: invoice.customer,
                    subscriptionId: invoice.subscription
                });

                if (invoice.subscription) {
                    const invoiceSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
                    const invoiceCustomer = await stripe.customers.retrieve(invoice.customer);
                    const invoiceUserId = invoiceCustomer.metadata.userId;

                    const invoiceUser = await User.findById(invoiceUserId);
                    if (invoiceUser) {
                        invoiceUser.subscriptionStatus = invoiceSubscription.status;
                        invoiceUser.currentPeriodEnd = new Date(invoiceSubscription.current_period_end * 1000);
                        await invoiceUser.save();
                        console.log('✅ User subscription renewed:', {
                            userId: invoiceUser._id,
                            status: invoiceUser.subscriptionStatus,
                            currentPeriodEnd: invoiceUser.currentPeriodEnd
                        });
                    }
                }
                break;

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const updatedSubscription = event.data.object;
                console.log(`📝 Subscription ${event.type}:`, {
                    subscriptionId: updatedSubscription.id,
                    customerId: updatedSubscription.customer,
                    status: updatedSubscription.status
                });

                const updatedCustomer = await stripe.customers.retrieve(updatedSubscription.customer);
                const updatedUserId = updatedCustomer.metadata.userId;
                const updatedUser = await User.findById(updatedUserId);

                if (updatedUser) {
                    updatedUser.subscriptionStatus = updatedSubscription.status;
                    if (updatedSubscription.status === 'canceled') {
                        updatedUser.stripeSubscriptionId = null;
                    }
                    await updatedUser.save();
                    console.log('✅ User subscription status updated:', {
                        userId: updatedUser._id,
                        status: updatedUser.subscriptionStatus
                    });
                }
                break;

            default:
                console.log(`⚠️ Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (err) {
        console.error('❌ Error processing webhook:', err);
        res.status(500).send(`Webhook Error: ${err.message}`);
    }
});

async function handleCheckoutSessionCompleted(session) {
    console.log('Processing completed checkout session:', session.id);
    
    const userId = session.metadata.userId;
    if (!userId) {
        throw new Error('No userId found in session metadata');
    }

    await updateUserSubscription(userId, {
        subscriptionStatus: 'active',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription
    });
}

async function handleSubscriptionUpdate(subscription) {
    console.log('Processing subscription update:', subscription.id);
    
    const customer = await stripe.customers.retrieve(subscription.customer);
    const userId = customer.metadata.userId;
    
    if (!userId) {
        throw new Error('No userId found in customer metadata');
    }

    await updateUserSubscription(userId, {
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    });
}

async function handleSubscriptionDeleted(subscription) {
    console.log('Processing subscription deletion:', subscription.id);
    
    const customer = await stripe.customers.retrieve(subscription.customer);
    const userId = customer.metadata.userId;
    
    if (!userId) {
        throw new Error('No userId found in customer metadata');
    }

    await updateUserSubscription(userId, {
        subscriptionStatus: 'cancelled',
        stripeSubscriptionId: null
    });
}

async function updateUserSubscription(userId, updateData) {
    console.log('Updating user subscription:', { userId, ...updateData });
    
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        // Update user subscription data
        Object.assign(user, updateData);
        
        // Add subscription start date if becoming active
        if (updateData.subscriptionStatus === 'active' && !user.subscriptionStart) {
            user.subscriptionStart = new Date();
        }

        await user.save();
        console.log('Successfully updated user subscription:', userId);
    } catch (error) {
        console.error('Error updating user subscription:', error);
        throw error;
    }
}

// Get Stripe publishable key
router.get('/publishable-key', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

export default router; 