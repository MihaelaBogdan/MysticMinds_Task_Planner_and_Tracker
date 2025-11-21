const bcrypt = require("bcryptjs");

exports.register = async (req, res, db) => {
    const { username, password, role, manager_id } = req.body;

    db.query("SELECT * FROM users WHERE username = ?", [username],
        async (err, results) => {
            if (err) return res.status(500).json(err);

            if (results.length > 0)
                return res.status(400).json({ error: "User already exists" });

            const hashed = await bcrypt.hash(password, 10);

            db.query(
                "INSERT INTO users (username, password, role, manager_id) VALUES (?, ?, ?, ?)",
                [username, hashed, role, manager_id || null],
                (err, result) => {
                    if (err) return res.status(500).json(err);
                    res.json({ message: "User created", id: result.insertId });
                }
            );
        }
    );
};

exports.login = (req, res, db) => {
    const { username, password } = req.body;

    db.query("SELECT * FROM users WHERE username = ?", [username],
        async (err, results) => {
            if (err) return res.status(500).json(err);

            if (results.length === 0)
                return res.status(404).json({ error: "User not found" });

            const user = results[0];

            const match = await bcrypt.compare(password, user.password);
            if (!match)
                return res.status(401).json({ error: "Wrong password" });

            delete user.password;
            res.json({ message: "Login ok", user });
        }
    );
};
