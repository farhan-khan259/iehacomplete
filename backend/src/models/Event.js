const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
    },
    venue: {
        type: String,
        default: '',
    },
    eventType: {
        type: String,
        enum: ['online', 'in-person', 'hybrid'],
        default: 'online',
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required'],
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required'],
    },
    startTime: {
        type: String,
        required: [true, 'Start time is required'],
    },
    endTime: {
        type: String,
        required: [true, 'End time is required'],
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    featuredImage: {
        type: String,
        default: '',
    },
    price: {
        type: Number,
        default: 0,
    },
    currency: {
        type: String,
        default: 'USD',
    },
    maxAttendees: {
        type: Number,
        default: 0,
    },
    currentAttendees: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming',
    },
    registrationLink: {
        type: String,
        default: '',
    },
    tags: [{
        type: String,
    }],
    requirements: [{
        type: String,
    }],
    schedule: [{
        time: String,
        activity: String,
        speaker: String,
    }],
}, {
    timestamps: true,
});

module.exports = mongoose.model('Event', eventSchema);