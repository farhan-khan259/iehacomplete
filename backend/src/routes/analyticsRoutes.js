const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const { protect: auth } = require('../middleware/authMiddleware');

// Admin analytics - require admin authentication
router.get('/sentiment', auth, async (req, res) => {
    try {
        // Check if user is admin (auth middleware sets role: 'admin' or checks isAdmin)
        if (!(req.user.role === 'admin' || req.user.isAdmin)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { period = '7d' } = req.query; // 7d, 30d, 90d, 1y

        // Calculate date range
        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }

        // Get all feedback in date range
        const feedback = await Feedback.find({
            createdAt: { $gte: startDate }
        })
            .populate('user', 'fullName')
            .populate('event', 'title');

        // Calculate analytics
        const totalFeedback = feedback.length;

        // Sentiment distribution
        const sentimentCount = { positive: 0, neutral: 0, negative: 0 };
        const priorityCount = { high: 0, medium: 0, low: 0 };
        let totalScore = 0;
        let respondedCount = 0;

        feedback.forEach(f => {
            if (f.sentiment?.label) {
                sentimentCount[f.sentiment.label] += 1;
            }
            if (f.priority) {
                priorityCount[f.priority] += 1;
            }
            if (f.sentiment?.score) {
                totalScore += f.sentiment.score;
            }
            if (f.adminResponse) {
                respondedCount += 1;
            }
        });

        const averageSentiment = totalFeedback > 0 ? totalScore / totalFeedback : 0;
        const responseRate = totalFeedback > 0 ? (respondedCount / totalFeedback) * 100 : 0;

        // Calculate percentage distribution
        const sentimentDistribution = {
            positive: totalFeedback > 0 ? Math.round((sentimentCount.positive / totalFeedback) * 100) : 0,
            neutral: totalFeedback > 0 ? Math.round((sentimentCount.neutral / totalFeedback) * 100) : 0,
            negative: totalFeedback > 0 ? Math.round((sentimentCount.negative / totalFeedback) * 100) : 0
        };

        // Get recent feedback for table
        const recentFeedback = await Feedback.find()
            .populate('user', 'fullName email')
            .populate('event', 'title')
            .sort({ createdAt: -1 })
            .limit(10);

        // Get event-specific analytics
        const eventAnalytics = await Feedback.aggregate([
            {
                $match: {
                    event: { $ne: null },
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$event',
                    count: { $sum: 1 },
                    avgSentiment: { $avg: '$sentiment.score' },
                    positiveCount: {
                        $sum: {
                            $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'events',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'eventDetails'
                }
            },
            {
                $unwind: '$eventDetails'
            },
            {
                $project: {
                    eventId: '$_id',
                    eventTitle: '$eventDetails.title',
                    feedbackCount: '$count',
                    averageSentiment: { $round: ['$avgSentiment', 2] },
                    positiveRate: {
                        $round: [
                            { $multiply: [{ $divide: ['$positiveCount', '$count'] }, 100] },
                            1
                        ]
                    }
                }
            },
            { $sort: { feedbackCount: -1 } },
            { $limit: 5 }
        ]);

        // Get trends data for charts
        const trends = await getTrendsData(startDate);

        res.json({
            period,
            totalFeedback,
            averageSentiment: averageSentiment.toFixed(2),
            sentimentDistribution,
            priorityBreakdown: priorityCount,
            responseRate: responseRate.toFixed(1),
            highPriorityCount: priorityCount.high,
            recentFeedback: recentFeedback.map(f => ({
                id: f._id,
                user: f.user?.fullName || 'Anonymous',
                event: f.event?.title || 'General',
                time: f.createdAt,
                content: f.message.substring(0, 100) + (f.message.length > 100 ? '...' : ''),
                sentiment: f.sentiment?.label || 'neutral',
                priority: f.priority || 'low',
                status: f.status
            })),
            eventAnalytics,
            trends
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get detailed feedback for admin
router.get('/admin/feedback', auth, async (req, res) => {
    try {
        if (!(req.user.role === 'admin' || req.user.isAdmin)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const {
            page = 1,
            limit = 20,
            sentiment,
            priority,
            status,
            eventId,
            search
        } = req.query;

        const query = {};

        // Apply filters
        if (sentiment && sentiment !== 'all') query['sentiment.label'] = sentiment;
        if (priority && priority !== 'all') query.priority = priority;
        if (status && status !== 'all') query.status = status;
        if (eventId && eventId !== 'all') query.event = eventId;

        // Search
        if (search) {
            query.$or = [
                { subject: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
                { 'user.fullName': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const feedback = await Feedback.find(query)
            .populate('user', 'fullName email profilePicture')
            .populate('event', 'title')
            .populate('adminResponse.respondedBy', 'fullName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Feedback.countDocuments(query);

        res.json({
            feedback,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// Admin response to feedback
router.post('/admin/feedback/:id/respond', auth, async (req, res) => {
    try {
        if (!(req.user.role === 'admin' || req.user.isAdmin)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { responseMessage, status } = req.body;

        const feedback = await Feedback.findByIdAndUpdate(
            req.params.id,
            {
                adminResponse: {
                    message: responseMessage,
                    respondedBy: req.user.id,
                    respondedAt: new Date()
                },
                status: status || 'reviewed'
            },
            { new: true }
        )
            .populate('adminResponse.respondedBy', 'fullName');

        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({
            message: 'Response submitted successfully',
            feedback
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit response' });
    }
});

// Helper function to get trends data
async function getTrendsData(startDate) {
    try {
        const trends = await Feedback.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    total: { $sum: 1 },
                    positive: {
                        $sum: { $cond: [{ $eq: ["$sentiment.label", "positive"] }, 1, 0] }
                    },
                    neutral: {
                        $sum: { $cond: [{ $eq: ["$sentiment.label", "neutral"] }, 1, 0] }
                    },
                    negative: {
                        $sum: { $cond: [{ $eq: ["$sentiment.label", "negative"] }, 1, 0] }
                    },
                    avgScore: { $avg: "$sentiment.score" }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $limit: 30
            }
        ]);

        // Format for chart
        return {
            labels: trends.map(t => {
                const date = new Date(t._id);
                return date.toLocaleDateString('en-US', { weekday: 'short' });
            }),
            positive: trends.map(t => t.positive || 0),
            neutral: trends.map(t => t.neutral || 0),
            negative: trends.map(t => t.negative || 0),
            averageScores: trends.map(t => t.avgScore || 0)
        };
    } catch (error) {
        console.error('Trends data error:', error);
        return {
            labels: [],
            positive: [],
            neutral: [],
            negative: [],
            averageScores: []
        };
    }
}

module.exports = router;