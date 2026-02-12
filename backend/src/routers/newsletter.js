const express = require("express");
const db = require("../config/db");

const router = express.Router();

// 🔹 LISTAR
router.get("/", async (_, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        id,
        title,
        content,
        source,
        link,
        DATE_FORMAT(updated_at, '%Y-%m-%d') AS updated_at
       FROM newsletters ORDER BY updated_at DESC, id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 CRIAR 
router.post("/", async (req, res) => {
  try {
    const { title, content, source, link } = req.body;

    await db.query(
      "INSERT INTO newsletters (title, content, source, link) VALUES (?, ?, ?, ?)",
      [title, content, source, link]
    );

    res.status(201).json({ message: "Newsletter criada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 ATUALIZAR
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, source, link } = req.body;

    await db.query(
      "UPDATE newsletters SET title=?, content=?, source=?, link=? WHERE id=?",
      [title, content, source, link, id]
    );

    res.json({ message: "Newsletter atualizada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 DELETAR
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM newsletters WHERE id=?", [id]);

    res.json({ message: "Newsletter removida" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
