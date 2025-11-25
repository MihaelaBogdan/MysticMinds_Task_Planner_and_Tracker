const express = require('express');
const Task = require('../database/models/task');
const router = express.Router();

router.get('/tasks', async (req, res) => {
    const tasks = await Task.findAll();
    res.json(tasks);
});

router.post('/tasks', async (req, res) => {
    const task = await Task.create({
        title: req.body.title,
        description: req.body.description,
        assignee: req.body.assignee,
        deadline: req.body.deadline,
        importance: req.body.importance,
        tags: req.body.tags,
        completed: req.body.completed
    });
    res.json(task);
});

router.put('/tasks/:id', async (req, res) => {
    const task = await Task.findByPk(req.params.id);

    task.title = req.body.title;
    task.description = req.body.description;
    task.assignee = req.body.assignee;
    task.deadline = req.body.deadline;
    task.importance = req.body.importance;
    task.tags = req.body.tags;
    task.completed = req.body.completed;

    await task.save();
    res.json(task);
});

router.delete('/tasks/:id', async (req, res) => {
    const task = await Task.findByPk(req.params.id);
    await task.destroy();
    res.json({ message: "Deleted successfully" });
});

module.exports = router;
