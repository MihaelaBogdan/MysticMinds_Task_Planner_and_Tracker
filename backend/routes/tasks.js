const express = require('express');
const { Op } = require('sequelize');
const { Task, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const checkId = (req, res, next) => {
    if (req.params.id && isNaN(req.params.id)) {
        res.status(400).json({ success: false, message: "ID invalid" });
    } else {
        next();
    }
};

function validateTask(task) {
    if (!task || typeof task !== "object") {
        return { valid: false, error: "Date invalide: task-ul trebuie să fie un obiect." };
    }
    if (!task.title || typeof task.title !== "string" || !task.title.trim()) {
        return { valid: false, error: "Câmp obligatoriu lipsă: 'title'." };
    }
    if (!task.description || typeof task.description !== "string" || !task.description.trim()) {
        return { valid: false, error: "Câmp obligatoriu lipsă: 'description'." };
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
            console.error('Eroare la obținerea task-urilor:', error);
            res.status(500).json({ success: false, message: 'Eroare la server.' });
        }
    })
    .post(authenticate, authorize('manager', 'executor'), async (req, res) => {
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
                message: 'Task creat cu succes!',
                data: createdTask
            });
        } catch (error) {
            console.error('Eroare la crearea task-ului:', error);
            res.status(500).json({ success: false, message: 'Eroare la server.' });
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
        console.error('Eroare la obținerea istoricului:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.get('/executor/:executorId/history', authenticate, authorize('manager'), async (req, res) => {
    try {
        const { executorId } = req.params;

        const executor = await User.findByPk(executorId);
        if (!executor || executor.managerId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Poți vedea istoricul doar pentru executorii tăi.'
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
        console.error('Eroare la obținerea istoricului executorului:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
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
                return res.status(404).json({ success: false, message: 'Task-ul nu a fost găsit.' });
            }

            if (req.user.role === 'executor' && task.assignedToId !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Acces interzis.' });
            }

            if (req.user.role === 'manager' && task.createdById !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Acces interzis.' });
            }

            res.json({ success: true, data: task });
        } catch (error) {
            console.error('Eroare la obținerea task-ului:', error);
            res.status(500).json({ success: false, message: 'Eroare la server.' });
        }
    })
    .put(authenticate, authorize('manager'), checkId, async (req, res) => {
        try {
            const { title, description, priority, dueDate } = req.body;
            const task = await Task.findByPk(req.params.id);

            if (!task) {
                return res.status(404).json({ success: false, message: 'Task-ul nu a fost găsit.' });
            }

            if (task.createdById !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Poți actualiza doar task-urile proprii.'
                });
            }

            if (task.status !== 'OPEN') {
                return res.status(400).json({
                    success: false,
                    message: 'Poți actualiza doar task-uri OPEN.'
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

            res.json({ success: true, message: 'Task actualizat cu succes!', data: updatedTask });
        } catch (error) {
            console.error('Eroare la actualizarea task-ului:', error);
            res.status(500).json({ success: false, message: 'Eroare la server.' });
        }
    })
    .delete(authenticate, authorize('manager'), checkId, async (req, res) => {
        try {
            const task = await Task.findByPk(req.params.id);

            if (!task) {
                return res.status(404).json({ success: false, message: 'Task-ul nu a fost găsit.' });
            }

            if (task.createdById !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Poți șterge doar task-urile proprii.'
                });
            }

            await task.destroy();
            res.json({ success: true, message: 'Task șters cu succes.' });
        } catch (error) {
            console.error('Eroare la ștergerea task-ului:', error);
            res.status(500).json({ success: false, message: 'Eroare la server.' });
        }
    });

router.patch('/:id/assign', authenticate, authorize('manager'), checkId, async (req, res) => {
    try {
        const { assignedToId } = req.body;
        const task = await Task.findByPk(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task-ul nu a fost găsit.' });
        }

        if (task.createdById !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Poți atribui doar task-urile proprii.'
            });
        }

        if (task.status !== 'OPEN') {
            return res.status(400).json({
                success: false,
                message: 'Doar task-urile OPEN pot fi atribuite.'
            });
        }

        const executor = await User.findByPk(assignedToId);
        if (!executor || executor.role !== 'executor' || executor.managerId !== req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Executor invalid. Trebuie să fie unul din membrii echipei tale.'
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

        res.json({ success: true, message: 'Task atribuit cu succes!', data: updatedTask });
    } catch (error) {
        console.error('Eroare la atribuirea task-ului:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.patch('/:id/complete', authenticate, authorize('executor'), checkId, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task-ul nu a fost găsit.' });
        }

        if (task.assignedToId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Poți finaliza doar task-urile atribuite ție.'
            });
        }

        if (task.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Doar task-urile PENDING pot fi finalizate.'
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

        res.json({ success: true, message: 'Task finalizat cu succes!', data: updatedTask });
    } catch (error) {
        console.error('Eroare la finalizarea task-ului:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.patch('/:id/close', authenticate, authorize('manager'), checkId, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task-ul nu a fost găsit.' });
        }

        if (task.createdById !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Poți închide doar task-urile proprii.'
            });
        }

        if (task.status !== 'COMPLETED') {
            return res.status(400).json({
                success: false,
                message: 'Doar task-urile COMPLETED pot fi închise.'
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

        res.json({ success: true, message: 'Task închis cu succes!', data: updatedTask });
    } catch (error) {
        console.error('Eroare la închiderea task-ului:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.patch('/:id/status', authenticate, checkId, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['OPEN', 'PENDING', 'COMPLETED', 'CLOSED'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status invalid. Valori permise: OPEN, PENDING, COMPLETED, CLOSED.'
            });
        }

        const task = await Task.findByPk(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task-ul nu a fost gasit.' });
        }

        if (req.user.role === 'manager' && task.createdById !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Poti modifica doar task-urile proprii.'
            });
        }

        if (req.user.role === 'executor' && task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Poti modifica doar task-urile tale.'
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

        res.json({ success: true, message: `Status schimbat in ${status}!`, data: updatedTask });
    } catch (error) {
        console.error('Eroare la schimbarea statusului:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

module.exports = router;
