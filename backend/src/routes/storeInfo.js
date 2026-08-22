const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET - Buscar configurações
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM store_info WHERE id = 1');
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Configurações não encontradas' });
    }
    
    const info = rows[0];
    res.json({
      ...info,
      primary_color: info.primary_color || '#000000',
      secondary_color: info.secondary_color || '#fdd111'
    });
  } catch (error) {
    console.error('Erro ao buscar storeinfo:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT - Atualizar configurações
router.put('/', async (req, res) => {
  try {
    const {
      store_name, mail_store, mail_pass, mail_resend, resend_pass,
      site_back, tel, open_hour, folder_img,
      use_admin_grafic, use_admin_cake, use_admin_date, use_admin_download,
      primary_color, secondary_color
    } = req.body;

    // Adicionar colunas caso ainda não existam no MySQL
    try {
      await pool.query('ALTER TABLE store_info ADD COLUMN primary_color VARCHAR(7) DEFAULT "#000000"');
    } catch (e) { /* Coluna já existe */ }

    try {
      await pool.query('ALTER TABLE store_info ADD COLUMN secondary_color VARCHAR(7) DEFAULT "#fdd111"');
    } catch (e) { /* Coluna já existe */ }

    await pool.query(
      `UPDATE store_info SET 
        store_name = ?, mail_store = ?, mail_pass = ?, 
        mail_resend = ?, resend_pass = ?, site_back = ?,
        tel = ?, open_hour = ?, folder_img = ?,
        use_admin_grafic = ?, use_admin_cake = ?, 
        use_admin_date = ?, use_admin_download = ?,
        primary_color = ?, secondary_color = ?
      WHERE id = 1`,
      [
        store_name, mail_store, mail_pass, mail_resend, resend_pass,
        site_back, tel, open_hour, folder_img,
        use_admin_grafic, use_admin_cake, use_admin_date, use_admin_download,
        primary_color || '#000000', secondary_color || '#fdd111'
      ]
    );

    res.json({ success: true, message: 'Configurações atualizadas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


module.exports = router;