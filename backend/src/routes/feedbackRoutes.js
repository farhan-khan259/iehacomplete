const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const { protect: auth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const SentimentAnalysisService = require('../../../ieha/src/services/SentimentAnalysisService');
const mongoose = require('mongoose');

// Submit feedback
router.post('/', auth, (req, res, next) => {
    // call multer middleware and handle upload errors explicitly
    upload.array('attachments', 5)(req, res, function (err) {
        if (err) {
            console.error('Upload error:', err && err.message ? err.message : err);
            return res.status(400).json({ error: err && err.message ? err.message : 'File upload error' });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { subject, message, eventId } = req.body;
        const userId = req.user && req.user.id ? req.user.id : null;

        // Ensure the request is from a valid user (not an admin token without a user id)
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ error: 'Not authorized to submit feedback' });
        }

        // Validate event if provided
        if (eventId) {
            const event = await Event.findById(eventId);
            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }
        }

        // Perform sentiment analysis
        const fullText = `${subject}. ${message}`;
        const sentimentAnalysis = await SentimentAnalysisService.analyzeFeedback(fullText);

        // Use AI analysis returned from the analyzer when available; fall back to the service method.
        const aiAnalysis = sentimentAnalysis.aiAnalysis || (typeof SentimentAnalysisService.generateAIInsights === 'function'
            ? SentimentAnalysisService.generateAIInsights(fullText, sentimentAnalysis)
            : null);

        // Create feedback
        const feedbackData = {
            user: userId,
            event: eventId || null,
            subject,
            message,
            attachments: req.files ? req.files.map(f => f.filename) : [],
            sentiment: {
                score: sentimentAnalysis.score,
                label: sentimentAnalysis.label,
                confidence: sentimentAnalysis.confidence
            },
            priority: sentimentAnalysis.priority,
            aiAnalysis,
            status: 'pending'
        };

        const feedback = new Feedback(feedbackData);
        await feedback.save();

        // Populate user details for response
        await feedback.populate('user', 'fullName email profilePicture');
        await feedback.populate('event', 'title startDate');

        res.status(201).json({
            message: 'Feedback submitted successfully',
            feedback: feedback
        });
    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

// Get user's feedback (admins get all feedback)
router.get('/my-feedback', auth, async (req, res) => {
    try {
        let query = {};

        // If user is admin (protect may set role), return all feedback
        if (req.user && (req.user.role === 'admin' || req.user.isAdmin)) {
            query = {};
        } else if (req.user && req.user.id && mongoose.Types.ObjectId.isValid(req.user.id)) {
            query = { user: req.user.id };
        } else {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const feedback = await Feedback.find(query)
            .populate('event', 'title startDate featuredImage')
            .populate('user', 'fullName')
            .sort({ createdAt: -1 });

        res.json({ feedback });
    } catch (error) {
        console.error('Fetch my-feedback error:', error && error.message ? error.message : error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// Get feedback for specific event
router.get('/event/:eventId', auth, async (req, res) => {
    try {
        const feedback = await Feedback.find({
            event: req.params.eventId,
            user: req.user.id
        })
            .populate('event', 'title')
            .sort({ createdAt: -1 });

        res.json({ feedback });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch event feedback' });
    }
});

// Get feedback by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .populate('user', 'fullName email profilePicture')
            .populate('event', 'title startDate')
            .populate('adminResponse.respondedBy', 'fullName');

        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        // Check if user is authorized to view this feedback
        if (feedback.user._id.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ feedback });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// Update feedback (user can update their own feedback)
router.put('/:id', auth, async (req, res) => {
    try {
        const { subject, message } = req.body;
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        // Check if user owns this feedback
        if (feedback.user.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Re-analyze sentiment if content changed
        if (subject !== feedback.subject || message !== feedback.message) {
            const fullText = `${subject}. ${message}`;
            const sentimentAnalysis = await SentimentAnalysisService.analyzeFeedback(fullText);
            const aiAnalysis = sentimentAnalysis.aiAnalysis || (typeof SentimentAnalysisService.generateAIInsights === 'function'
                ? SentimentAnalysisService.generateAIInsights(fullText, sentimentAnalysis)
                : null);

            feedback.sentiment = {
                score: sentimentAnalysis.score,
                label: sentimentAnalysis.label,
                confidence: sentimentAnalysis.confidence
            };
            feedback.priority = sentimentAnalysis.priority;
            feedback.aiAnalysis = aiAnalysis;
        }

        feedback.subject = subject || feedback.subject;
        feedback.message = message || feedback.message;
        feedback.updatedAt = new Date();

        await feedback.save();

        res.json({
            message: 'Feedback updated successfully',
            feedback
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update feedback' });
    }
});

// Delete feedback
router.delete('/:id', auth, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        // Check if user owns this feedback or is admin
        if (feedback.user.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await feedback.deleteOne();

        res.json({ message: 'Feedback deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete feedback' });
    }
});

module.exports = router;