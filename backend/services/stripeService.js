import Stripe from 'stripe';
import User from '../models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Initialize Stripe with the secret key
const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16'
});

console.log('StripeService - Secret Key loaded:', stripeSecretKey.substring(0, 8) + '...');

// Define the Price ID from your Stripe Dashboard for the Premium Plan
// It's better to use a fixed Price ID than creating price_data on the fly
const PREMIUM_PLAN_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID; // Add this to your .env!

export const SUBSCRIPTION_PLANS = {
    premium: {
        name: 'Premium',
        priceId: PREMIUM_PLAN_PRICE_ID,
        features: [
            'Digital pantry management',
            'Google Calendar integration',
            'CO₂ savings leaderboard',
            'Storage tips and tricks',
            'Expiration notifications'
        ]
    }
};

export const createStripeCustomer = async (email, name) => {
    try {
        console.log(`Creating Stripe customer for ${email}`);
        const customer = await stripe.customers.create({
            email,
            name,
            metadata: {
                source: 'smart_pantry',
                userId: 'temp' // Placeholder, update after user creation if needed
            }
        });
        console.log(`✅ Stripe customer created: ${customer.id}`);
        return customer;
    } catch (error) {
        console.error('❌ Error creating Stripe customer:', error);
        throw error;
    }
};

export const createSubscription = async (userId, planType) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        console.log(`Creating subscription for user ${userId}, email: ${user.email}`);

        // --- Ensure Stripe Customer Exists ---
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            console.log(`Stripe customer ID not found for user ${userId}, creating new one.`);
            const customer = await createStripeCustomer(user.email, user.name);
            stripeCustomerId = customer.id;
            user.stripeCustomerId = stripeCustomerId;
            // Update customer metadata with actual user ID
            await stripe.customers.update(stripeCustomerId, { metadata: { userId: user._id.toString() } });
            console.log(`Updated Stripe customer ${stripeCustomerId} metadata with userId ${user._id}`);
        } else {
            console.log(`User ${userId} already has Stripe customer ID: ${stripeCustomerId}`);
        }

        const plan = SUBSCRIPTION_PLANS[planType];
        if (!plan || !plan.priceId) {
             throw new Error(`Invalid plan type or missing Price ID for plan: ${planType}`);
        }
        console.log(`Using Stripe Price ID: ${plan.priceId}`);

        // --- Handle Trial Period ---        
        let trialEndDate = null;
        const now = new Date();

        if (user.subscriptionStatus === 'trial' && user.trialEnds && user.trialEnds > now) {
            // Calculate remaining trial days accurately
            const remainingMilliseconds = user.trialEnds.getTime() - now.getTime();
            // Stripe uses whole days, round up to ensure full trial period
            const remainingDays = Math.ceil(remainingMilliseconds / (1000 * 60 * 60 * 24));
            
            if (remainingDays > 0) {
                // Stripe trial_end expects a Unix timestamp (seconds)
                trialEndDate = Math.floor(user.trialEnds.getTime() / 1000);
                console.log(`User is on trial. Applying trial end date: ${user.trialEnds.toISOString()} (${remainingDays} days remaining, timestamp: ${trialEndDate})`);
            } else {
                 console.log(`Trial technically ends today or has passed, proceeding without trial.`);
            }
        } else {
            console.log(`User not on active trial (Status: ${user.subscriptionStatus}, Ends: ${user.trialEnds}), proceeding without trial.`);
        }

        // --- Create Stripe Subscription --- 
        const subscriptionParams = {
            customer: stripeCustomerId,
            items: [{
                price: plan.priceId, // Use the Price ID
            }],
            payment_behavior: 'default_incomplete', // Collect payment details, charge later
            expand: ['latest_invoice.payment_intent'],
            metadata: { // Add metadata to subscription
                userId: user._id.toString(),
                email: user.email
            }
        };

        // Add trial_end timestamp if applicable
        if (trialEndDate) {
            subscriptionParams.trial_end = trialEndDate;
        }

        console.log('Creating Stripe subscription with params:', subscriptionParams);
        const subscription = await stripe.subscriptions.create(subscriptionParams);

        console.log(`✅ Stripe subscription created: ${subscription.id}, Status: ${subscription.status}`);

        // --- Update User Record --- 
        user.stripeSubscriptionId = subscription.id;
        // Let webhook handle status updates mostly, but set to pending if not trialing
        if (subscription.status !== 'trialing') {
             user.subscriptionStatus = 'pending_payment'; // Or another appropriate status
        }
        // Save stripeCustomerId if it was newly created
        await user.save();
        console.log(`User ${userId} record updated with Stripe info. Current DB status: ${user.subscriptionStatus}`);

        // --- Return necessary info to frontend --- 
        if (!subscription.latest_invoice?.payment_intent?.client_secret) {
            console.error('❌ Error: Could not get client_secret from subscription', subscription);
            throw new Error('Failed to get payment intent client secret from Stripe subscription.');
        }

        return {
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            requiresAction: subscription.status === 'incomplete' || subscription.status === 'past_due',
            status: subscription.status // e.g., 'trialing', 'incomplete'
        };
    } catch (error) {
        console.error('❌ Error creating subscription:', error);
        // Provide more context if it's a Stripe error
        if (error.type === 'StripeCardError') {
             throw new Error(`Stripe Card Error: ${error.message}`);
        } else if (error.type) {
             throw new Error(`Stripe Error (${error.type}): ${error.message}`);
        } else {
             throw error; // Rethrow original error if not Stripe-specific
        }
    }
};

