const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads/myvision88');

function sanitizeFileName(name) {
  if (!name) return 'candle';
  return name.toString().replace(/[\\/*?:"<>|]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').substring(0, 100);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    try {
      const productName = req.body.name;
      const ext = path.extname(file.originalname).toLowerCase();

      if (!productName) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        return cb(null, 'candle-' + uniqueSuffix + ext);
      }

      const sanitizedName = sanitizeFileName(productName);
      let fileName = sanitizedName + ext;
      const fullPath = path.join(UPLOAD_DIR, fileName);

      if (fs.existsSync(fullPath)) {
        const timestamp = Date.now();
        fileName = `${sanitizedName}-${timestamp}${ext}`;
      }
      cb(null, fileName);
    } catch (error) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, 'candle-' + uniqueSuffix + ext);
    }
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'image') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('画像ファイルのみ許可されています！'), false);
      }
    } else {
      cb(new Error('Campo inesperado: ' + file.fieldname), false);
    }
  }
}).single('image');


// GET todas as velas (Público)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM candles ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET vela por ID (Público)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM candles WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Vela não encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST Criar vela (Admin)
router.post('/', (req, res, next) => {
  upload(req, res, function (err) {
    if (err) return res.status(400).json({ success: false, error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { name, description, price, is_active } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'O nome é obrigatório' });

    const isActiveVal = (is_active === 'true' || is_active === true || is_active === '1' || is_active === 1) ? 1 : 0;
    const priceVal = price ? parseInt(price) : 0;
    const imageFilename = req.file ? req.file.filename : '';

    const [result] = await pool.query(
      'INSERT INTO candles (name, description, price, image, is_active) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', priceVal, imageFilename, isActiveVal]
    );

    res.status(201).json({ success: true, candleId: result.insertId, image: imageFilename, message: 'Vela criada com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT Atualizar vela (Admin)
router.put('/:id', (req, res, next) => {
  upload(req, res, function (err) {
    if (err) return res.status(400).json({ success: false, error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { name, description, price, is_active } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'O nome é obrigatório' });

    const isActiveVal = (is_active === 'true' || is_active === true || is_active === '1' || is_active === 1) ? 1 : 0;
    const priceVal = price ? parseInt(price) : 0;
    const candleId = req.params.id;

    const [existing] = await pool.query('SELECT image FROM candles WHERE id = ?', [candleId]);
    if (existing.length === 0) return res.status(404).json({ success: false, error: 'Vela não encontrada' });

    let imageFilename = existing[0].image;

    if (req.file) {
      if (imageFilename && imageFilename !== 'default-candle.jpg') {
        const oldImagePath = path.join(UPLOAD_DIR, imageFilename);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imageFilename = req.file.filename;
    }

    await pool.query(
      'UPDATE candles SET name = ?, description = ?, price = ?, image = ?, is_active = ? WHERE id = ?',
      [name, description || '', priceVal, imageFilename, isActiveVal, candleId]
    );

    res.json({ success: true, message: 'Vela atualizada com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE Excluir vela (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const candleId = req.params.id;
    const [existing] = await pool.query('SELECT image FROM candles WHERE id = ?', [candleId]);

    if (existing.length === 0) return res.status(404).json({ success: false, error: 'Vela não encontrada' });

    const imageFilename = existing[0].image;
    if (imageFilename && imageFilename !== 'default-candle.jpg') {
      const imagePath = path.join(UPLOAD_DIR, imageFilename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await pool.query('DELETE FROM candles WHERE id = ?', [candleId]);
    res.json({ success: true, message: 'Vela excluída com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH Toggle Status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT is_active FROM candles WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, error: 'Vela não encontrada' });

    const newStatus = existing[0].is_active ? 0 : 1;
    await pool.query('UPDATE candles SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);

    res.json({ success: true, is_active: newStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
