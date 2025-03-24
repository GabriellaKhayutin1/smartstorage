import mongoose from 'mongoose';

const monthlyCO2Schema = new mongoose.Schema({
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
    co2Saved: {
        type: Number,
        default: 0
    },
    itemsCount: {
        type: Number,
        default: 0
    },
    ingredients: [{
        name: String,
        category: String,
        co2Saved: Number
    }]
}, {
    timestamps: true
});

// Compound index to ensure unique monthly records per user
monthlyCO2Schema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

const MonthlyCO2 = mongoose.model('MonthlyCO2', monthlyCO2Schema);

export default MonthlyCO2; 