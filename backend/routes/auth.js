const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function validateLoginInput(data) {
    if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
        return { valid: false, error: 'Email is required.' };
    }
    if (!data.password || typeof data.password !== 'string') {
        return { valid: false, error: 'Password is required.' };
    }
    return { valid: true };
}

function validateRegisterInput(data) {
    if (!data.username || typeof data.username !== 'string' || !data.username.trim()) {
        return { valid: false, error: 'Username is required.' };
    }
    if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
        return { valid: false, error: 'Email is required.' };
    }
    if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
        return { valid: false, error: 'Password must be at least 6 characters.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return { valid: false, error: 'Invalid email format.' };
    }

    return { valid: true };
}

router.post('/login', async (req, res) => {
    try {
        const validationResult = validateLoginInput(req.body);
        if (!validationResult.valid) {
            return res.status(400).json({ success: false, message: validationResult.error });
        }

        const { email, password } = req.body;

        const user = await User.findOne({
            where: { email },
            include: [{
                model: User,
                as: 'manager',
                attributes: ['id', 'username', 'email']
            }]
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

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
                    manager: user.manager
                }
            }
        });
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/register', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { username, email, password, role, managerId } = req.body;

        if (!username || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, password and role are required.'
            });
        }

        if (!['manager', 'executor'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Role must be manager or executor.'
            });
        }

        if (role === 'executor' && !managerId) {
            return res.status(400).json({
                success: false,
                message: 'Executors must have an assigned manager.'
            });
        }

        if (managerId) {
            const manager = await User.findByPk(managerId);
            if (!manager || manager.role !== 'manager') {
                return res.status(400).json({ success: false, message: 'Invalid manager ID.' });
            }
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists.'
            });
        }

        const user = await User.create({
            username,
            email,
            password,
            role,
            managerId: role === 'executor' ? managerId : null
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully!',
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                managerId: user.managerId
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/register/public', async (req, res) => {
    try {
        const validationResult = validateRegisterInput(req.body);
        if (!validationResult.valid) {
            return res.status(400).json({ success: false, message: validationResult.error });
        }

        const { username, email, password, managerEmail } = req.body;

        if (!managerEmail || typeof managerEmail !== 'string' || !managerEmail.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Manager email is required.'
            });
        }

        const manager = await User.findOne({
            where: { email: managerEmail.trim().toLowerCase(), role: 'manager' }
        });

        if (!manager) {
            return res.status(400).json({
                success: false,
                message: 'No manager found with this email. Please verify the email or contact the administrator.'
            });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'This username is already taken.'
            });
        }

        const user = await User.create({
            username,
            email,
            password,
            role: 'executor',
            managerId: manager.id
        });

        res.status(201).json({
            success: true,
            message: `Account created successfully! You have been assigned to manager ${manager.username}.`,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                managerId: manager.id,
                managerName: manager.username
            }
        });
    } catch (error) {
        console.error('Public registration error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: [{
                model: User,
                as: 'manager',
                attributes: ['id', 'username', 'email']
            }]
        });

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
