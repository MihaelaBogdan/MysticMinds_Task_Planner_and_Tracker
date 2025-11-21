const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());


const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',       
    database: 'mysticminds'
});


app.get('/', (req, res) => {
    res.send("API Works!");
});


app.use('/auth', require('./routes/auth.routes')(db));
app.use('/users', require('./routes/user.routes')(db));
app.use('/tasks', require('./routes/task.routes')(db));

app.listen(5000, () => {
    console.log("Server running at http://localhost:5000");
});

module.exports = db;
