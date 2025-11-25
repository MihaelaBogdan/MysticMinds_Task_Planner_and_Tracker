const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database/mysticminds.db'
});

sequelize.sync().then(() => {
  console.log('All models synchronized successfully.');
});

module.exports = sequelize;
