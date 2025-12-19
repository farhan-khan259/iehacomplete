const Event = require('../models/Event');

// @desc    Get all events
// @route   GET /api/events
// @access  Private
const getEvents = async (req, res) => {
    try {
        const { status, eventType, search, page = 1, limit = 10 } = req.query;
        const query = {};

        // Filter by status
        if (status) {
            query.status = status;
        } else {
            query.status = 'upcoming'; // Default to upcoming events
        }

        // Filter by event type
        if (eventType) {
            query.eventType = eventType;
        }

        // Search functionality
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } },
            ];
        }

        const events = await Event.find(query)
            .sort({ startDate: 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('organizer', 'fullName email');

        const total = await Event.countDocuments(query);

        res.json({
            events,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            totalEvents: total,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Private
const getEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'fullName email profilePicture');

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create event
// @route   POST /api/events
// @access  Private/Admin
const createEvent = async (req, res) => {
    try {
        const {
            title,
            description,
            location,
            venue,
            eventType,
            startDate,
            endDate,
            startTime,
            endTime,
            price,
            currency,
            maxAttendees,
            registrationLink,
            tags,
            requirements,
            schedule,
        } = req.body;

        // Parse schedule if provided
        let parsedSchedule = [];
        if (schedule) {
            parsedSchedule = JSON.parse(schedule);
        }

        // Parse tags if provided
        let parsedTags = [];
        if (tags) {
            parsedTags = tags.split(',');
        }

        // Parse requirements if provided
        let parsedRequirements = [];
        if (requirements) {
            parsedRequirements = requirements.split(',');
        }

        // If req.user.id isn't a valid MongoDB ObjectId (e.g. admin token), don't set organizer
        const isValidObjectId = req.user && req.user.id && typeof req.user.id === 'string' && req.user.id.length === 24;
        const organizerId = isValidObjectId ? req.user.id : null;

        // If endDate/endTime not provided, default them to start values to satisfy schema requirements
        const finalEndDate = endDate || startDate;
        const finalEndTime = endTime || startTime;

        const event = await Event.create({
            title,
            description,
            location,
            venue,
            eventType,
            startDate,
            endDate: finalEndDate,
            startTime,
            endTime: finalEndTime,
            price: price || 0,
            currency: currency || 'USD',
            maxAttendees: maxAttendees || 0,
            registrationLink,
            organizer: organizerId,
            tags: parsedTags,
            requirements: parsedRequirements,
            schedule: parsedSchedule,
            featuredImage: req.file ? `/uploads/events/${req.file.filename}` : '',
        });

        res.status(201).json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private/Admin
const updateEvent = async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const {
            title,
            description,
            location,
            venue,
            eventType,
            startDate,
            endDate,
            startTime,
            endTime,
            price,
            currency,
            maxAttendees,
            status,
            registrationLink,
            tags,
            requirements,
            schedule,
        } = req.body;

        // Update fields
        event.title = title || event.title;
        event.description = description || event.description;
        event.location = location || event.location;
        event.venue = venue || event.venue;
        event.eventType = eventType || event.eventType;
        event.startDate = startDate || event.startDate;
        event.endDate = endDate || event.endDate;
        event.startTime = startTime || event.startTime;
        event.endTime = endTime || event.endTime;
        event.price = price || event.price;
        event.currency = currency || event.currency;
        event.maxAttendees = maxAttendees || event.maxAttendees;
        event.status = status || event.status;
        event.registrationLink = registrationLink || event.registrationLink;

        if (tags) {
            event.tags = tags.split(',');
        }

        if (requirements) {
            event.requirements = requirements.split(',');
        }

        if (schedule) {
            event.schedule = JSON.parse(schedule);
        }

        if (req.file) {
            event.featuredImage = `/uploads/events/${req.file.filename}`;
        }

        const updatedEvent = await event.save();

        res.json(updatedEvent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private/Admin
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        await event.deleteOne();

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Private
const registerForEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if event is full
        if (event.maxAttendees > 0 && event.currentAttendees >= event.maxAttendees) {
            return res.status(400).json({ message: 'Event is full' });
        }

        // Check if event is completed or cancelled
        if (event.status === 'completed' || event.status === 'cancelled') {
            return res.status(400).json({ message: 'Event is not available for registration' });
        }

        // Increment attendee count
        event.currentAttendees += 1;
        await event.save();

        res.json({
            message: 'Successfully registered for event',
            registrationLink: event.registrationLink || '',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get event statistics
// @route   GET /api/events/stats
// @access  Private/Admin
// @desc    Get event statistics
// @route   GET /api/events/stats
// @access  Private/Admin
const getEventStats = async (req, res) => {
    try {
        console.log('GET /api/events/stats called by:', req.user ? `${req.user.email || req.user.fullName || req.user.id} (role=${req.user.role})` : 'unauthenticated');
        let stats = [];
        let totalEvents = 0;
        let upcomingEvents = 0;
        let ongoingEvents = 0;
        let completedEvents = 0;
        let cancelledEvents = 0;
        let totalAttendees = 0;
        let eventsByType = [];

        try {
            stats = await Event.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAttendees: { $sum: '$currentAttendees' },
                        totalRevenue: { $sum: { $multiply: ['$price', '$currentAttendees'] } },
                    },
                },
                {
                    $sort: { count: -1 },
                },
            ]);

            totalEvents = await Event.countDocuments();
            upcomingEvents = await Event.countDocuments({ status: 'upcoming' });
            ongoingEvents = await Event.countDocuments({ status: 'ongoing' });
            completedEvents = await Event.countDocuments({ status: 'completed' });
            cancelledEvents = await Event.countDocuments({ status: 'cancelled' });

            const totalAttAggregate = await Event.aggregate([
                { $group: { _id: null, total: { $sum: '$currentAttendees' } } },
            ]);
            totalAttendees = totalAttAggregate[0]?.total || 0;

            // Events by type
            eventsByType = await Event.aggregate([
                { $group: { _id: '$eventType', count: { $sum: 1 } } }
            ]);
        } catch (aggErr) {
            // Aggregation failed (possibly due to bad data types). Fall back to safe JS-based counts.
            console.error('Event stats aggregation failed, falling back to JS counts:', aggErr);

            const allEvents = await Event.find({}).lean();
            totalEvents = allEvents.length;
            upcomingEvents = allEvents.filter(e => e.status === 'upcoming').length;
            ongoingEvents = allEvents.filter(e => e.status === 'ongoing').length;
            completedEvents = allEvents.filter(e => e.status === 'completed').length;
            cancelledEvents = allEvents.filter(e => e.status === 'cancelled').length;

            totalAttendees = allEvents.reduce((sum, e) => sum + (Number(e.currentAttendees) || 0), 0);

            // Build minimal stats by status and eventsByType
            const statusMap = {};
            const typeMap = {};
            allEvents.forEach(e => {
                const st = e.status || 'unknown';
                statusMap[st] = (statusMap[st] || 0) + 1;
                const tp = e.eventType || 'unknown';
                typeMap[tp] = (typeMap[tp] || 0) + 1;
            });
            stats = Object.keys(statusMap).map(k => ({ _id: k, count: statusMap[k] }));
            eventsByType = Object.keys(typeMap).map(k => ({ _id: k, count: typeMap[k] }));
        }

        res.json({
            success: true,
            totalEvents,
            upcomingEvents,
            ongoingEvents,
            completedEvents,
            cancelledEvents,
            totalAttendees,
            stats,
            eventsByType
        });
    } catch (error) {
        console.error('GetEventStats error:', error && error.stack ? error.stack : error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? (error.message || error.toString()) : undefined
        });
    }
};

module.exports = {
    getEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    registerForEvent,
    getEventStats,
};

// Admin-only diagnostic: list events and show types for key numeric fields
const debugEvents = async (req, res) => {
    try {
        const events = await Event.find({}).lean();
        const sample = events.slice(0, 50).map(e => ({
            _id: e._id,
            title: e.title,
            status: e.status,
            eventType: e.eventType,
            price: e.price,
            priceType: typeof e.price,
            currentAttendees: e.currentAttendees,
            currentAttendeesType: typeof e.currentAttendees,
            startDate: e.startDate,
            endDate: e.endDate,
        }));

        return res.json({ success: true, totalEvents: events.length, sample });
    } catch (err) {
        console.error('debugEvents error:', err);
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// attach debugEvents export
module.exports.debugEvents = debugEvents;