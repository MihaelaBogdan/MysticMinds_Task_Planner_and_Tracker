const express = require('express');
const { Op } = require('sequelize');
const { Task, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const checkId = (req, res, next) => {
    if (req.params.id && isNaN(req.params.id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
    } else {
        next();
    }
};

function validateTask(task) {
    if (!task || typeof task !== "object") {
        return { valid: false, error: "Invalid data: task must be an object." };
    }
    if (!task.title || typeof task.title !== "string" || !task.title.trim()) {
        return { valid: false, error: "Required field missing: 'title'." };
    }
    if (!task.description || typeof task.description !== "string" || !task.description.trim()) {
        return { valid: false, error: "Required field missing: 'description'." };
    }
    return { valid: true };
}

router.route('/')
    .get(authenticate, async (req, res) => {
        try {
            const { status, priority, view } = req.query;
            let whereClause = {};

            if (req.user.role === 'manager') {
                const executors = await User.findAll({ where: { managerId: req.user.id } });
                const executorIds = executors.map(e => e.id);

                whereClause[Op.or] = [
                    { createdById: req.user.id },
                    { assignedToId: { [Op.in]: executorIds } }
                ];
            } else if (req.user.role === 'executor') {
                if (view === 'created') {
                    whereClause.createdById = req.user.id;
                } else if (view === 'assigned') {
                    whereClause.assignedToId = req.user.id;
                } else {
                    whereClause[Op.or] = [
                        { assignedToId: req.user.id },
                        { createdById: req.user.id }
                    ];
                }
            }

            if (status) {
                whereClause.status = status;
            }

            if (priority) {
                whereClause.priority = priority;
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
            console.error('Error getting tasks:', error);
            res.status(500).json({ success: false, message: 'Server error.' });
        }
    })
    .post(authenticate, authorize('admin', 'manager', 'executor'), async (req, res) => {
        try {
            const validationResult = validateTask(req.body);
            if (!validationResult.valid) {
                return res.status(400).json({ success: false, message: validationResult.error });
            }

            const { title, description, priority, dueDate } = req.body;

            const task = await Task.create({
                title,
                description,
                priority: priority || 'medium',
                dueDate: dueDate || null,
                status: 'OPEN',
                createdById: req.user.id
            });

            const createdTask = await Task.findByPk(task.id, {
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                    { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
                ]
            });

            res.status(201).json({
                success: true,
                message: 'Task created successfully!',
                data: createdTask
            });
        } catch (error) {
            console.error('Error creating task:', error);
            res.status(500).json({ success: false, message: 'Server error: ' + error.message });
        }
    });

router.get('/history', authenticate, async (req, res) => {
    try {
        let whereClause = {
            status: { [Op.in]: ['COMPLETED', 'CLOSED'] }
        };

        if (req.user.role === 'manager') {
            whereClause.createdById = req.user.id;
        } else if (req.user.role === 'executor') {
            whereClause.assignedToId = req.user.id;
        }

        const tasks = await Task.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
            ],
            order: [['closedAt', 'DESC'], ['completedAt', 'DESC']]
        });

        res.json({ success: true, data: tasks });
    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.get('/executor/:executorId/history', authenticate, authorize('manager'), async (req, res) => {
    try {
        const { executorId } = req.params;

        const executor = await User.findByPk(executorId);
        if (!executor || executor.managerId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only view history for your own executors.'
            });
        }

        const tasks = await Task.findAll({
            where: {
                assignedToId: executorId,
                status: { [Op.in]: ['COMPLETED', 'CLOSED'] }
            },
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
            ],
            order: [['closedAt', 'DESC'], ['completedAt', 'DESC']]
        });

        res.json({ success: true, data: tasks });
    } catch (error) {
        console.error('Error getting executor history:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.route('/:id')
    .get(authenticate, checkId, async (req, res) => {
        try {
            const task = await Task.findByPk(req.params.id, {
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                    { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
                ]
            });

            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found.' });
            }

            if (req.user.role === 'executor' && task.assignedToId !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }

            if (req.user.role === 'manager' && task.createdById !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }

            res.json({ success: true, data: task });
        } catch (error) {
            console.error('Eroare la obținerea task-ului:', error);
            res.status(500).json({ success: false, message: 'Server error.' });
        }
    })
    .put(authenticate, authorize('manager'), checkId, async (req, res) => {
        try {
            const { title, description, priority, dueDate } = req.body;
            const task = await Task.findByPk(req.params.id);

            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found.' });
            }

            if (task.createdById !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only update your own tasks.'
                });
            }

            if (task.status !== 'OPEN') {
                return res.status(400).json({
                    success: false,
                    message: 'You can only update OPEN tasks.'
                });
            }

            await task.update({
                title: title || task.title,
                description: description || task.description,
                priority: priority || task.priority,
                dueDate: dueDate !== undefined ? dueDate : task.dueDate
            });

            const updatedTask = await Task.findByPk(task.id, {
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                    { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
                ]
            });

            res.json({ success: true, message: 'Task updated successfully!', data: updatedTask });
        } catch (error) {
            console.error('Error updating task:', error);
            res.status(500).json({ success: false, message: 'Server error.' });
        }
    })
    .delete(authenticate, authorize('manager'), checkId, async (req, res) => {
        try {
            const task = await Task.findByPk(req.params.id);

            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found.' });
            }

            if (task.createdById !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only delete your own tasks.'
                });
            }

            await task.destroy();
            res.json({ success: true, message: 'Task deleted successfully.' });
        } catch (error) {
            console.error('Error deleting task:', error);
            res.status(500).json({ success: false, message: 'Server error.' });
        }
    });

