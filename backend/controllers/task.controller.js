// LISTĂ TASK-URI
exports.getAllTasks = (req, res, db) => {
    db.query(
        "SELECT * FROM tasks ORDER BY created_at DESC",
        (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        }
    );
};


exports.createTask = (req, res, db) => {
    const { description, manager_id } = req.body;

    if (!description || !manager_id)
        return res.status(400).json({ error: "description + manager_id required" });

    const sql = `
        INSERT INTO tasks (description, manager_id)
        VALUES (?, ?)
    `;

    db.query(sql, [description, manager_id], (err, result) => {
        if (err) return res.status(500).json(err);

        res.json({
            id: result.insertId,
            message: "Task created"
        });
    });
};


exports.assignTask = (req, res, db) => {
    const taskId = req.params.id;
    const { assigned_to_id } = req.body;

    const sql = `
        UPDATE tasks
        SET assigned_to_id = ?, status = 'PENDING'
        WHERE id = ?
    `;

    db.query(sql, [assigned_to_id, taskId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Task assigned" });
    });
};


exports.completeTask = (req, res, db) => {
    const taskId = req.params.id;
    const { userId } = req.body;

    const sql = `
        UPDATE tasks
        SET status = 'COMPLETED'
        WHERE id = ? 
        AND assigned_to_id = ?
        AND status = 'PENDING'
    `;

    db.query(sql, [taskId, userId], (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.affectedRows === 0)
            return res.status(400).json({ error: "Not allowed" });

        res.json({ message: "Task completed" });
    });
};


exports.closeTask = (req, res, db) => {
    const taskId = req.params.id;
    const { managerId } = req.body;

    const sql = `
        UPDATE tasks
        SET status = 'CLOSED'
        WHERE id = ?
        AND manager_id = ?
        AND status = 'COMPLETED'
    `;

    db.query(sql, [taskId, managerId], (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.affectedRows === 0)
            return res.status(400).json({ error: "Cannot close task" });

        res.json({ message: "Task closed" });
    });
};
