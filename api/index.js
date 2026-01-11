const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'mystic_minds_secret_key_2024';

// In-memory storage for serverless (data will reset on cold starts)
let users = [
    { id: 1, username: 'admin', email: 'admin@taskflow.com', password: '$2a$10$rGn6TwJqTH3NxJf0ZY.xyO4gXBIzLxPxvLHXxJxvxJxvxJxvxJxvx', role: 'admin', managerId: null, createdAt: new Date().toISOString() },
    { id: 2, username: 'manager1', email: 'manager@taskflow.com', password: '$2a$10$rGn6TwJqTH3NxJf0ZY.xyO4gXBIzLxPxvLHXxJxvxJxvxJxvxJxvx', role: 'manager', managerId: null, createdAt: new Date().toISOString() },
    { id: 3, username: 'executor1', email: 'executor@taskflow.com', password: '$2a$10$rGn6TwJqTH3NxJf0ZY.xyO4gXBIzLxPxvLHXxJxvxJxvxJxvxJxvx', role: 'executor', managerId: 2, createdAt: new Date().toISOString() }
];
let tasks = [];
let comments = [];
let taskIdCounter = 1;
let userIdCounter = 4;
let commentIdCounter = 1;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ===== HELPER FUNCTIONS =====
const getUser = (id) => users.find(u => u.id === parseInt(id));
const getUserByEmail = (email) => users.find(u => u.email === email);
const getTask = (id) => tasks.find(t => t.id === parseInt(id));

const enrichTask = (task) => {
    const creator = getUser(task.createdById);
    const assignee = task.assignedToId ? getUser(task.assignedToId) : null;
    return {
        ...task,
        creator: creator ? { id: creator.id, username: creator.username, email: creator.email } : null,
        assignee: assignee ? { id: assignee.id, username: assignee.username, email: assignee.email } : null
    };
};

const enrichUser = (user) => {
    const manager = user.managerId ? getUser(user.managerId) : null;
    const { password, ...safeUser } = user;
    return {
        ...safeUser,
        manager: manager ? { id: manager.id, username: manager.username, email: manager.email } : null
    };
};

// ===== AUTH MIDDLEWARE =====
const authenticate = (req, res, next) => {
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

const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    next();
};

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'TaskFlow API is working!', timestamp: new Date().toISOString() });
});

// ===== AUTH ROUTES =====
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const user = users.find(u => u.email === email);
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        // For demo, accept common passwords or check bcrypt
        const isMatch = password === 'admin123' || password === 'password123' || await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        const manager = user.managerId ? getUser(user.managerId) : null;
        res.json({
            success: true,
            message: 'Authentication successful!',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    manager: manager ? { id: manager.id, username: manager.username, email: manager.email } : null
                }
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.post('/api/auth/register', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { username, email, password, role, managerId } = req.body;

        if (!username || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'Username, email, password and role are required.' });
        }

        if (!['manager', 'executor'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Role must be manager or executor.' });
        }

        if (role === 'executor' && !managerId) {
            return res.status(400).json({ success: false, message: 'Executors must have an assigned manager.' });
        }

        if (managerId) {
            const manager = getUser(managerId);
            if (!manager || manager.role !== 'manager') {
                return res.status(400).json({ success: false, message: 'Invalid manager ID.' });
            }
        }

        const existingUser = getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: userIdCounter++,
            username,
            email,
            password: hashedPassword,
            role,
            managerId: role === 'executor' ? parseInt(managerId) : null,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);

        res.status(201).json({
            success: true,
            message: 'User created successfully!',
            data: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role, managerId: newUser.managerId }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.post('/api/auth/register/public', async (req, res) => {
    try {
        const { username, email, password, managerEmail } = req.body;

        if (!username || !email || !password || !managerEmail) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const manager = users.find(u => u.email === managerEmail && u.role === 'manager');
        if (!manager) {
            return res.status(400).json({ success: false, message: 'No manager found with this email.' });
        }

        if (getUserByEmail(email)) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: userIdCounter++,
            username,
            email,
            password: hashedPassword,
            role: 'executor',
            managerId: manager.id,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);

        res.status(201).json({
            success: true,
            message: `Account created successfully! You have been assigned to manager ${manager.username}.`,
            data: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role, managerId: manager.id, managerName: manager.username }
        });
    } catch (err) {
        console.error('Public register error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.get('/api/auth/me', authenticate, (req, res) => {
    res.json({ success: true, data: enrichUser(req.user) });
});

// ===== USER ROUTES =====
app.get('/api/users', authenticate, authorize('admin'), (req, res) => {
    const safeUsers = users.map(enrichUser);
    res.json({ success: true, data: safeUsers });
});

app.get('/api/users/managers', authenticate, (req, res) => {
    const managers = users.filter(u => u.role === 'manager').map(enrichUser);
    res.json({ success: true, data: managers });
});

app.get('/api/users/executors', authenticate, (req, res) => {
    let executors;
    if (req.user.role === 'manager') {
        executors = users.filter(u => u.role === 'executor' && u.managerId === req.user.id);
    } else {
        executors = users.filter(u => u.role === 'executor');
    }
    res.json({ success: true, data: executors.map(enrichUser) });
});

app.get('/api/users/:id', authenticate, authorize('admin'), (req, res) => {
    const user = getUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: enrichUser(user) });
});

