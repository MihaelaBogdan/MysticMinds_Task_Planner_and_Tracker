const express = require('express');
const { Comment, User, Task } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const checkId = (req, res, next) => {
    const id = req.params.id || req.params.taskId;
    if (id && isNaN(id)) {
        res.status(400).json({ success: false, message: "ID invalid" });
    } else {
        next();
    }
};

router.get('/task/:taskId', authenticate, checkId, async (req, res) => {
    try {
        const comments = await Comment.findAll({
            where: { taskId: req.params.taskId },
            include: [{
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'email', 'role']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, data: comments });
    } catch (error) {
        console.error('Eroare la obținerea comentariilor:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.post('/', authenticate, async (req, res) => {
    try {
        const { taskId, content } = req.body;

        if (!taskId || !content) {
            return res.status(400).json({
                success: false,
                message: 'ID-ul task-ului și conținutul sunt obligatorii.'
            });
        }

        const task = await Task.findByPk(taskId);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task-ul nu a fost găsit.' });
        }

        if (req.user.role === 'executor' && task.assignedToId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Acces interzis.' });
        }
        if (req.user.role === 'manager' && task.createdById !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Acces interzis.' });
        }

        const comment = await Comment.create({
            taskId,
            content,
            userId: req.user.id
        });

        const createdComment = await Comment.findByPk(comment.id, {
            include: [{
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'email', 'role']
            }]
        });

        res.status(201).json({
            success: true,
            message: 'Comentariu adăugat cu succes!',
            data: createdComment
        });
    } catch (error) {
        console.error('Eroare la adăugarea comentariului:', error);
        res.status(500).json({ success: false, message: 'Eroare la server.' });
    }
});

router.route('/:id')
    .put(authenticate, checkId, async (req, res) => {
        try {
            const { content } = req.body;
            const comment = await Comment.findByPk(req.params.id);

            if (!comment) {
                return res.status(404).json({ success: false, message: 'Comentariul nu a fost găsit.' });
            }

            if (comment.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Nu poți edita comentariile altor utilizatori.'
                });
            }

            await comment.update({ content });

            const updatedComment = await Comment.findByPk(comment.id, {
                include: [{
                    model: User,
                    as: 'author',
                    attributes: ['id', 'username', 'email', 'role']
                }]
            });

            res.json({ success: true, data: updatedComment });
        } catch (error) {
            console.error('Eroare la actualizarea comentariului:', error);
            res.status(500).json({ success: false, message: 'Eroare la server.' });
        }
    })
    .delete(authenticate, checkId, async (req, res) => {
        try {
            const comment = await Comment.findByPk(req.params.id);

            if (!comment) {
                return res.status(404).json({ success: false, message: 'Comentariul nu a fost găsit.' });
            }

            if (comment.userId !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Nu poți șterge comentariile altor utilizatori.'
                });
            }

            await comment.destroy();
            res.json({ success: true, message: 'Comentariu șters.' });
        } catch (error) {
            console.error('Eroare la ștergerea comentariului:', error);
            res.status(500).json({ success: false, message: 'Eroare la server.' });
        }
    });

module.exports = router;
