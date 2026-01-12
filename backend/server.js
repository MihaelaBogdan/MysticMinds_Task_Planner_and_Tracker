require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const statsRoutes = require('./routes/stats');
const commentsRoutes = require('./routes/comments');
const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 5000;

const log = (req, res, next) => {
    console.log("Method:", req.method, "URL:", req.url);
    next();
};

app.use(log);
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Allow any onrender.com subdomain
        if (origin.endsWith('.onrender.com')) {
            return callback(null, true);
        }

        // Allow localhost for development
        if (origin.includes('localhost')) {
            return callback(null, true);
        }

        // Allow CLIENT_URL if set
        if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
            return callback(null, true);
        }

        callback(null, true); // Allow all origins for now (can restrict later)
    },
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
        message: 'TaskFlow API is working!',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            tasks: '/api/tasks',
            stats: '/api/stats',
            comments: '/api/comments',
            search: '/api/search'
        }
    });
});

const { User, Task, Comment } = require('./models');
const { Op } = require('sequelize');

app.get('/api/debug/users', async (req, res) => {
    const users = await User.findAll({
        attributes: ['id', 'username', 'email', 'role', 'managerId', 'createdAt'],
        include: [{ model: User, as: 'manager', attributes: ['id', 'username'] }]
    });
    res.json({ success: true, count: users.length, data: users });
});

app.get('/api/debug/managers', async (req, res) => {
    const managers = await User.findAll({
        where: { role: 'manager' },
        attributes: ['id', 'username', 'email', 'createdAt']
    });
    res.json({ success: true, count: managers.length, data: managers });
});

app.get('/api/debug/executors', async (req, res) => {
    const executors = await User.findAll({
        where: { role: 'executor' },
        attributes: ['id', 'username', 'email', 'managerId', 'createdAt'],
        include: [{ model: User, as: 'manager', attributes: ['id', 'username'] }]
    });
    res.json({ success: true, count: executors.length, data: executors });
});

app.get('/api/debug/tasks', async (req, res) => {
    const tasks = await Task.findAll({
        include: [
            { model: User, as: 'creator', attributes: ['id', 'username'] },
            { model: User, as: 'assignee', attributes: ['id', 'username'] }
        ],
        order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: tasks.length, data: tasks });
});

app.get('/api/debug/tasks/status/:status', async (req, res) => {
    const tasks = await Task.findAll({
        where: { status: req.params.status.toUpperCase() },
        include: [
            { model: User, as: 'creator', attributes: ['id', 'username'] },
            { model: User, as: 'assignee', attributes: ['id', 'username'] }
        ]
    });
    res.json({ success: true, status: req.params.status.toUpperCase(), count: tasks.length, data: tasks });
});

