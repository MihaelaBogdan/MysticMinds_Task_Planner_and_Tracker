const express = require('express');
const taskController = require('../controllers/task.controller');

module.exports = (db) => {
    const router = express.Router();

    router.get('/', (req, res) => taskController.getAllTasks(req, res, db));
    router.post('/', (req, res) => taskController.createTask(req, res, db));
    router.put('/:id/assign', (req, res) => taskController.assignTask(req, res, db));
    router.put('/:id/complete', (req, res) => taskController.completeTask(req, res, db));
    router.put('/:id/close', (req, res) => taskController.closeTask(req, res, db));

    return router;
};
