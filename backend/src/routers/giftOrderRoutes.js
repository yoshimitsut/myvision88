const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { sendNewGiftOrderConfirmation } = require('../utils/email');
const { cancelStripePayment } = require('../services/stripeService');

// =============================================
// POST /api/gift-orders/reservar - Criar Novo Pedido de Gift
// =============================================
router.post('/reservar', async (req, res) => {
  const newOrder = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Inserir pedido principal
    const [orderResult] = await conn.query(
      `INSERT INTO gift_orders 
       (first_name, last_name, tel, email, delivery_method, 
        postal_code, prefecture, city, address1, address2,
        status, message, payment_intent_id, payment_status, total_amount) 
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        newOrder.first_name,
        newOrder.last_name,
        newOrder.tel,
        newOrder.email,
        newOrder.delivery_method || 'pickup',
        newOrder.postal_code || null,
        newOrder.prefecture || null,
        newOrder.city || null,
        newOrder.address1 || null,
        newOrder.address2 || null,
        newOrder.status || 'b',
        newOrder.message || '',
        newOrder.payment_intent_id || null,
        newOrder.payment_intent_id ? 'paid' : 'pending',
        newOrder.total_amount || 0
      ]
    );

    const orderId = orderResult.insertId;

    // 2️⃣ Inserir itens do pedido e atualizar estoque
    for (const item of newOrder.items) {
      await conn.query(
        'INSERT INTO gift_order_items (order_id, gift_id, size, amount, price) VALUES (?,?,?,?,?)',
        [orderId, item.gift_id, item.size, item.amount, item.price]
      );

      // Atualizar estoque
      await conn.query(
        'UPDATE gift_sizes SET stock = GREATEST(stock - ?, 0) WHERE gift_id=? AND size=?',
        [item.amount, item.gift_id, item.size]
      );
    }

    // 3️⃣ Buscar informações completas dos itens para o email
    const [itemsWithDetails] = await conn.query(
      `SELECT goi.*, g.name, g.image, gs.price
       FROM gift_order_items goi 
       JOIN gift g ON goi.gift_id = g.id 
       JOIN gift_sizes gs ON goi.gift_id = gs.gift_id AND goi.size = gs.size
       WHERE goi.order_id = ?`,
      [orderId]
    );

    // 4️⃣ Preparar dados completos para o email
    const orderDataForEmail = {
      ...newOrder,
      items: itemsWithDetails.map(item => ({
        gift_id: item.gift_id,
        name: item.name,
        image: item.image,
        amount: item.amount,
        size: item.size,
        price: item.price
      }))
    };

    // 5️⃣ Enviar Email de Confirmação
    try {
      await sendNewGiftOrderConfirmation(orderDataForEmail, orderId);
    } catch (emailErr) {
      console.error('⚠️ Erro ao enviar email de gift order (pedido salvo):', emailErr.message);
    }

    await conn.commit();
    res.json({ success: true, id: orderId, payment_intent_id: newOrder.payment_intent_id });
  } catch (err) {
    await conn.rollback();
    console.error('❌ Erro ao criar pedido de gift:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// =============================================
// GET /api/gift-orders/list - Listar Pedidos de Gift
// =============================================
router.get('/list', async (req, res) => {
  try {
    const search = (req.query.search || '').toString().trim().toLowerCase();
    let query = `
      SELECT 
        go.*, 
        go.created_at as date_order,
        goi.id AS order_item_id,
        goi.gift_id,
        g.name AS gift_name,
        g.image AS gift_image,
        goi.size,
        goi.amount,
        goi.price
      FROM gift_orders go
      LEFT JOIN gift_order_items goi ON go.id_order = goi.order_id
      LEFT JOIN gift g ON goi.gift_id = g.id
    `;

    const params = [];

    if (search) {
      query += `
        WHERE LOWER(CONCAT(go.first_name, go.last_name)) LIKE ? 
        OR go.tel LIKE ? 
        OR go.id_order = ?
      `;
      params.push(`%${search}%`, `%${search}%`, Number(search) || 0);
    }

    query += ' ORDER BY go.id_order DESC';

    const [rows] = await pool.query(query, params);

    // Agrupar os itens dentro de cada pedido
    const ordersMap = new Map();

    for (const row of rows) {
      if (!ordersMap.has(row.id_order)) {
        ordersMap.set(row.id_order, {
          id_order: row.id_order,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          tel: row.tel,
          delivery_method: row.delivery_method,
          postal_code: row.postal_code,
          prefecture: row.prefecture,
          city: row.city,
          address1: row.address1,
          address2: row.address2,
          date_order: row.date_order,
          message: row.message,
          status: row.status,
          payment_status: row.payment_status,
          payment_intent_id: row.payment_intent_id,
          total_amount: row.total_amount,
          items: []
        });
      }

      if (row.gift_id) {
        ordersMap.get(row.id_order).items.push({
          id: row.order_item_id,
          gift_id: row.gift_id,
          name: row.gift_name,
          image: row.gift_image,
          size: row.size,
          amount: row.amount,
          price: row.price
        });
      }
    }

    const orders = Array.from(ordersMap.values());
    res.json({ success: true, orders });

  } catch (err) {
    console.error('❌ Erro ao listar pedidos de gift:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================
// PUT /api/gift-orders/:id_order - Atualizar Status do Pedido
// =============================================
router.put('/:id_order', async (req, res) => {
  const { status } = req.body;
  const id_order = parseInt(req.params.id_order, 10);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM gift_orders WHERE id_order=?', [id_order]);
    if (rows.length === 0) throw new Error('Pedido não encontrado');
    const order = rows[0];
    const previousStatus = order.status;

    let stripeResult = null;

    // Se for cancelamento e tem payment_intent_id, cancelar no Stripe
    if (status === 'e' && previousStatus !== 'e' && order.payment_intent_id) {
      console.log(`🔄 Cancelando pagamento Stripe (gift): ${order.payment_intent_id}`);
      try {
        stripeResult = await cancelStripePayment(order.payment_intent_id);
      } catch (stripeError) {
        console.error('❌ Erro Stripe:', stripeError.message);
        stripeResult = { success: false, error: stripeError.message };
      }
    }

    // Atualizar status
    await conn.query('UPDATE gift_orders SET status=? WHERE id_order=?', [status, id_order]);

    // Se for cancelamento, devolver estoque
    if (status === 'e' && previousStatus !== 'e') {
      const [orderItems] = await conn.query('SELECT * FROM gift_order_items WHERE order_id=?', [id_order]);
      for (const item of orderItems) {
        await conn.query(
          'UPDATE gift_sizes SET stock = stock + ? WHERE gift_id=? AND size=?',
          [item.amount, item.gift_id, item.size]
        );
      }
    }

    // Se for reativação, remover estoque novamente
    if (previousStatus === 'e' && status !== 'e') {
      const [orderItems] = await conn.query('SELECT * FROM gift_order_items WHERE order_id=?', [id_order]);
      for (const item of orderItems) {
        await conn.query(
          'UPDATE gift_sizes SET stock = GREATEST(stock - ?, 0) WHERE gift_id=? AND size=?',
          [item.amount, item.gift_id, item.size]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Status atualizado', id_order, stripe: stripeResult });

  } catch (err) {
    await conn.rollback();
    console.error('❌ Erro ao atualizar pedido de gift:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
