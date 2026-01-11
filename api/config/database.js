const { Sequelize } = require('sequelize');
const path = require('path');

// Vercel allows writing ONLY to /tmp directory
// Local development uses the standard file path
const storagePath = process.env.VERCEL
    ? path.join('/tmp', 'database.sqlite')
    : path.join(__dirname, 'database.sqlite');

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
