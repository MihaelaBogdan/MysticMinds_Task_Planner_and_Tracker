const sequelize = require('../config/database');
const User = require('./User');
const Task = require('./Task');
const Comment = require('./Comment');

Task.belongsTo(User, { as: 'creator', foreignKey: 'createdById' });
User.hasMany(Task, { as: 'createdTasks', foreignKey: 'createdById' });

Task.belongsTo(User, { as: 'assignee', foreignKey: 'assignedToId' });
User.hasMany(Task, { as: 'assignedTasks', foreignKey: 'assignedToId' });

Comment.belongsTo(Task, { as: 'task', foreignKey: 'taskId' });
Task.hasMany(Comment, { as: 'comments', foreignKey: 'taskId' });

Comment.belongsTo(User, { as: 'author', foreignKey: 'userId' });
User.hasMany(Comment, { as: 'comments', foreignKey: 'userId' });

module.exports = {
    sequelize,
    User,
    Task,
    Comment
};
