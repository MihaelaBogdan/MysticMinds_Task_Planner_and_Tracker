const express = require('express');
const cors = require('cors');

// Simple in-memory storage for serverless (data will reset on cold starts)
let users = [
    { id: 1, username: 'admin', email: 'admin@taskflow.com', password: '$2a$10$rGn6TwJqTH3NxJf0ZY.xyO4gXBIzLxPxvLHXxJxvxJxvxJxvxJxvx', role: 'admin' },
    { id: 2, username: 'manager1', email: 'manager@taskflow.com', password: '$2a$10$rGn6TwJqTH3NxJf0ZY.xyO4gXBIzLxPxvLHXxJxvxJxvxJxvxJxvx', role: 'manager' },
    { id: 3, username: 'executor1', email: 'executor@taskflow.com', password: '$2a$10$rGn6TwJqTH3NxJf0ZY.xyO4gXBIzLxPxvLHXxJxvxJxvxJxvxJxvx', role: 'executor', managerId: 2 }
];
let tasks = [];
let taskIdCounter = 1;

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'TaskFlow API is working!', timestamp: new Date().toISOString() });
});

// Simple JWT simulation (for demo purposes)
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// Auth middleware
const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = users.find(u => u.id === decoded.id);
        if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        // For demo, accept any password or check bcrypt
        const isMatch = password === 'admin123' || password === 'password123' || await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get current user
app.get('/api/auth/me', auth, (req, res) => {
    const { password, ...user } = req.user;
    res.json({ success: true, user });
});

// Get tasks
app.get('/api/tasks', auth, (req, res) => {
    let userTasks = tasks;
    if (req.user.role === 'executor') {
        userTasks = tasks.filter(t => t.assignedToId === req.user.id || t.createdById === req.user.id);
    } else if (req.user.role === 'manager') {
        userTasks = tasks.filter(t => t.createdById === req.user.id || t.assignedToId === req.user.id);
    }
    res.json({ success: true, tasks: userTasks });
});

// Create task
app.post('/api/tasks', auth, (req, res) => {
    const task = {
        id: taskIdCounter++,
        ...req.body,
        createdById: req.user.id,
        status: 'OPEN',
        createdAt: new Date().toISOString()
    };
    tasks.push(task);
    res.json({ success: true, task });
});

// Update task status
app.patch('/api/tasks/:id/complete', auth, (req, res) => {
    const task = tasks.find(t => t.id === parseInt(req.params.id));
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    task.status = 'COMPLETED';
    res.json({ success: true, task });
});

// Get users
app.get('/api/users', auth, (req, res) => {
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json({ success: true, users: safeUsers });
});

app.get('/api/users/executors', auth, (req, res) => {
    const executors = users.filter(u => u.role === 'executor').map(({ password, ...u }) => u);
    res.json({ success: true, executors });
});

app.get('/api/users/managers', auth, (req, res) => {
    const managers = users.filter(u => u.role === 'manager').map(({ password, ...u }) => u);
    res.json({ success: true, managers });
});

// Catch all
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
});

module.exports = app;
