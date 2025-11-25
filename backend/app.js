const express = require('express');
const sequelize = require('./sequelize');
require('./database/models/task');
const router = require('./routes/tasks');

const app = express();

app.use(express.json());
app.use('/api', router);

app.listen(7000, async () => {
    console.log('Server is running on port 7000');

    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
});
    