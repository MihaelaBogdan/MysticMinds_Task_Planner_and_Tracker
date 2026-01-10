const express = require('express');
const { Op } = require('sequelize');
const { Task, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/tasks', authenticate, async (req, res) => {
    try {
        const { q, status, priority, assignee } = req.query;

        if (!q && !status && !priority && !assignee) {
            return res.status(400).json({
                success: false,
                message: 'Cel puțin un parametru de căutare este necesar.'
            });
        }

        let whereClause = {};

        if (req.user.role === 'manager') {
            whereClause.createdById = req.user.id;
        } else if (req.user.role === 'executor') {
            whereClause.assignedToId = req.user.id;
        }

        if (q) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${q}%` } },
                { description: { [Op.like]: `%${q}%` } }
            ];
        }

        if (status) {
            whereClause.status = status;
        }

        if (priority) {
            whereClause.priority = priority;
        }

        if (assignee && req.user.role === 'manager') {
            whereClause.assignedToId = assignee;
        }

        const tasks = await Task.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        res.json({ success: true, data: tasks, count: tasks.length });
    } catch (error) {
        console.error('Eroare la căutarea task-urilor:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.get('/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { q, role } = req.query;

        if (!q && !role) {
            return res.status(400).json({
                success: false,
                message: 'Query-ul de căutare sau filtrul de rol este necesar.'
            });
        }

        let whereClause = {};

        if (q) {
            whereClause[Op.or] = [
                { username: { [Op.like]: `%${q}%` } },
                { email: { [Op.like]: `%${q}%` } }
            ];
        }

        if (role) {
            whereClause.role = role;
        }

        const users = await User.findAll({
            where: whereClause,
            attributes: { exclude: ['password'] },
            include: [{
                model: User,
                as: 'manager',
                attributes: ['id', 'username']
            }],
            order: [['username', 'ASC']],
            limit: 50
        });

        res.json({ success: true, data: users, count: users.length });
    } catch (error) {
        console.error('Eroare la căutarea utilizatorilor:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.get('/my-team', authenticate, authorize('manager'), async (req, res) => {
    try {
        const { q } = req.query;

        let whereClause = {
            managerId: req.user.id,
            role: 'executor'
        };

        if (q) {
            whereClause[Op.and] = [
                { managerId: req.user.id },
                {
                    [Op.or]: [
                        { username: { [Op.like]: `%${q}%` } },
                        { email: { [Op.like]: `%${q}%` } }
                    ]
                }
            ];
        }

        const team = await User.findAll({
            where: whereClause,
            attributes: { exclude: ['password'] },
            order: [['username', 'ASC']]
        });

        res.json({ success: true, data: team });
    } catch (error) {
        console.error('Eroare la căutarea echipei:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

module.exports = router;
