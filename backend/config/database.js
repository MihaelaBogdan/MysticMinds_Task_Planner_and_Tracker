const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Determine storage path based on environment
let storagePath;
if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    // Railway has persistent volume
    storagePath = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'database.sqlite');
} else if (process.env.RENDER) {
    // Render has persistent disk mounted at /data
    storagePath = '/data/database.sqlite';
} else if (process.env.DB_STORAGE) {
    storagePath = path.join(__dirname, '..', process.env.DB_STORAGE);
} else {
    storagePath = path.join(__dirname, '..', 'database.sqlite');
}

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

let sequelize;

if (databaseUrl) {
    console.log('Initializing database with PostgreSQL connection...');
    sequelize = new Sequelize(databaseUrl, {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        define: {
            timestamps: true,
            underscored: true
        }
    });
} else {
    console.log('Initializing database with SQLite connection...');
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: storagePath,
        logging: false,
        define: {
            timestamps: true,
            underscored: true
        }
    });
}

module.exports = sequelize;

