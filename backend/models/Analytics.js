import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    totalFoodWasted: {
        type: Number,
        default: 0
    },
    totalMoneyWasted: {
        type: Number,
        default: 0
    },
    wastedFoods: [{
        name: String,
        category: String,
        amount: Number,
        estimatedCost: Number
    }],
    tips: [{
        type: String
    }]
}, {
    timestamps: true
});

// Compound index to ensure unique monthly records per user
analyticsSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics; 