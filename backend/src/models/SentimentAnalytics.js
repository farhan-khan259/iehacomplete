const mongoose = require('mongoose');

const sentimentAnalyticsSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        index: true
    },
    period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily'
    },
    totalFeedback: Number,
    sentimentDistribution: {
        positive: Number,
        neutral: Number,
        negative: Number
    },
    averageScore: Number,
    priorityBreakdown: {
        high: Number,
        medium: Number,
        low: Number
    },
    topKeywords: [{
        keyword: String,
        frequency: Number,
        sentiment: String
    }],
    eventBasedAnalytics: [{
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event'
        },
        eventName: String,
        totalFeedback: Number,
        averageSentiment: Number,
        positiveRate: Number
    }],
    responseRate: Number,
    averageResponseTime: Number, // in hours
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SentimentAnalytics', sentimentAnalyticsSchema);