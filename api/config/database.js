const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;

if (process.env.DATABASE_URL) {
    // Configuration for Cloud PostgreSQL (Persistent on Vercel)
    sequelize = new Sequelize(process.env.DATABASE_URL, {
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
    // Configuration for Local SQLite (or ephemeral Vercel fallback)
    // Vercel allows writing ONLY to /tmp directory
    const storagePath = process.env.VERCEL
        ? path.join('/tmp', 'database.sqlite')
        : path.join(__dirname, 'database.sqlite');

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
