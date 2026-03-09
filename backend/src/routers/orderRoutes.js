const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Certifique-se de que o caminho está correto
const { 
    sendNewOrderConfirmation, 
    sendOrderUpdateNotification, 
    sendCancellationNotification,
    sendOrderCompletedNotification
} = require('../utils/email'); 


// POST /api/reservar - Criar Novo Pedido
router.post('/reservar', async (req, res) => {
  const newOrder = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // 1️⃣ Inserir pedido
    const [orderResult] = await conn.query(
      'INSERT INTO orders (first_name,last_name,tel,email,date,pickupHour,status,message) VALUES (?,?,?,?,?,?,?,?)',
      [newOrder.first_name,newOrder.last_name,newOrder.tel,newOrder.email,newOrder.date,newOrder.pickupHour,newOrder.status,newOrder.message]
    );

    const orderId = orderResult.insertId;
    
    // 2️⃣ Inserir relação pedido <-> bolos e atualizar estoque
    for (const orderCake of newOrder.cakes) {
      // Buscar o preço da tabela cake_sizes
      // const [priceResult] = await conn.query(
      //   'SELECT price FROM cake_sizes WHERE cake_id=? AND size=?',
      //   [orderCake.cake_id, orderCake.size]
      // );
      
      // const price = priceResult[0]?.price;
      
      // inserir na tabela order_cakes
      await conn.query(
        'INSERT INTO order_cakes (order_id, cake_id, size, amount, message_cake, fruit_option) VALUES (?,?,?,?,?,?)',
        [orderId, orderCake.cake_id, orderCake.size, orderCake.amount, orderCake.message_cake, orderCake.fruit_option]
      );
      
      // atualizar estoque
      await conn.query(
        'UPDATE cake_sizes SET stock = GREATEST(stock - ?, 0) WHERE cake_id=? AND size=?',
        [orderCake.amount, orderCake.cake_id, orderCake.size]
      );
    }
    
    // 3️⃣ Buscar informações completas dos bolos para o email
    const [cakesWithDetails] = await conn.query(
      `SELECT oc.*, c.name, c.image, cs.price
       FROM order_cakes oc 
       JOIN cakes c ON oc.cake_id = c.id 
       JOIN cake_sizes cs ON oc.cake_id = cs.cake_id AND oc.size = cs.size
       WHERE oc.order_id = ?`,
      [orderId]
    );

    // console.log('🍰 Bolos com detalhes (POST):', cakesWithDetails);

    // 4️⃣ Preparar dados completos para o email
    const orderDataForEmail = {
      ...newOrder,
      cakes: cakesWithDetails.map(cake => ({
        cake_id: cake.cake_id,
        name: cake.name,
        image: cake.image,
        amount: cake.amount,
        size: cake.size,
        message_cake: cake.message_cake,
        price: cake.price,
        fruit_option: cake.fruit_option
      }))
    };

    // 5️⃣ Enviar Email de Confirmação (usando utilitário)
    await sendNewOrderConfirmation(orderDataForEmail, orderId);

    await conn.commit();
    res.json({ success: true, id: orderId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// PUT /api/orders/:id_order - Editar Pedido (Administrador)
router.put('/orders/:id_order', async (req, res) => {
  const {
    first_name, last_name, email, tel, date, pickupHour, message, cakes, status
  } = req.body;

  const id_order = parseInt(req.params.id_order, 10);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Verificar pedido existente
    const [existingOrder] = await conn.query('SELECT * FROM orders WHERE id_order = ?', [id_order]);
    if (existingOrder.length === 0) {
      throw new Error('Pedido não encontrado');
    }
    const previousStatus = existingOrder[0].status;

    // 2. Atualizar dados principais
    await conn.query(
      `UPDATE orders 
       SET first_name = ?, last_name = ?, email = ?, tel = ?, 
           date = ?, pickupHour = ?, message = ?, status = ?
       WHERE id_order = ?`,
      [first_name, last_name, email, tel, date, pickupHour, message, status, id_order]
    );

    const [existingCakes] = await conn.query(
      `SELECT oc.*, c.name, c.image 
       FROM order_cakes oc 
       JOIN cakes c ON oc.cake_id = c.id 
       WHERE oc.order_id = ?`,
      [id_order]
    );

    // 3. Remover cakes antigos e inserir novos (Simplificando a lógica complexa de estoque para apenas remoção/inserção)
    // O ideal seria implementar a função `adjustStock` para gerenciar as diferenças com precisão.
    // Por enquanto, usaremos a lógica de cancelamento/reativação baseada no status.
    await conn.query('DELETE FROM order_cakes WHERE order_id = ?', [id_order]);
    for (const cake of cakes) {
      await conn.query(
        `INSERT INTO order_cakes (order_id, cake_id, amount, size, message_cake, fruit_option)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [id_order, cake.cake_id, cake.amount, cake.size, cake.message_cake || '', cake.fruit_option]
      );
    }

    const [newCakesWithDetails] = await conn.query(
       `SELECT oc.*, c.name, c.image, cs.price
       FROM order_cakes oc 
       JOIN cakes c ON oc.cake_id = c.id 
       JOIN cake_sizes cs ON oc.cake_id = cs.cake_id AND oc.size = cs.size
       WHERE oc.order_id = ?`,
       [id_order]
    );

    // 4. Lógica de estoque para cancelamento/reativação
    if (status === 'e' && previousStatus !== 'e') {
      // Cancelamento - devolver estoque
      for (const cake of cakes) {
        await conn.query(
          'UPDATE cake_sizes SET stock = stock + ? WHERE cake_id = ? AND size = ?',
          [cake.amount, cake.cake_id, cake.size]
        );
      }
    } else if (previousStatus === 'e' && status !== 'e') {
      // Reativação - remover estoque novamente
      for (const cake of cakes) {
        await conn.query(
          'UPDATE cake_sizes SET stock = stock - ? WHERE cake_id = ? AND size = ?',
          [cake.amount, cake.cake_id, cake.size]
        );
      }
    }

    // 5. Enviar Email de Atualização (usando utilitário)
    const orderDataForEmail = { 
      id_order, first_name, last_name, email, date, pickupHour, message, 
      cakes:  newCakesWithDetails.map(cake => ({
        cake_id: cake.cake_id,
        name: cake.name,
        image: cake.image,
        amount: cake.amount,
        size: cake.size,
        message_cake: cake.message_cake,
        price: cake.price,
        fruit_option: cake.fruit_option
      }))
    };

    // console.log('📧 Dados para email:', orderDataForEmail);

    await sendOrderUpdateNotification(orderDataForEmail);
    
    await conn.commit();
    res.json({ success: true, message: 'Pedido atualizado com sucesso', id_order });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});


// PUT /api/reservar/:id_order - Atualizar Apenas Status (Cancelamento/Finalização)
router.put('/reservar/:id_order', async (req, res) => {
  const { status } = req.body;
  const id_order = parseInt(req.params.id_order, 10);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // pega pedido atual
    const [rows] = await conn.query('SELECT * FROM orders WHERE id_order=?', [id_order]);
    if (rows.length === 0) throw new Error('Pedido não encontrado');
    const order = rows[0];
    const previousStatus = order.status;

    // 1. Atualizar status
    await conn.query('UPDATE orders SET status=? WHERE id_order=?', [status, id_order]);

    // 2. Se for cancelamento, devolver estoque e enviar email
    if (status === 'e' && previousStatus !== 'e') {
      const [orderCakes] = await conn.query('SELECT * FROM order_cakes WHERE order_id=?', [id_order]);
      
      // Devolver estoque
      for (const oc of orderCakes) {
        await conn.query('UPDATE cake_sizes SET stock = stock + ? WHERE cake_id=? AND size=?', [oc.amount, oc.cake_id, oc.size]);
      }
      
      // Buscar detalhes dos bolos para o email
      const [cakesDetails] = await conn.query(`
        SELECT oc.*, c.name 
        FROM order_cakes oc 
        JOIN cakes c ON oc.cake_id = c.id 
        WHERE oc.order_id = ?
      `, [id_order]);
      
      await sendCancellationNotification(order, cakesDetails);
    }

    if(status === 'd') {
      await sendOrderCompletedNotification(order);
    }
    
    // 3. Se for reativação, remover estoque
    if (status !== 'e' && previousStatus === 'e') {
      const [orderCakes] = await conn.query('SELECT * FROM order_cakes WHERE order_id=?', [id_order]);
      for (const oc of orderCakes) {
        await conn.query('UPDATE cake_sizes SET stock = stock - ? WHERE cake_id=? AND size=?', [oc.amount, oc.cake_id, oc.size]);
      }
    }

    await conn.commit();
    res.json({ success: true, message:'Status atualizado', id_order });
  } catch(err){
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success:false, error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/list - Listar Pedidos
router.get('/list', async (req, res) => {
  try {
    const search = (req.query.search || '').toString().trim().toLowerCase();
    let query = `
      SELECT 
        o.*, 
        o.created_at as date_order,
        oc.id AS order_cake_id,
        oc.cake_id,
        c.name AS cake_name,
        oc.size,
        oc.amount,
        oc.message_cake,
        oc.fruit_option,
        cs.price AS price,
        cs.stock AS stock
      FROM orders o
      LEFT JOIN order_cakes oc ON o.id_order = oc.order_id
      LEFT JOIN cakes c ON oc.cake_id = c.id
      LEFT JOIN cake_sizes cs ON cs.cake_id = oc.cake_id AND cs.size = oc.size
    `;
    
    const params = [];

    if (search) {
      query += `
        WHERE LOWER(CONCAT(o.first_name, o.last_name)) LIKE ? 
        OR o.tel LIKE ? 
        OR o.id_order = ?
      `;
      params.push(`%${search}%`, `%${search}%`, Number(search) || 0);
    }

    query += ' ORDER BY o.id_order DESC';

    const [rows] = await pool.query(query, params);

    // 🔹 Agrupar os bolos dentro de cada pedido
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
          date: row.date ? row.date.toISOString().split('T')[0] : null,
          date_order: row.date_order,
          pickupHour: row.pickupHour,
          message: row.message,
          status: row.status,
          cakes: []
        });
      }

      if (row.cake_id) {
        ordersMap.get(row.id_order).cakes.push({
          id: row.order_cake_id,
          cake_id: row.cake_id,
          name: row.cake_name,
          size: row.size,
          amount: row.amount,
          message_cake: row.message_cake,
          fruit_option: row.fruit_option,
          price: row.price,
          stock: row.stock
        });
      }
    }

    const orders = Array.from(ordersMap.values());
    res.json({ success: true, orders });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;