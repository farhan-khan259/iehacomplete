const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    attachments: [{
        type: String
    }],
    sentiment: {
        score: {
            type: Number,
            default: 0
        },
        label: {
            type: String,
            enum: ['positive', 'neutral', 'negative'],
            default: 'neutral'
        },
        confidence: {
            type: Number,
            default: 0
        }
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
    },
    aiAnalysis: {
        summary: String,
        keyTopics: [String],
        suggestions: [String],
        emotionBreakdown: {
            joy: Number,
            anger: Number,
            sadness: Number,
            surprise: Number,
            fear: Number
        }
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved', 'archived'],
        default: 'pending'
    },
    adminResponse: {
        message: String,
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        respondedAt: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update updatedAt on save
feedbackSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Feedback', feedbackSchema);