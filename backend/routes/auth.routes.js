const express = require("express");

module.exports = (db) => {
    const router = express.Router();
    const controller = require("../controllers/auth.controller")(db);

    router.post("/register", controller.register);
    router.post("/login", controller.login);

    return router;
};
