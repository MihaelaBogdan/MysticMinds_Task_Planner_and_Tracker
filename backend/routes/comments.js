const express = require('express');
const { Comment, User, Task } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const checkId = (req, res, next) => {
    const id = req.params.id || req.params.taskId;
    if (id && isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
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
        console.error('Error getting comments:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/', authenticate, async (req, res) => {
    try {
        const { taskId, content } = req.body;

        if (!taskId || !content) {
            return res.status(400).json({
                success: false,
                message: 'Task ID and content are required.'
            });
        }

        const task = await Task.findByPk(taskId);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        if (req.user.role === 'executor' && task.assignedToId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        if (req.user.role === 'manager' && task.createdById !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
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
            message: 'Comment added successfully!',
            data: createdComment
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.route('/:id')
    .put(authenticate, checkId, async (req, res) => {
        try {
            const { content } = req.body;
            const comment = await Comment.findByPk(req.params.id);

            if (!comment) {
                return res.status(404).json({ success: false, message: 'Comment not found.' });
            }

            if (comment.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot edit other users\' comments.'
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
            console.error('Error updating comment:', error);
            res.status(500).json({ success: false, message: 'Server error.' });
        }
    })
    .delete(authenticate, checkId, async (req, res) => {
        try {
            const comment = await Comment.findByPk(req.params.id);

            if (!comment) {
                return res.status(404).json({ success: false, message: 'Comment not found.' });
            }

            if (comment.userId !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot delete other users\' comments.'
                });
            }

            await comment.destroy();
            res.json({ success: true, message: 'Comment deleted.' });
        } catch (error) {
            console.error('Error deleting comment:', error);
            res.status(500).json({ success: false, message: 'Server error.' });
        }
    });

module.exports = router;
