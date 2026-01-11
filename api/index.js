require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('../backend/models');

const authRoutes = require('../backend/routes/auth');
const userRoutes = require('../backend/routes/users');
const taskRoutes = require('../backend/routes/tasks');
const statsRoutes = require('../backend/routes/stats');
const commentsRoutes = require('../backend/routes/comments');
const searchRoutes = require('../backend/routes/search');

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/search', searchRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '🎀 TaskFlow API is working on Vercel!',
        timestamp: new Date().toISOString()
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found.'
    });
});

// Sync database on cold start
let dbSynced = false;
const syncDb = async () => {
    if (!dbSynced) {
        try {
            await sequelize.sync();
            dbSynced = true;
        } catch (err) {
            console.error('DB sync error:', err);
        }
    }
};

module.exports = async (req, res) => {
    await syncDb();
    return app(req, res);
};
