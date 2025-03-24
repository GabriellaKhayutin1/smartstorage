import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    molliePaymentId: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'EUR'
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'expired', 'canceled'],
        default: 'pending'
    },
    description: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    redirectUrl: {
        type: String,
        required: true
    },
    webhookUrl: {
        type: String,
        required: true
    },
    isSubscription: {
        type: Boolean,
        default: false
    },
    subscriptionInterval: {
        type: String,
        enum: ['week', 'month', null],
        default: null
    },
    nextBillingDate: {
        type: Date
    }
}, {
    timestamps: true
});

export default mongoose.model('Payment', paymentSchema); 