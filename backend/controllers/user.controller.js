exports.getAllUsers = (req, res, db) => {
    db.query(
        "SELECT id, username, role, manager_id, created_at FROM users",
        (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        }
    );
};

exports.getManagers = (req, res, db) => {
    db.query(
        "SELECT id, username FROM users WHERE role = 'MANAGER'",
        (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        }
    );
};

exports.getUserTasks = (req, res, db) => {
    const userId = req.params.id;

    const sql = `
        SELECT *
        FROM tasks
        WHERE assigned_to_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
};


exports.getUserHistory = (req, res, db) => {
    const userId = req.params.id;

    const sql = `
        SELECT * 
        FROM tasks
        WHERE assigned_to_id = ? 
        AND status IN ('COMPLETED', 'CLOSED')
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
};


exports.getManagerTasks = (req, res, db) => {
    const managerId = req.params.id;

    const sql = `
        SELECT *
        FROM tasks
        WHERE manager_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [managerId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
};