export const handleWebhook = async (event) => {
    let subscription;
    let user;
    try {
        console.log(`🔔 Received Stripe webhook event: ${event.type}`);
        const dataObject = event.data.object;

        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.trial_will_end': // Good event to notify user
                subscription = dataObject;
                console.log(`Handling subscription update/create for Stripe Sub ID: ${subscription.id}, Status: ${subscription.status}`);
                user = await User.findOne({ stripeSubscriptionId: subscription.id });
                if (!user) {
                    // Maybe the user was created via Stripe checkout, check customer ID
                    user = await User.findOne({ stripeCustomerId: subscription.customer });
                    if (!user) {
                        console.warn(`⚠️ Webhook: User not found for subscription ${subscription.id} or customer ${subscription.customer}`);
                        return; // Exit if no user found
                    }
                    // Link subscription ID if found via customer ID
                    user.stripeSubscriptionId = subscription.id;
                }
                user.subscriptionStatus = subscription.status; // Update status from Stripe
                await user.save();
                console.log(`✅ Updated user ${user.email} status to ${subscription.status}`);
                break;

            case 'customer.subscription.deleted':
                subscription = dataObject;
                console.log(`Handling subscription deletion for Stripe Sub ID: ${subscription.id}`);
                user = await User.findOne({ stripeSubscriptionId: subscription.id });
                if (!user) {
                    console.warn(`⚠️ Webhook: User not found for deleted subscription ${subscription.id}`);
                    return;
                }
                user.subscriptionStatus = 'cancelled'; // Or 'inactive'
                // Optionally clear stripeSubscriptionId
                // user.stripeSubscriptionId = null;
                await user.save();
                console.log(`✅ Updated user ${user.email} status to cancelled`);
                break;

            case 'invoice.payment_succeeded':
                const invoice = dataObject;
                console.log(`Handling successful payment for invoice ${invoice.id}, Subscription: ${invoice.subscription}`);
                // Check if it's for a subscription payment
                if (invoice.subscription) {
                    user = await User.findOne({ stripeSubscriptionId: invoice.subscription });
                     if (!user) {
                        // Fallback check via customer ID
                         user = await User.findOne({ stripeCustomerId: invoice.customer });
                         if (!user) {
                             console.warn(`⚠️ Webhook: User not found for successful invoice ${invoice.id} (Sub: ${invoice.subscription}, Cust: ${invoice.customer})`);
                             return;
                         }
                         // Link subscription ID if found via customer ID
                         user.stripeSubscriptionId = invoice.subscription;
                     }
                    user.subscriptionStatus = 'active'; // Mark as active after successful payment
                    await user.save();
                    console.log(`✅ Updated user ${user.email} status to active after payment.`);
                }
                break;

            case 'invoice.payment_failed':
                const failedInvoice = dataObject;
                console.log(`Handling failed payment for invoice ${failedInvoice.id}, Subscription: ${failedInvoice.subscription}`);
                if (failedInvoice.subscription) {
                    user = await User.findOne({ stripeSubscriptionId: failedInvoice.subscription });
                     if (!user) {
                        // Fallback check via customer ID
                         user = await User.findOne({ stripeCustomerId: failedInvoice.customer });
                         if (!user) {
                             console.warn(`⚠️ Webhook: User not found for failed invoice ${failedInvoice.id} (Sub: ${failedInvoice.subscription}, Cust: ${failedInvoice.customer})`);
                             return;
                         }
                         // Link subscription ID if found via customer ID
                         user.stripeSubscriptionId = failedInvoice.subscription;
                     }
                    // Decide status: 'past_due' or 'inactive' etc.
                    user.subscriptionStatus = 'past_due';
                    await user.save();
                    console.log(`✅ Updated user ${user.email} status to past_due after failed payment.`);
                    // TODO: Maybe notify the user here
                }
                break;

            default:
                console.log(`🤷 Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error(`❌ Error handling webhook event ${event.type}:`, error);
        // Ensure a response is sent to Stripe to prevent retries for this specific error
        // Re-throwing might cause Stripe to retry indefinitely if the issue persists
        // Instead, log the error and return success to Stripe, handle the fallout manually/alerting.
        // throw error; // Avoid re-throwing in production webhook handlers unless you are sure
    }
};