app.delete('/api/users/:id', authenticate, authorize('admin'), (req, res) => {
    const userId = parseInt(req.params.id);
    const user = getUser(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot delete admin user.' });

    // Delete associated tasks
    tasks = tasks.filter(t => t.createdById !== userId && t.assignedToId !== userId);
    // Delete user
    users = users.filter(u => u.id !== userId);

    res.json({ success: true, message: 'User and associated tasks deleted successfully.' });
});

app.patch('/api/users/:id/promote', authenticate, authorize('admin'), (req, res) => {
    const user = getUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role !== 'executor') return res.status(400).json({ success: false, message: 'Only executors can be promoted.' });

    user.role = 'manager';
    user.managerId = null;
    res.json({ success: true, message: 'User promoted to manager successfully.', data: enrichUser(user) });
});

app.patch('/api/users/:id/reassign', authenticate, authorize('admin'), (req, res) => {
    const { managerId } = req.body;
    const user = getUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role !== 'executor') return res.status(400).json({ success: false, message: 'Only executors can be reassigned.' });

    const newManager = getUser(managerId);
    if (!newManager || newManager.role !== 'manager') return res.status(400).json({ success: false, message: 'Invalid manager.' });

    user.managerId = parseInt(managerId);
    res.json({ success: true, message: 'Executor reassigned successfully.', data: enrichUser(user) });
});

app.get('/api/users/:id/tasks', authenticate, authorize('admin'), (req, res) => {
    const userId = parseInt(req.params.id);
    const user = getUser(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    let userTasks;
    if (user.role === 'manager') {
        userTasks = tasks.filter(t => t.createdById === userId);
    } else {
        userTasks = tasks.filter(t => t.assignedToId === userId || t.createdById === userId);
    }

    res.json({ success: true, data: userTasks.map(enrichTask) });
});

// ===== TASK ROUTES =====
app.get('/api/tasks', authenticate, (req, res) => {
    const { status, priority, view } = req.query;
    let userTasks = tasks;

    if (req.user.role === 'manager') {
        const executorIds = users.filter(u => u.managerId === req.user.id).map(u => u.id);
        userTasks = tasks.filter(t => t.createdById === req.user.id || executorIds.includes(t.assignedToId));
    } else if (req.user.role === 'executor') {
        if (view === 'created') {
            userTasks = tasks.filter(t => t.createdById === req.user.id);
        } else if (view === 'assigned') {
            userTasks = tasks.filter(t => t.assignedToId === req.user.id);
        } else {
            userTasks = tasks.filter(t => t.assignedToId === req.user.id || t.createdById === req.user.id);
        }
    }

    if (status) userTasks = userTasks.filter(t => t.status === status);
    if (priority) userTasks = userTasks.filter(t => t.priority === priority);

    res.json({ success: true, data: userTasks.map(enrichTask) });
});

app.post('/api/tasks', authenticate, authorize('manager', 'executor'), (req, res) => {
    const { title, description, priority, dueDate } = req.body;

    if (!title || !description) {
        return res.status(400).json({ success: false, message: 'Title and description are required.' });
    }

    const task = {
        id: taskIdCounter++,
        title,
        description,
        priority: priority || 'medium',
        dueDate: dueDate || null,
        status: 'OPEN',
        createdById: req.user.id,
        assignedToId: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        closedAt: null
    };
    tasks.push(task);

    res.status(201).json({ success: true, message: 'Task created successfully!', data: enrichTask(task) });
});

app.get('/api/tasks/history', authenticate, (req, res) => {
    let historyTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'CLOSED');

    if (req.user.role === 'manager') {
        historyTasks = historyTasks.filter(t => t.createdById === req.user.id);
    } else if (req.user.role === 'executor') {
        historyTasks = historyTasks.filter(t => t.assignedToId === req.user.id);
    }

    res.json({ success: true, data: historyTasks.map(enrichTask) });
});

