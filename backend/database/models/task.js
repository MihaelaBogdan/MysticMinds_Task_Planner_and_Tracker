const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Task = sequelize.define('Task', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    assignee: {
        type: DataTypes.STRING,
        allowNull: true
    },
    deadline: {
        type: DataTypes.DATE,
        allowNull: true
    },
    importance: {
        type: DataTypes.STRING,
        allowNull: true
        // low, medium, high
    },  
    tags: {
        type: DataTypes.STRING,
        allowNull: true
    },
    completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

module.exports = Task;
