const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// =============================================
// Configuração do Multer para upload de imagens
// =============================================
const UPLOAD_DIR = path.join(process.cwd(), 'uploads/myvision88');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// =============================================
// GET /api/sameday-cakes — Listar todos os bolos do dia
// =============================================
router.get('/', async (req, res) => {
  try {
    const [cakes] = await pool.query(
      `SELECT c.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT('id', s.id, 'size', s.size, 'price', s.price, 'stock', s.stock, 'is_active', s.is_active)
        ) AS sizes
       FROM same_day_cakes c
       LEFT JOIN same_day_cake_sizes s ON s.same_day_cake_id = c.id
       GROUP BY c.id
       ORDER BY c.id DESC`
    );
    const parsed = cakes.map(c => ({ ...c, sizes: typeof c.sizes === 'string' ? JSON.parse(c.sizes) : c.sizes }));
    res.json({ success: true, same_day_cakes: parsed });
  } catch (err) {
    console.error('Erro ao listar same day cakes:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================
// GET /api/sameday-cakes/:id — Buscar bolo por ID
// =============================================
router.get('/:id', async (req, res) => {
  try {
    const [cakes] = await pool.query(
      `SELECT c.*,
        JSON_ARRAYAGG(
          JSON_OBJECT('id', s.id, 'size', s.size, 'price', s.price, 'stock', s.stock, 'is_active', s.is_active)
        ) AS sizes
       FROM same_day_cakes c
       LEFT JOIN same_day_cake_sizes s ON s.same_day_cake_id = c.id
       WHERE c.id = ?
       GROUP BY c.id`,
      [req.params.id]
    );
    if (!cakes.length) return res.status(404).json({ success: false, error: 'Não encontrado' });
    const cake = { ...cakes[0], sizes: typeof cakes[0].sizes === 'string' ? JSON.parse(cakes[0].sizes) : cakes[0].sizes };
    res.json({ success: true, cake });
  } catch (err) {
    console.error('Erro ao buscar same day cake:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================
// POST /api/sameday-cakes — Criar novo bolo
// =============================================
router.post('/', upload.single('image'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, is_active, sizes } = req.body;
    const image = req.file ? req.file.filename : null;

    const [result] = await conn.query(
      'INSERT INTO same_day_cakes (name, image, is_active) VALUES (?, ?, ?)',
      [name, image, is_active ?? 1]
    );
    const cakeId = result.insertId;

    if (sizes) {
      const parsedSizes = JSON.parse(sizes);
      for (const s of parsedSizes) {
        await conn.query(
          'INSERT INTO same_day_cake_sizes (same_day_cake_id, size, price, stock, is_active) VALUES (?, ?, ?, ?, ?)',
          [cakeId, s.size, s.price, s.stock ?? 0, s.is_active ?? 1]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, id: cakeId });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao criar same day cake:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// =============================================
// PUT /api/sameday-cakes/:id — Atualizar bolo
// =============================================
router.put('/:id', upload.single('image'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, is_active, sizes } = req.body;
    const { id } = req.params;

    const fields = { name, is_active };
    if (req.file) fields.image = req.file.filename;

    const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(fields), id];

    await conn.query(`UPDATE same_day_cakes SET ${setClauses} WHERE id = ?`, values);

    if (sizes) {
      const parsedSizes = JSON.parse(sizes);
      for (const s of parsedSizes) {
        if (s.id) {
          await conn.query(
            'UPDATE same_day_cake_sizes SET size=?, price=?, stock=?, is_active=? WHERE id=?',
            [s.size, s.price, s.stock, s.is_active, s.id]
          );
        } else {
          await conn.query(
            'INSERT INTO same_day_cake_sizes (same_day_cake_id, size, price, stock, is_active) VALUES (?, ?, ?, ?, ?)',
            [id, s.size, s.price, s.stock ?? 0, s.is_active ?? 1]
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao atualizar same day cake:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// =============================================
// DELETE /api/sameday-cakes/:id — Deletar bolo
// =============================================
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM same_day_cakes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar same day cake:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
