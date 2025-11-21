const express = require("express");
const authController = require("../controllers/auth.controller");

module.exports = (db) => {
    const router = express.Router();

    router.post("/register", (req, res) => authController.register(req, res, db));
    router.post("/login", (req, res) => authController.login(req, res, db));

    return router;
};
