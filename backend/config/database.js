/**
 * @fileoverview Database Configuration
 * @description Configures Sequelize ORM with SQLite database connection
 * @module config/database
 */

const { Sequelize } = require('sequelize');
const path = require('path');

/**
 * Sequelize instance configured for SQLite
 * @type {Sequelize}
 */
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', process.env.DB_STORAGE || 'database.sqlite'),
    logging: false, // Set to console.log for debugging
    define: {
        timestamps: true,
        underscored: true
    }
});

module.exports = sequelize;
