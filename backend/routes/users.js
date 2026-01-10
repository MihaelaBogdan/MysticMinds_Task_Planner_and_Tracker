const express = require('express');
const { User, Task } = require('../models');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const checkId = (req, res, next) => {
    if (req.params.id && isNaN(req.params.id)) {
        res.status(400).json({ success: false, message: "ID invalid" });
    } else {
        next();
    }
};

router.get('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            include: [{
                model: User,
                as: 'manager',
                attributes: ['id', 'username', 'email']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Eroare la obținerea utilizatorilor:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.get('/managers', authenticate, authorize('admin'), async (req, res) => {
    try {
        const managers = await User.findAll({
            where: { role: 'manager' },
            attributes: { exclude: ['password'] },
            order: [['username', 'ASC']]
        });

        res.json({ success: true, data: managers });
    } catch (error) {
        console.error('Eroare la obținerea managerilor:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.get('/executors', authenticate, authorize('manager'), async (req, res) => {
    try {
        const executors = await User.findAll({
            where: {
                role: 'executor',
                managerId: req.user.id
            },
            attributes: { exclude: ['password'] },
            order: [['username', 'ASC']]
        });

        res.json({ success: true, data: executors });
    } catch (error) {
        console.error('Eroare la obținerea executorilor:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.route('/:id')
    .get(authenticate, authorize('admin'), checkId, async (req, res) => {
        try {
            const user = await User.findByPk(req.params.id, {
                attributes: { exclude: ['password'] },
                include: [{
                    model: User,
                    as: 'manager',
                    attributes: ['id', 'username', 'email']
                }]
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'Utilizatorul nu a fost găsit.' });
            }

            res.json({ success: true, data: user });
        } catch (error) {
            console.error('Eroare la obținerea utilizatorului:', error);
            res.status(500).json({ success: false, message: 'Eroare la server.' });
        }
    })
    .delete(authenticate, authorize('admin'), checkId, async (req, res) => {
        try {
            const user = await User.findByPk(req.params.id);

            if (!user) {
                return res.status(404).json({ success: false, message: 'Utilizatorul nu a fost găsit.' });
            }

            if (user.role === 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Nu poți șterge utilizatorul admin.'
                });
            }

            // Delete tasks created by or assigned to this user to avoid FK constraints
            await Task.destroy({ where: { [Op.or]: [{ createdById: user.id }, { assignedToId: user.id }] } });

            await user.destroy();
            res.json({ success: true, message: 'Utilizator și task-urile asociate șterse cu succes.' });
        } catch (error) {
            console.error('Eroare la ștergerea utilizatorului:', error);
            res.status(500).json({ success: false, message: 'Eroare la server.' });
        }
    });

router.patch('/:id/reassign', authenticate, authorize('admin'), checkId, async (req, res) => {
    try {
        const { managerId } = req.body;
        const executor = await User.findByPk(req.params.id);

        if (!executor) {
            return res.status(404).json({ success: false, message: 'Utilizatorul nu a fost gasit.' });
        }

        if (executor.role !== 'executor') {
            return res.status(400).json({ success: false, message: 'Doar executorii pot fi reasignati.' });
        }

        const newManager = await User.findByPk(managerId);
        if (!newManager || newManager.role !== 'manager') {
            return res.status(400).json({ success: false, message: 'Manager invalid.' });
        }

        executor.managerId = managerId;
        await executor.save();

        res.json({ success: true, message: 'Executor reasignat cu succes.' });
    } catch (error) {
        console.error('Eroare la reasignare:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});


router.get('/:id/tasks', authenticate, authorize('admin'), checkId, async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilizatorul nu a fost gasit.' });
        }

        let whereClause = {};

        if (user.role === 'manager') {
            whereClause.createdById = userId;
        } else if (user.role === 'executor') {
            whereClause[Op.or] = [
                { assignedToId: userId },
                { createdById: userId }
            ];
        }

        const tasks = await Task.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, data: tasks });
    } catch (error) {
        console.error('Eroare la obtinerea task-urilor utilizatorului:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

module.exports = router;
