const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET all same day time slots
router.get('/', async (req, res) => {
  try {
    const [slots] = await pool.query('SELECT * FROM same_day_time_slots ORDER BY time ASC');
    res.json({ success: true, timeslots: slots });
  } catch (err) {
    console.error('Erro ao buscar same_day_time_slots:', err);
    res.status(500).json({ success: false, error: 'Erro ao buscar horários' });
  }
});

// POST new time slot
router.post('/', async (req, res) => {
  try {
    const { time, is_active } = req.body;
    
    if (!time || !time.trim()) {
      return res.status(400).json({ success: false, error: 'O horário é obrigatório' });
    }

    const isActiveVal = (is_active === undefined || is_active) ? 1 : 0;
    
    // Check if time already exists
    const [existing] = await pool.query('SELECT * FROM same_day_time_slots WHERE time = ?', [time.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Este horário já existe' });
    }

    const [result] = await pool.query(
      'INSERT INTO same_day_time_slots (time, is_active) VALUES (?, ?)',
      [time.trim(), isActiveVal]
    );

    res.status(201).json({
      success: true,
      timeslot: {
        id: result.insertId,
        time: time.trim(),
        is_active: isActiveVal
      }
    });
  } catch (err) {
    console.error('Erro ao criar same_day_time_slot:', err);
    res.status(500).json({ success: false, error: 'Erro ao criar horário' });
  }
});

// PUT update time slot
router.put('/:id', async (req, res) => {
  try {
    const { time, is_active } = req.body;
    const { id } = req.params;
    
    const isActiveVal = (is_active === undefined || is_active) ? 1 : 0;

    await pool.query(
      'UPDATE same_day_time_slots SET time = ?, is_active = ? WHERE id = ?',
      [time.trim(), isActiveVal, id]
    );

    res.json({ success: true, message: 'Horário atualizado com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar same_day_time_slot:', err);
    res.status(500).json({ success: false, error: 'Erro ao atualizar horário' });
  }
});

// DELETE time slot
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM same_day_time_slots WHERE id = ?', [id]);
    res.json({ success: true, message: 'Horário removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover same_day_time_slot:', err);
    res.status(500).json({ success: false, error: 'Erro ao remover horário' });
  }
});

module.exports = router;