app.get('/api/debug/tasks/:id', async (req, res) => {
    const task = await Task.findByPk(req.params.id, {
        include: [
            { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
            { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] },
            { model: Comment, as: 'comments', include: [{ model: User, as: 'author', attributes: ['id', 'username'] }] }
        ]
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
});

app.get('/api/debug/stats', async (req, res) => {
    const totalUsers = await User.count();
    const managers = await User.count({ where: { role: 'manager' } });
    const executors = await User.count({ where: { role: 'executor' } });
    const totalTasks = await Task.count();
    const tasksByStatus = {
        OPEN: await Task.count({ where: { status: 'OPEN' } }),
        PENDING: await Task.count({ where: { status: 'PENDING' } }),
        COMPLETED: await Task.count({ where: { status: 'COMPLETED' } }),
        CLOSED: await Task.count({ where: { status: 'CLOSED' } })
    };
    res.json({ success: true, data: { totalUsers, managers, executors, totalTasks, tasksByStatus } });
});

app.get('/api/debug/comments', async (req, res) => {
    const comments = await Comment.findAll({
        include: [
            { model: User, as: 'author', attributes: ['id', 'username'] },
            { model: Task, as: 'task', attributes: ['id', 'title'] }
        ],
        order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: comments.length, data: comments });
});

app.get('/api/debug/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ success: false, message: 'Use ?q=search_term' });
    const tasks = await Task.findAll({
        where: {
            [Op.or]: [
                { title: { [Op.like]: `%${q}%` } },
                { description: { [Op.like]: `%${q}%` } }
            ]
        },
        include: [
            { model: User, as: 'creator', attributes: ['id', 'username'] },
            { model: User, as: 'assignee', attributes: ['id', 'username'] }
        ]
    });
    res.json({ success: true, query: q, count: tasks.length, data: tasks });
});

app.get('/api/docs', (req, res) => {
    res.json({
        success: true,
        message: 'TaskFlow Documentation',

        endpoints: [
            { method: 'POST', path: '/api/auth/login', description: 'User authentication', access: 'Public' },
            { method: 'POST', path: '/api/auth/register', description: 'Create user', access: 'Admin' },
            { method: 'GET', path: '/api/auth/me', description: 'Get current user', access: 'Private' },
            { method: 'GET', path: '/api/users', description: 'Get all users', access: 'Admin' },
            { method: 'GET', path: '/api/users/managers', description: 'Get all managers', access: 'Admin' },
            { method: 'GET', path: '/api/users/executors', description: 'Get manager executors', access: 'Manager' },
            { method: 'GET', path: '/api/users/:id', description: 'Get user by ID', access: 'Admin' },
            { method: 'DELETE', path: '/api/users/:id', description: 'Delete user', access: 'Admin' },
            { method: 'POST', path: '/api/tasks', description: 'Create task', access: 'Manager' },
            { method: 'GET', path: '/api/tasks', description: 'Get tasks (filtered)', access: 'Private' },
            { method: 'GET', path: '/api/tasks/history', description: 'Get task history', access: 'Private' },
            { method: 'GET', path: '/api/tasks/executor/:id/history', description: 'Get executor history', access: 'Manager' },
            { method: 'GET', path: '/api/tasks/:id', description: 'Get task by ID', access: 'Private' },
            { method: 'PUT', path: '/api/tasks/:id', description: 'Update task', access: 'Manager' },
            { method: 'PATCH', path: '/api/tasks/:id/assign', description: 'Assign task', access: 'Manager' },
            { method: 'PATCH', path: '/api/tasks/:id/complete', description: 'Complete task', access: 'Executor' },
            { method: 'PATCH', path: '/api/tasks/:id/close', description: 'Close task', access: 'Manager' },
            { method: 'DELETE', path: '/api/tasks/:id', description: 'Delete task', access: 'Manager' },
            { method: 'GET', path: '/api/stats/dashboard', description: 'Dashboard statistics', access: 'Private' },
            { method: 'GET', path: '/api/stats/tasks/by-status', description: 'Tasks by status', access: 'Manager/Admin' },
            { method: 'GET', path: '/api/stats/tasks/by-priority', description: 'Tasks by priority', access: 'Manager/Admin' },
            { method: 'GET', path: '/api/stats/team-performance', description: 'Team metrics', access: 'Manager' },
            { method: 'GET', path: '/api/stats/overdue', description: 'Overdue tasks', access: 'Private' },
            { method: 'GET', path: '/api/comments/task/:taskId', description: 'Get task comments', access: 'Private' },
            { method: 'POST', path: '/api/comments', description: 'Add comment', access: 'Private' },
            { method: 'PUT', path: '/api/comments/:id', description: 'Update comment', access: 'Owner' },
            { method: 'DELETE', path: '/api/comments/:id', description: 'Delete comment', access: 'Owner/Admin' },
            { method: 'GET', path: '/api/search/tasks', description: 'Search tasks', access: 'Private' },
            { method: 'GET', path: '/api/search/users', description: 'Search users', access: 'Admin' },
            { method: 'GET', path: '/api/search/my-team', description: 'Search team', access: 'Manager' }
        ]
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found.',
        hint: 'Visit /api/docs for available endpoints'
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error.'
    });
});

const startServer = async () => {
    try {
        await sequelize.sync();
        console.log('Database connected and synchronized!');

        app.listen(PORT, () => {
            console.log('TaskFlow');
            console.log(`Server started on port ${PORT}`);
            console.log(`http://localhost:${PORT}`);
            console.log(`Health: http://localhost:${PORT}/api/health`);
            console.log(`Docs: http://localhost:${PORT}/api/docs`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
};

startServer();
