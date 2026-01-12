const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Determine storage path based on environment
let storagePath;
if (process.env.RENDER) {
    // Render has persistent disk mounted at /data
    storagePath = '/data/database.sqlite';
} else if (process.env.DB_STORAGE) {
    storagePath = path.join(__dirname, '..', process.env.DB_STORAGE);
} else {
    storagePath = path.join(__dirname, '..', 'database.sqlite');
}

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false,
    define: {
        timestamps: true,
        underscored: true
    }
});

module.exports = sequelize;

