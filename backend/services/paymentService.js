import { createMollieClient } from '@mollie/api-client';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

// Subscription plans
export const SUBSCRIPTION_PLANS = {
    weekly: {
        amount: '4.99',
        description: 'Weekly Premium Subscription',
        interval: 'week'
    },
    monthly: {
        amount: 19.99,
        description: 'Monthly Premium Subscription',
        interval: 'month'
    }
};

// Function to get or create Mollie customer
const getOrCreateMollieCustomer = async (user) => {
    try {
        // If user already has a Mollie customer ID, verify it exists
        if (user.mollieCustomerId) {
            try {
                await mollieClient.customers.get(user.mollieCustomerId);
                return user.mollieCustomerId;
            } catch (error) {
                console.log('Existing Mollie customer not found, creating new one');
            }
        }

        // Create new Mollie customer
        const customer = await mollieClient.customers.create({
            name: user.name || user.email.split('@')[0],
            email: user.email
        });

        // Update user with new Mollie customer ID
        user.mollieCustomerId = customer.id;
        await user.save();

        return customer.id;
    } catch (error) {
        console.error('Error creating Mollie customer:', error);
        throw error;
    }
};

export const createPayment = async (userId, amount, description, redirectUrl, webhookUrl) => {
    try {
        // Create payment in Mollie
        const payment = await mollieClient.payments.create({
            amount: {
                currency: 'EUR',
                value: amount.toFixed(2)
            },
            description,
            redirectUrl,
            webhookUrl,
            methods: ['ideal', 'creditcard', 'paypal']
        });

        // Create payment record in database
        const paymentRecord = await Payment.create({
            userId,
            molliePaymentId: payment.id,
            amount,
            description,
            redirectUrl,
            webhookUrl,
            paymentMethod: payment.method,
            status: payment.status
        });

        return {
            paymentId: payment.id,
            checkoutUrl: payment.getCheckoutUrl(),
            paymentRecord
        };
    } catch (error) {
        console.error('Error creating payment:', error);
        throw error;
    }
};

export const createSubscription = async (userId, planType, redirectUrl, webhookUrl) => {
    try {
        console.log('Creating subscription with params:', {
            userId,
            planType,
            redirectUrl,
            webhookUrl
        });

        const plan = SUBSCRIPTION_PLANS[planType];
        if (!plan) {
            throw new Error('Invalid subscription plan');
        }

        // Get user from database
        const user = await User.findById(userId);
        if (!user || !user.mollieCustomerId) {
            throw new Error('User not found or Mollie customer ID missing');
        }

        // 🟡 Create subscription that starts after trial ends
        const subscription = await mollieClient.customers_subscriptions.create({
            customerId: user.mollieCustomerId,
            amount: {
                currency: "EUR",
                value: plan.amount.toFixed(2)
            },
            interval: plan.interval, // e.g., "1 month"
            description: plan.description,
            webhookUrl,
            startDate: user.trialEnds.toISOString().split('T')[0], // ⏰ start after trial
        });

        console.log('✅ Subscription created:', subscription);

        // (Optional) Save subscription info to DB if needed
        // await Subscription.create({
        //     userId,
        //     mollieSubscriptionId: subscription.id,
        //     planType,
        //     status: subscription.status
        // });

        return {
            subscriptionId: subscription.id,
            status: subscription.status,
            startDate: subscription.startDate
        };
    } catch (error) {
        console.error('❌ Error creating subscription:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.body,
        });
        throw error;
    }
};


export const getPaymentStatus = async (paymentId) => {
    try {
        const payment = await mollieClient.payments.get(paymentId);
        return payment.status;
    } catch (error) {
        console.error('Error getting payment status:', error);
        throw error;
    }
};

export const updatePaymentStatus = async (paymentId, status) => {
    try {
        const payment = await Payment.findOneAndUpdate(
            { molliePaymentId: paymentId },
            { status },
            { new: true }
        );
        return payment;
    } catch (error) {
        console.error('Error updating payment status:', error);
        throw error;
    }
}; 