const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const {
  sendSameDayOrderRequestToStore,
  sendSameDayOrderRequestToClient,
  sendSameDayOrderConfirmedToClient,
  sendSameDayOrderRejectedToClient
} = require('../utils/email');

// =============================================
// POST /api/sameday-orders/request - Criar Novo Pedido Pendente (Cliente)
// =============================================
router.post('/request', async (req, res) => {
  const {
    id_client,
    first_name,
    last_name,
    tel,
    email,
    pickup_date,
    pickup_hour,
    message,
    items,
    total_amount
  } = req.body;

  if (!first_name || !last_name || !tel || !email || !pickup_hour || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: '必須項目が不足しています (Campos obrigatórios não preenchidos)'
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Inserir pedido principal com status 'pending'
    const [orderResult] = await conn.query(
      `INSERT INTO same_day_orders 
       (id_client, first_name, last_name, tel, email, pickup_date, pickup_hour, message, status, payment_method, payment_status, total_amount) 
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id_client || `client_${Date.now()}`,
        first_name,
        last_name,
        tel,
        email,
        pickup_date || new Date().toISOString().split('T')[0],
        pickup_hour,
        message || '',
        'pending',
        'store',
        'pending',
        total_amount || 0
      ]
    );

    const orderId = orderResult.insertId;

    // 2️⃣ Inserir itens do pedido
    for (const item of items) {
      await conn.query(
        `INSERT INTO same_day_order_items 
         (order_id, same_day_cake_id, cake_name, size, amount, price) 
         VALUES (?,?,?,?,?,?)`,
        [
          orderId,
          item.same_day_cake_id || item.cake_id,
          item.cake_name || item.name,
          item.size,
          item.amount || 1,
          item.price || 0
        ]
      );
    }

    await conn.commit();

    // 3️⃣ Preparar dados para e-mails
    const orderDataForEmail = {
      id_order: orderId,
      first_name,
      last_name,
      tel,
      email,
      pickup_date: pickup_date || new Date().toISOString().split('T')[0],
      pickup_hour,
      message,
      total_amount,
      items
    };

    // 4️⃣ Enviar e-mails (Loja e Cliente)
    try {
      await Promise.allSettled([
        sendSameDayOrderRequestToStore(orderDataForEmail, orderId),
        sendSameDayOrderRequestToClient(orderDataForEmail, orderId)
      ]);
    } catch (emailErr) {
      console.error('⚠️ Erro ao enviar e-mails de solicitação same-day:', emailErr);
    }

    res.status(201).json({
      success: true,
      id_order: orderId,
      message: 'ご予約リクエストを送信しました'
    });

  } catch (err) {
    await conn.rollback();
    console.error('❌ Erro ao criar solicitação de same day cake:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// =============================================
// GET /api/sameday-orders/list - Listar Pedidos (Admin)
// =============================================
router.get('/list', async (req, res) => {
  try {
    const rawSearch = (req.query.search || '').toString();
    const search = rawSearch.replace(/[\u3000]/g, ' ').trim().toLowerCase();

    let query = `
      SELECT 
        sdo.*,
        sdoi.id AS item_id,
        sdoi.same_day_cake_id,
        sdoi.cake_name,
        sdoi.size,
        sdoi.amount,
        sdoi.price,
        sdc.image AS cake_image
      FROM same_day_orders sdo
      LEFT JOIN same_day_order_items sdoi ON sdo.id_order = sdoi.order_id
      LEFT JOIN same_day_cakes sdc ON sdoi.same_day_cake_id = sdc.id
    `;

    const params = [];

    if (search) {
      query += `
        WHERE LOWER(IFNULL(sdo.first_name, '')) LIKE ? 
           OR LOWER(IFNULL(sdo.last_name, '')) LIKE ?
           OR LOWER(CONCAT(IFNULL(sdo.first_name, ''), ' ', IFNULL(sdo.last_name, ''))) LIKE ? 
           OR LOWER(CONCAT(IFNULL(sdo.last_name, ''), ' ', IFNULL(sdo.first_name, ''))) LIKE ?
           OR sdo.tel LIKE ? 
           OR LOWER(IFNULL(sdo.email, '')) LIKE ?
           OR sdo.id_order = ?
           OR CAST(sdo.id_order AS CHAR) LIKE ?
      `;
      const searchParam = `%${search}%`;
      const numSearch = Number(search) || 0;
      params.push(
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        numSearch,
        searchParam
      );
    }

    query += ' ORDER BY sdo.id_order DESC';

    const [rows] = await pool.query(query, params);

    // Agrupar itens por pedido
    const ordersMap = new Map();

    for (const row of rows) {
      if (!ordersMap.has(row.id_order)) {
        ordersMap.set(row.id_order, {
          id_order: row.id_order,
          id_client: row.id_client,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          tel: row.tel,
          pickup_date: row.pickup_date ? (row.pickup_date instanceof Date ? row.pickup_date.toISOString().split('T')[0] : String(row.pickup_date).substring(0, 10)) : null,
          pickup_hour: row.pickup_hour,
          message: row.message,
          status: row.status,
          payment_method: row.payment_method,
          payment_status: row.payment_status,
          payment_intent_id: row.payment_intent_id,
          total_amount: row.total_amount,
          created_at: row.created_at,
          items: []
        });
      }

      if (row.item_id) {
        ordersMap.get(row.id_order).items.push({
          id: row.item_id,
          same_day_cake_id: row.same_day_cake_id,
          cake_name: row.cake_name,
          size: row.size,
          amount: row.amount,
          price: row.price,
          image: row.cake_image
        });
      }
    }

    const orders = Array.from(ordersMap.values());
    res.json({ success: true, orders });

  } catch (err) {
    console.error('Erro ao listar same day orders:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================
// PUT /api/sameday-orders/:id/confirm - Confirmar Pedido (Admin)
// =============================================
router.put('/:id/confirm', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [orders] = await conn.query('SELECT * FROM same_day_orders WHERE id_order = ?', [orderId]);
    if (orders.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: '注文が見つかりません' });
    }

    const order = orders[0];
    if (order.status === 'confirmed') {
      await conn.rollback();
      return res.json({ success: true, message: '既に確定されています' });
    }

    // 1️⃣ Atualizar status para 'confirmed'
    await conn.query('UPDATE same_day_orders SET status = ? WHERE id_order = ?', ['confirmed', orderId]);

    // 2️⃣ Buscar itens e decrementar estoque em same_day_cake_sizes
    const [items] = await conn.query('SELECT * FROM same_day_order_items WHERE order_id = ?', [orderId]);
    for (const item of items) {
      await conn.query(
        'UPDATE same_day_cake_sizes SET stock = GREATEST(stock - ?, 0) WHERE same_day_cake_id = ? AND size = ?',
        [item.amount, item.same_day_cake_id, item.size]
      );
    }

    await conn.commit();

    // 3️⃣ Enviar e-mail de confirmação ao cliente
    const orderDataForEmail = {
      ...order,
      pickup_date: order.pickup_date instanceof Date ? order.pickup_date.toISOString().split('T')[0] : String(order.pickup_date).substring(0, 10),
      items
    };

    try {
      await sendSameDayOrderConfirmedToClient(orderDataForEmail, orderId);
    } catch (e) {
      console.error('⚠️ Erro ao enviar e-mail de confirmação ao cliente:', e);
    }

    res.json({
      success: true,
      message: '予約が確定され、お客様に確認メールが送信されました'
    });

  } catch (err) {
    await conn.rollback();
    console.error('Erro ao confirmar pedido same-day:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// =============================================
// PUT /api/sameday-orders/:id/reject - Recusar Pedido / Sem Estoque (Admin)
// =============================================
router.put('/:id/reject', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [orders] = await conn.query('SELECT * FROM same_day_orders WHERE id_order = ?', [orderId]);
    if (orders.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: '注文が見つかりません' });
    }

    const order = orders[0];

    // Atualizar status para 'rejected'
    await conn.query('UPDATE same_day_orders SET status = ? WHERE id_order = ?', ['rejected', orderId]);

    const [items] = await conn.query('SELECT * FROM same_day_order_items WHERE order_id = ?', [orderId]);

    await conn.commit();

    // Enviar e-mail de recusa/indisponibilidade ao cliente
    const orderDataForEmail = {
      ...order,
      pickup_date: order.pickup_date instanceof Date ? order.pickup_date.toISOString().split('T')[0] : String(order.pickup_date).substring(0, 10),
      items
    };

    try {
      await sendSameDayOrderRejectedToClient(orderDataForEmail, orderId);
    } catch (e) {
      console.error('⚠️ Erro ao enviar e-mail de indisponibilidade:', e);
    }

    res.json({
      success: true,
      message: '在庫なしとしてキャンセルされ、お客様に通知メールが送信されました'
    });

  } catch (err) {
    await conn.rollback();
    console.error('Erro ao rejeitar pedido same-day:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// =============================================
// PUT /api/sameday-orders/:id/status - Atualizar Status Geral (Admin)
// =============================================
router.put('/:id/status', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const { status, payment_status } = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [orders] = await conn.query('SELECT * FROM same_day_orders WHERE id_order = ?', [orderId]);
    if (orders.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: '注文が見つかりません' });
    }

    const order = orders[0];
    const prevStatus = order.status;

    if (status) {
      await conn.query('UPDATE same_day_orders SET status = ? WHERE id_order = ?', [status, orderId]);

      // Se cancelando um pedido que estava confirmado, devolve o estoque
      if (status === 'cancelled' && prevStatus === 'confirmed') {
        const [items] = await conn.query('SELECT * FROM same_day_order_items WHERE order_id = ?', [orderId]);
        for (const item of items) {
          await conn.query(
            'UPDATE same_day_cake_sizes SET stock = stock + ? WHERE same_day_cake_id = ? AND size = ?',
            [item.amount, item.same_day_cake_id, item.size]
          );
        }
      }
    }

    if (payment_status) {
      await conn.query('UPDATE same_day_orders SET payment_status = ? WHERE id_order = ?', [payment_status, orderId]);
    }

    await conn.commit();
    res.json({ success: true, message: 'ステータスが更新されました' });

  } catch (err) {
    await conn.rollback();
    console.error('Erro ao atualizar status same-day:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// =============================================
// GET /api/sameday-orders/public/:id - Consultar Pedido Público (Cliente)
// =============================================
router.get('/public/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const [orders] = await pool.query('SELECT * FROM same_day_orders WHERE id_order = ?', [orderId]);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: '注文が見つかりません' });
    }

    const order = orders[0];
    const [items] = await pool.query(`
      SELECT 
        sdoi.*,
        sdc.image AS cake_image
      FROM same_day_order_items sdoi
      LEFT JOIN same_day_cakes sdc ON sdoi.same_day_cake_id = sdc.id
      WHERE sdoi.order_id = ?
    `, [orderId]);

    order.pickup_date = order.pickup_date ? (order.pickup_date instanceof Date ? order.pickup_date.toISOString().split('T')[0] : String(order.pickup_date).substring(0, 10)) : null;
    order.items = items;

    res.json({ success: true, order });
  } catch (err) {
    console.error('Erro ao buscar pedido público:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================
// POST /api/sameday-orders/payment/select-store - Escolher Pagamento na Loja (Cliente)
// =============================================
router.post('/payment/select-store', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'ID do pedido obrigatório' });
    }

    await pool.query(
      'UPDATE same_day_orders SET payment_method = ?, payment_status = ? WHERE id_order = ?',
      ['store', 'pending', orderId]
    );

    res.json({ success: true, message: '店頭支払いが選択されました' });
  } catch (err) {
    console.error('Erro ao selecionar pagamento em loja:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================
// POST /api/sameday-orders/payment/confirm-card - Confirmar Pagamento com Cartão (Cliente)
// =============================================
router.post('/payment/confirm-card', async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;
    if (!orderId || !paymentIntentId) {
      return res.status(400).json({ success: false, error: 'Dados de pagamento incompletos' });
    }

    await pool.query(
      'UPDATE same_day_orders SET payment_method = ?, payment_status = ?, payment_intent_id = ? WHERE id_order = ?',
      ['card', 'paid', paymentIntentId, orderId]
    );

    res.json({ success: true, message: '事前決済が完了しました' });
  } catch (err) {
    console.error('Erro ao confirmar pagamento com cartão:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
