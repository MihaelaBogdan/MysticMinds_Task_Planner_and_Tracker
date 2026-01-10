const express = require('express');
const { Op } = require('sequelize');
const { Task, User, sequelize } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticate, async (req, res) => {
    try {
        let stats = {};

        if (req.user.role === 'admin') {
            const totalUsers = await User.count();
            const managers = await User.count({ where: { role: 'manager' } });
            const executors = await User.count({ where: { role: 'executor' } });
            const totalTasks = await Task.count();
            const openTasks = await Task.count({ where: { status: 'OPEN' } });
            const completedTasks = await Task.count({ where: { status: { [Op.in]: ['COMPLETED', 'CLOSED'] } } });

            stats = {
                totalUsers,
                managers,
                executors,
                totalTasks,
                openTasks,
                completedTasks,
                completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
            };
        } else if (req.user.role === 'manager') {
            const teamSize = await User.count({ where: { managerId: req.user.id } });
            const myTasks = await Task.count({ where: { createdById: req.user.id } });
            const openTasks = await Task.count({ where: { createdById: req.user.id, status: 'OPEN' } });
            const pendingTasks = await Task.count({ where: { createdById: req.user.id, status: 'PENDING' } });
            const completedTasks = await Task.count({ where: { createdById: req.user.id, status: 'COMPLETED' } });
            const closedTasks = await Task.count({ where: { createdById: req.user.id, status: 'CLOSED' } });

            stats = {
                teamSize,
                myTasks,
                openTasks,
                pendingTasks,
                completedTasks,
                closedTasks,
                completionRate: myTasks > 0 ? Math.round(((completedTasks + closedTasks) / myTasks) * 100) : 0
            };
        } else {
            const assignedTasks = await Task.count({ where: { assignedToId: req.user.id } });
            const pendingTasks = await Task.count({ where: { assignedToId: req.user.id, status: 'PENDING' } });
            const completedTasks = await Task.count({ where: { assignedToId: req.user.id, status: { [Op.in]: ['COMPLETED', 'CLOSED'] } } });

            stats = {
                assignedTasks,
                pendingTasks,
                completedTasks,
                completionRate: assignedTasks > 0 ? Math.round((completedTasks / assignedTasks) * 100) : 0
            };
        }

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Eroare la statistici:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.get('/tasks/by-status', authenticate, authorize('admin', 'manager'), async (req, res) => {
    try {
        let whereClause = {};
        if (req.user.role === 'manager') {
            whereClause.createdById = req.user.id;
        }

        const statuses = ['OPEN', 'PENDING', 'COMPLETED', 'CLOSED'];
        const counts = {};

        for (const status of statuses) {
            counts[status] = await Task.count({ where: { ...whereClause, status } });
        }

        res.json({ success: true, data: counts });
    } catch (error) {
        console.error('Eroare la task-uri după status:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.get('/tasks/by-priority', authenticate, authorize('admin', 'manager'), async (req, res) => {
    try {
        let whereClause = {};
        if (req.user.role === 'manager') {
            whereClause.createdById = req.user.id;
        }

        const priorities = ['low', 'medium', 'high'];
        const counts = {};

        for (const priority of priorities) {
            counts[priority] = await Task.count({ where: { ...whereClause, priority } });
        }

        res.json({ success: true, data: counts });
    } catch (error) {
        console.error('Eroare la task-uri după prioritate:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.get('/team-performance', authenticate, authorize('manager'), async (req, res) => {
    try {
        const executors = await User.findAll({
            where: { managerId: req.user.id },
            attributes: ['id', 'username', 'email']
        });

        const performance = await Promise.all(executors.map(async (exec) => {
            const total = await Task.count({ where: { assignedToId: exec.id } });
            const completed = await Task.count({
                where: {
                    assignedToId: exec.id,
                    status: { [Op.in]: ['COMPLETED', 'CLOSED'] }
                }
            });
            const pending = await Task.count({ where: { assignedToId: exec.id, status: 'PENDING' } });

            return {
                id: exec.id,
                username: exec.username,
                email: exec.email,
                totalTasks: total,
                completedTasks: completed,
                pendingTasks: pending,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
            };
        }));

        res.json({ success: true, data: performance });
    } catch (error) {
        console.error('Eroare la performanța echipei:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.get('/overdue', authenticate, async (req, res) => {
    try {
        let whereClause = {
            dueDate: { [Op.lt]: new Date() },
            status: { [Op.in]: ['OPEN', 'PENDING'] }
        };

        if (req.user.role === 'manager') {
            whereClause.createdById = req.user.id;
        } else if (req.user.role === 'executor') {
            whereClause.assignedToId = req.user.id;
        }

        const count = await Task.count({ where: whereClause });
        const tasks = await Task.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username'] },
                { model: User, as: 'assignee', attributes: ['id', 'username'] }
            ],
            order: [['dueDate', 'ASC']],
            limit: 10
        });

        res.json({ success: true, data: { count, tasks } });
    } catch (error) {
        console.error('Eroare la task-uri depășite:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

module.exports = router;
