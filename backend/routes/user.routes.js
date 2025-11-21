const express = require('express');
const userController = require('../controllers/user.controller');

module.exports = (db) => {
    const router = express.Router();

    router.get('/', (req, res) => userController.getAllUsers(req, res, db));
    router.get('/managers', (req, res) => userController.getManagers(req, res, db));

  
    router.get('/:id/history', (req, res) => userController.getUserHistory(req, res, db));

  
    router.get('/:id/tasks', (req, res) => userController.getUserTasks(req, res, db));

    
    router.get('/:id/manager-tasks', (req, res) => userController.getManagerTasks(req, res, db));

    return router;
};
