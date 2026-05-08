const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

router.post('/login', async (req, res) => {
  const { password } = req.body;

  try {
    // 1. Buscar todos os admins para verificar a senha
    const [admins] = await pool.query('SELECT * FROM admins');
    
    let authenticatedUser = null;

    // 2. Tentar encontrar qual admin corresponde a essa senha
    for (const user of admins) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        authenticatedUser = user;
        break;
      }
    }

    if (!authenticatedUser) {
      return res.status(401).json({ 
        success: false, 
        error: 'パスワードが正しくありません' 
      });
    }

    const user = authenticatedUser;

    // 3. Gerar Token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      'my_vision_88_fixed_secret_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao processar login.' 
    });
  }
});

module.exports = router;