app.get('/api/tasks/executor/:executorId/history', authenticate, authorize('manager'), (req, res) => {
    const executorId = parseInt(req.params.executorId);
    const executor = getUser(executorId);

    if (!executor || executor.managerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only view history for your own executors.' });
    }

    const historyTasks = tasks.filter(t => t.assignedToId === executorId && (t.status === 'COMPLETED' || t.status === 'CLOSED'));
    res.json({ success: true, data: historyTasks.map(enrichTask) });
});

app.get('/api/tasks/:id', authenticate, (req, res) => {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    if (req.user.role === 'executor' && task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (req.user.role === 'manager' && task.createdById !== req.user.id) {
        const executorIds = users.filter(u => u.managerId === req.user.id).map(u => u.id);
        if (!executorIds.includes(task.assignedToId)) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
    }

    res.json({ success: true, data: enrichTask(task) });
});

app.put('/api/tasks/:id', authenticate, authorize('manager'), (req, res) => {
    const { title, description, priority, dueDate } = req.body;
    const task = getTask(req.params.id);

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (task.createdById !== req.user.id) return res.status(403).json({ success: false, message: 'You can only update your own tasks.' });
    if (task.status !== 'OPEN') return res.status(400).json({ success: false, message: 'You can only update OPEN tasks.' });

    if (title) task.title = title;
    if (description) task.description = description;
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;

    res.json({ success: true, message: 'Task updated successfully!', data: enrichTask(task) });
});

app.delete('/api/tasks/:id', authenticate, authorize('manager'), (req, res) => {
    const taskId = parseInt(req.params.id);
    const task = getTask(taskId);

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (task.createdById !== req.user.id) return res.status(403).json({ success: false, message: 'You can only delete your own tasks.' });

    tasks = tasks.filter(t => t.id !== taskId);
    res.json({ success: true, message: 'Task deleted successfully.' });
});

app.patch('/api/tasks/:id/assign', authenticate, authorize('manager'), (req, res) => {
    const { assignedToId } = req.body;
    const task = getTask(req.params.id);

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (task.createdById !== req.user.id) return res.status(403).json({ success: false, message: 'You can only assign your own tasks.' });
    if (task.status !== 'OPEN') return res.status(400).json({ success: false, message: 'Only OPEN tasks can be assigned.' });

    const executor = getUser(assignedToId);
    if (!executor || executor.role !== 'executor' || executor.managerId !== req.user.id) {
        return res.status(400).json({ success: false, message: 'Invalid executor. Must be one of your team members.' });
    }

    task.assignedToId = parseInt(assignedToId);
    task.status = 'PENDING';

    res.json({ success: true, message: 'Task assigned successfully!', data: enrichTask(task) });
});

app.patch('/api/tasks/:id/complete', authenticate, (req, res) => {
    const task = getTask(req.params.id);

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    // Allow both executor (assigned) and whoever created it
    if (task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only complete tasks assigned to you or created by you.' });
    }
    if (task.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Only PENDING tasks can be completed.' });

    task.status = 'COMPLETED';
    task.completedAt = new Date().toISOString();

    res.json({ success: true, message: 'Task completed successfully!', data: enrichTask(task) });
});

app.patch('/api/tasks/:id/close', authenticate, authorize('manager'), (req, res) => {
    const task = getTask(req.params.id);

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (task.createdById !== req.user.id) return res.status(403).json({ success: false, message: 'You can only close your own tasks.' });
    if (task.status !== 'COMPLETED') return res.status(400).json({ success: false, message: 'Only COMPLETED tasks can be closed.' });

    task.status = 'CLOSED';
    task.closedAt = new Date().toISOString();

    res.json({ success: true, message: 'Task closed successfully!', data: enrichTask(task) });
});

app.patch('/api/tasks/:id/status', authenticate, (req, res) => {
    const { status } = req.body;
    const validStatuses = ['OPEN', 'PENDING', 'COMPLETED', 'CLOSED'];

    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    if (req.user.role === 'manager' && task.createdById !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only modify your own tasks.' });
    }
    if (req.user.role === 'executor' && task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only modify tasks assigned to you.' });
    }

    if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
        task.completedAt = new Date().toISOString();
    }
    if (status === 'CLOSED' && task.status !== 'CLOSED') {
        task.closedAt = new Date().toISOString();
    }

    task.status = status;
    res.json({ success: true, message: `Status changed to ${status}!`, data: enrichTask(task) });
});

// ===== STATS ROUTES =====
app.get('/api/stats', authenticate, (req, res) => {
    let userTasks = tasks;

    if (req.user.role === 'manager') {
        const executorIds = users.filter(u => u.managerId === req.user.id).map(u => u.id);
        userTasks = tasks.filter(t => t.createdById === req.user.id || executorIds.includes(t.assignedToId));
    } else if (req.user.role === 'executor') {
        userTasks = tasks.filter(t => t.assignedToId === req.user.id || t.createdById === req.user.id);
    }

    const stats = {
        total: userTasks.length,
        open: userTasks.filter(t => t.status === 'OPEN').length,
        pending: userTasks.filter(t => t.status === 'PENDING').length,
        completed: userTasks.filter(t => t.status === 'COMPLETED').length,
        closed: userTasks.filter(t => t.status === 'CLOSED').length
    };

    res.json({ success: true, data: stats });
});

// ===== COMMENTS ROUTES =====
app.get('/api/comments/task/:taskId', authenticate, (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const task = getTask(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const taskComments = comments.filter(c => c.taskId === taskId).map(c => {
        const author = getUser(c.authorId);
        return {
            ...c,
            author: author ? { id: author.id, username: author.username, email: author.email } : null
        };
    });

    res.json({ success: true, data: taskComments });
});

app.post('/api/comments', authenticate, (req, res) => {
    const { taskId, content } = req.body;

    if (!taskId || !content) {
        return res.status(400).json({ success: false, message: 'Task ID and content are required.' });
    }

    const task = getTask(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const comment = {
        id: commentIdCounter++,
        taskId: parseInt(taskId),
        authorId: req.user.id,
        content,
        createdAt: new Date().toISOString()
    };
    comments.push(comment);

    const author = getUser(comment.authorId);
    res.status(201).json({
        success: true,
        message: 'Comment added successfully!',
        data: {
            ...comment,
            author: author ? { id: author.id, username: author.username, email: author.email } : null
        }
    });
});

app.delete('/api/comments/:id', authenticate, (req, res) => {
    const commentId = parseInt(req.params.id);
    const comment = comments.find(c => c.id === commentId);

    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });
    if (comment.authorId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'You can only delete your own comments.' });
    }

    comments = comments.filter(c => c.id !== commentId);
    res.json({ success: true, message: 'Comment deleted successfully.' });
});

// ===== SEARCH ROUTES =====
app.get('/api/search/tasks', authenticate, (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const query = q.toLowerCase();
    let searchResults = tasks.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
    );

    if (req.user.role === 'manager') {
        const executorIds = users.filter(u => u.managerId === req.user.id).map(u => u.id);
        searchResults = searchResults.filter(t => t.createdById === req.user.id || executorIds.includes(t.assignedToId));
    } else if (req.user.role === 'executor') {
        searchResults = searchResults.filter(t => t.assignedToId === req.user.id || t.createdById === req.user.id);
    }

    res.json({ success: true, data: searchResults.map(enrichTask) });
});

// ===== CATCH ALL =====
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
});

module.exports = app;
