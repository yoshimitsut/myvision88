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
    
    res.json(rows[0]);
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
      use_admin_grafic, use_admin_cake, use_admin_date, use_admin_download
    } = req.body;

    await pool.query(
      `UPDATE store_info SET 
        store_name = ?, mail_store = ?, mail_pass = ?, 
        mail_resend = ?, resend_pass = ?, site_back = ?,
        tel = ?, open_hour = ?, folder_img = ?,
        use_admin_grafic = ?, use_admin_cake = ?, 
        use_admin_date = ?, use_admin_download = ?
      WHERE id = 1`,
      [
        store_name, mail_store, mail_pass, mail_resend, resend_pass,
        site_back, tel, open_hour, folder_img,
        use_admin_grafic, use_admin_cake, use_admin_date, use_admin_download
      ]
    );

    res.json({ success: true, message: 'Configurações atualizadas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


module.exports = router;