router.patch('/:id/assign', authenticate, authorize('manager'), checkId, async (req, res) => {
    try {
        const { assignedToId } = req.body;
        const task = await Task.findByPk(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        if (task.createdById !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only assign your own tasks.'
            });
        }

        if (task.status !== 'OPEN') {
            return res.status(400).json({
                success: false,
                message: 'Only OPEN tasks can be assigned.'
            });
        }

        const executor = await User.findByPk(assignedToId);
        if (!executor || executor.role !== 'executor' || executor.managerId !== req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Invalid executor. Must be one of your team members.'
            });
        }

        await task.update({
            assignedToId,
            status: 'PENDING'
        });

        const updatedTask = await Task.findByPk(task.id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
            ]
        });

        res.json({ success: true, message: 'Task assigned successfully!', data: updatedTask });
    } catch (error) {
        console.error('Error assigning task:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.patch('/:id/complete', authenticate, authorize('executor'), checkId, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        if (task.assignedToId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only complete tasks assigned to you.'
            });
        }

        if (task.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Only PENDING tasks can be completed.'
            });
        }

        await task.update({
            status: 'COMPLETED',
            completedAt: new Date()
        });

        const updatedTask = await Task.findByPk(task.id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
            ]
        });

        res.json({ success: true, message: 'Task completed successfully!', data: updatedTask });
    } catch (error) {
        console.error('Error completing task:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.patch('/:id/close', authenticate, authorize('manager'), checkId, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        if (task.createdById !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only close your own tasks.'
            });
        }

        if (task.status !== 'COMPLETED') {
            return res.status(400).json({
                success: false,
                message: 'Only COMPLETED tasks can be closed.'
            });
        }

        await task.update({
            status: 'CLOSED',
            closedAt: new Date()
        });

        const updatedTask = await Task.findByPk(task.id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
            ]
        });

        res.json({ success: true, message: 'Task closed successfully!', data: updatedTask });
    } catch (error) {
        console.error('Error closing task:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.patch('/:id/status', authenticate, checkId, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['OPEN', 'PENDING', 'COMPLETED', 'CLOSED'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Allowed values: OPEN, PENDING, COMPLETED, CLOSED.'
            });
        }

        const task = await Task.findByPk(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        if (req.user.role === 'manager' && task.createdById !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only modify your own tasks.'
            });
        }

        if (req.user.role === 'executor' && task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only modify your own tasks.'
            });
        }

        const updateData = { status };

        if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
            updateData.completedAt = new Date();
        }
        if (status === 'CLOSED' && task.status !== 'CLOSED') {
            updateData.closedAt = new Date();
        }

        await task.update(updateData);

        const updatedTask = await Task.findByPk(task.id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
            ]
        });

        res.json({ success: true, message: `Status changed to ${status}!`, data: updatedTask });
    } catch (error) {
        console.error('Error changing status:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
