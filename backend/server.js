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


app.get('/tasks', (req, res) => {
    db.query("SHOW TABLES LIKE 'tasks'", (err, rows) => {
        if (err) return res.status(500).json(err);


        if (rows.length === 0) {
            return res.json([]);
        }

        db.query("SELECT * FROM tasks", (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        });
    });
});


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
const initializeDatabase = () => {
   
    const createUserTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role ENUM('ADMIN', 'MANAGER', 'EXECUTANT') NOT NULL,
            manager_id INT NULL, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
        );
    `;

    
    const createTaskTable = `
        CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            description TEXT NOT NULL,
            status ENUM('OPEN', 'PENDING', 'COMPLETED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
            manager_id INT NOT NULL, 
            assigned_to_id INT NULL, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL
        );
    `;

    db.query(createUserTable, (err) => {
        if (err) return console.error("Eroare la crearea tabelei 'users':", err);
        console.log("Tabela 'users' este gata (sau exista deja).");

        db.query(createTaskTable, (err) => {
            if (err) return console.error("Eroare la crearea tabelei 'tasks':", err);
            console.log("Tabela 'tasks' este gata (sau exista deja).");
        });
    });
};
app.get('/users', (req, res) => {

    const sql = `
        SELECT id, username, role, manager_id, created_at 
        FROM users
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Eroare la preluarea utilizatorilor:", err);
            return res.status(500).json(err);
        }
        res.json(results);
    });
});


app.get('/users/managers', (req, res) => {
    
    const sql = `
        SELECT id, username
        FROM users
        WHERE role = 'MANAGER'
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Eroare la preluarea managerilor:", err);
            return res.status(500).json(err);
        }
        res.json(results);
    });
});
app.put('/tasks/:id/complete', (req, res) => {
    const taskId = req.params.id;
    
    const authenticatedUserId = req.body.userId; 

    if (!authenticatedUserId) {
        return res.status(401).json({ error: "Authentication required." });
    }


    const sql = `
        UPDATE tasks 
        SET status = 'COMPLETED' 
        WHERE id = ? AND assigned_to_id = ? AND status = 'PENDING'
    `;
    
    db.query(sql, [taskId, authenticatedUserId], (err, results) => {
        if (err) {
            console.error("Eroare la marcarea task-ului ca realizat:", err);
            return res.status(500).json(err);
        }
        
        if (results.affectedRows === 0) {
            return res.status(404).json({ 
                error: "Task not found, is not PENDING, or is not assigned to this user." 
            });
        }
        res.json({ message: `Task ${taskId} marked as COMPLETED.` });
    });
});
app.put('/tasks/:id/close', (req, res) => {
    const taskId = req.params.id;
    // În aplicația reală, managerId ar fi preluat din sesiune/token
    const authenticatedManagerId = req.body.managerId; // Presupunem că ID-ul managerului este trimis pentru verificare

    if (!authenticatedManagerId) {
        return res.status(401).json({ error: "Manager authentication required." });
    }


    const sql = `
        UPDATE tasks 
        SET status = 'CLOSED' 
        WHERE id = ? AND manager_id = ? AND status = 'COMPLETED'
    `;
    
    db.query(sql, [taskId, authenticatedManagerId], (err, results) => {
        if (err) {
            console.error("Eroare la închiderea task-ului:", err);
            return res.status(500).json(err);
        }
        
        if (results.affectedRows === 0) {
            return res.status(404).json({ 
                error: "Task not found, is not COMPLETED, or the user is not the designated manager." 
            });
        }
        res.json({ message: `Task ${taskId} marked as CLOSED and archived.` });
    });
});