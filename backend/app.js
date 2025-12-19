const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const resourceRoutes = require('./src/routes/resourceRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const feedbackRoutes = require('./src/routes/feedbackRoutes'); // NEW
const analyticsRoutes = require('./src/routes/analyticsRoutes'); // NEW

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes); // This is correct
app.use('/api/feedback', feedbackRoutes); // NEW
app.use('/api/analytics', analyticsRoutes); // NEW

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'IEHA Backend is running' });
});

app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API route not found' });
});

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

app.get('*', (req, res) => {
    res.send('IEHA Backend Server is running');
});

module.exports = app;