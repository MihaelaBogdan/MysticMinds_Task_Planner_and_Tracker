const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function validateLoginInput(data) {
    if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
        return { valid: false, error: 'Email-ul este obligatoriu.' };
    }
    if (!data.password || typeof data.password !== 'string') {
        return { valid: false, error: 'Parola este obligatorie.' };
    }
    return { valid: true };
}

function validateRegisterInput(data) {
    if (!data.username || typeof data.username !== 'string' || !data.username.trim()) {
        return { valid: false, error: 'Username-ul este obligatoriu.' };
    }
    if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
        return { valid: false, error: 'Email-ul este obligatoriu.' };
    }
    if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
        return { valid: false, error: 'Parola trebuie să aibă cel puțin 6 caractere.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return { valid: false, error: 'Formatul email-ului este invalid.' };
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
            return res.status(401).json({ success: false, message: 'Credențiale invalide.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Credențiale invalide.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Autentificare reușită!',
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
        console.error('Eroare la autentificare:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.post('/register', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { username, email, password, role, managerId } = req.body;

        if (!username || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, parolă și rol sunt obligatorii.'
            });
        }

        if (!['manager', 'executor'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Rolul trebuie să fie manager sau executor.'
            });
        }

        if (role === 'executor' && !managerId) {
            return res.status(400).json({
                success: false,
                message: 'Executorii trebuie să aibă un manager atribuit.'
            });
        }

        if (managerId) {
            const manager = await User.findByPk(managerId);
            if (!manager || manager.role !== 'manager') {
                return res.status(400).json({ success: false, message: 'ID manager invalid.' });
            }
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Există deja un utilizator cu acest email.'
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
            message: 'Utilizator creat cu succes!',
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                managerId: user.managerId
            }
        });
    } catch (error) {
        console.error('Eroare la înregistrare:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
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
                message: 'Email-ul managerului este obligatoriu.'
            });
        }

        const manager = await User.findOne({
            where: { email: managerEmail.trim().toLowerCase(), role: 'manager' }
        });

        if (!manager) {
            return res.status(400).json({
                success: false,
                message: 'Nu a fost gasit niciun manager cu acest email. Verifica email-ul sau contacteaza administratorul.'
            });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Exista deja un cont cu acest email.'
            });
        }

        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Acest username este deja folosit.'
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
            message: `Cont creat cu succes! Ai fost alocat managerului ${manager.username}.`,
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
        console.error('Eroare la inregistrare publica:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
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
        console.error('Eroare la obținerea profilului:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

module.exports = router;
