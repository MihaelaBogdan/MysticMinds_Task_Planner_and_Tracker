const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mysticminds'
});

// Test
app.get('/', (req, res) => {
    res.send('API Works!');
});

// Get tasks
app.get('/tasks', (req, res) => {
    db.query("SHOW TABLES LIKE 'tasks'", (err, rows) => {
        if (err) return res.status(500).json(err);

        // dacă tabelul NU există → trimitem listă goală
        if (rows.length === 0) {
            return res.json([]);
        }

        db.query("SELECT * FROM tasks", (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        });
    });
});

// Add task
app.post('/tasks', (req, res) => {
    const { title } = req.body;

    db.query("SHOW TABLES LIKE 'tasks'", (err, rows) => {
        if (rows.length === 0) {
            return res.status(400).json({ error: "Table 'tasks' does not exist" });
        }

        db.query("INSERT INTO tasks (title) VALUES (?)", [title],
            (err, results) => {
                if (err) return res.status(500).json(err);
                res.json({ id: results.insertId, title });
            }
        );
    });
});


app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});
