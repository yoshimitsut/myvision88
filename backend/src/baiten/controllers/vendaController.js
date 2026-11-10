const { pool } = require('../config/db');

// Realizar venda com controle ACID e baixa automática de estoque
const createVenda = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      forma_pagamento,
      valor_pago = 0,
      observacoes = '',
      itens,
    } = req.body;

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ mensagem: 'A venda deve conter pelo menos um item.' });
    }

    if (!forma_pagamento) {
      return res.status(400).json({ mensagem: 'Forma de pagamento é obrigatória.' });
    }

    // Inicia transação ACID
    await connection.beginTransaction();

    let valorTotal = 0;
    const itensProcessados = [];

    for (const item of itens) {
      const qtd = Number(item.quantidade);
      if (!qtd || qtd <= 0) {
        throw new Error('A quantidade de cada produto deve ser maior que zero.');
      }

      // Bloqueia a linha do produto no banco para leitura e escrita até o commit (FOR UPDATE)
      const [rows] = await connection.query(
        'SELECT id, nome, codigo_barras, preco_venda, estoque_atual FROM baiten_produtos WHERE id = ? AND ativo = TRUE FOR UPDATE',
        [item.produto_id]
      );

      if (rows.length === 0) {
        throw new Error(`Produto com ID ${item.produto_id} não encontrado ou inativo.`);
      }

      const produto = rows[0];

      if (produto.estoque_atual < qtd) {
        throw new Error(
          `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque_atual}, Solicitado: ${qtd}.`
        );
      }

      const precoUnitario = Number(produto.preco_venda);
      const subtotal = Number((precoUnitario * qtd).toFixed(2));
      valorTotal += subtotal;

      itensProcessados.push({
        produto_id: produto.id,
        nome: produto.nome,
        codigo_barras: produto.codigo_barras,
        quantidade: qtd,
        preco_unitario: precoUnitario,
        subtotal,
      });

      // Baixa imediata de estoque do produto
      await connection.query(
        'UPDATE baiten_produtos SET estoque_atual = estoque_atual - ? WHERE id = ?',
        [qtd, produto.id]
      );
    }

    valorTotal = Number(valorTotal.toFixed(2));

    const pagoFinal = forma_pagamento === 'DINHEIRO' ? Number(valor_pago || valorTotal) : valorTotal;
    const troco = forma_pagamento === 'DINHEIRO' ? Math.max(0, Number((pagoFinal - valorTotal).toFixed(2))) : 0;

    if (forma_pagamento === 'DINHEIRO' && pagoFinal < valorTotal) {
      throw new Error(`Valor pago (R$ ${pagoFinal.toFixed(2)}) é menor que o valor total da compra (R$ ${valorTotal.toFixed(2)}).`);
    }

    // Gera código legível para a venda
    const codigoVenda = `VND-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // Grava cabeçalho da venda
    const [vendaResult] = await connection.query(
      `INSERT INTO baiten_vendas (codigo_venda, valor_total, valor_pago, troco, forma_pagamento, status, observacoes)
       VALUES (?, ?, ?, ?, ?, 'CONCLUIDA', ?)`,
      [codigoVenda, valorTotal, pagoFinal, troco, forma_pagamento, observacoes]
    );

    const vendaId = vendaResult.insertId;

    // Grava itens e movimentações de estoque
    for (const item of itensProcessados) {
      await connection.query(
        `INSERT INTO baiten_itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
      );

      await connection.query(
        `INSERT INTO baiten_movimentacoes_estoque (produto_id, tipo, quantidade, venda_id, motivo)
         VALUES (?, 'SAIDA_VENDA', ?, ?, ?)`,
        [item.produto_id, -item.quantidade, vendaId, `Venda realizada #${codigoVenda}`]
      );
    }

    // Confirma todas as alterações
    await connection.commit();

    res.status(201).json({
      mensagem: 'Venda realizada com sucesso!',
      venda: {
        id: vendaId,
        codigo_venda: codigoVenda,
        valor_total: valorTotal,
        valor_pago: pagoFinal,
        troco,
        forma_pagamento,
        status: 'CONCLUIDA',
        itens: itensProcessados,
      },
    });
  } catch (error) {
    // Reverte em caso de qualquer falha
    await connection.rollback();
    console.error('Erro na transação de venda do Baiten:', error);
    res.status(400).json({ mensagem: error.message || 'Falha ao processar venda.' });
  } finally {
    connection.release();
  }
};

// Listar vendas e resumo financeiro
const listVendas = async (req, res) => {
  try {
    const { data_inicio, data_fim, limite = 50 } = req.query;
    let sql = 'SELECT * FROM baiten_vendas WHERE 1=1';
    const params = [];

    if (data_inicio && typeof data_inicio === 'string') {
      sql += ' AND criado_em >= ?';
      params.push(`${data_inicio} 00:00:00`);
    }

    if (data_fim && typeof data_fim === 'string') {
      sql += ' AND criado_em <= ?';
      params.push(`${data_fim} 23:59:59`);
    }

    sql += ' ORDER BY criado_em DESC LIMIT ?';
    params.push(Number(limite));

    const [vendas] = await pool.query(sql, params);

    // Métricas resumidas
    const [resumo] = await pool.query(`
      SELECT 
        COUNT(*) as total_vendas,
        COALESCE(SUM(valor_total), 0) as faturamento_total,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'DINHEIRO' THEN valor_total ELSE 0 END), 0) as total_dinheiro,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'PIX' THEN valor_total ELSE 0 END), 0) as total_pix,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('CARTAO_CREDITO', 'CARTAO_DEBITO') THEN valor_total ELSE 0 END), 0) as total_cartao
      FROM baiten_vendas
      WHERE status = 'CONCLUIDA'
    `);

    res.json({
      vendas,
      resumo: resumo[0] || {
        total_vendas: 0,
        faturamento_total: 0,
        total_dinheiro: 0,
        total_pix: 0,
        total_cartao: 0,
      },
    });
  } catch (error) {
    console.error('Erro ao listar vendas do Baiten:', error);
    res.status(500).json({ mensagem: 'Erro interno ao listar vendas' });
  }
};

// Buscar detalhes de uma venda pelo ID
const getVendaById = async (req, res) => {
  try {
    const { id } = req.params;

    const [vendas] = await pool.query(
      'SELECT * FROM baiten_vendas WHERE id = ?',
      [id]
    );

    if (vendas.length === 0) {
      return res.status(404).json({ mensagem: 'Venda não encontrada' });
    }

    const [itens] = await pool.query(
      `SELECT iv.*, p.nome, p.codigo_barras 
       FROM baiten_itens_venda iv
       JOIN baiten_produtos p ON iv.produto_id = p.id
       WHERE iv.venda_id = ?`,
      [id]
    );

    res.json({
      ...vendas[0],
      itens,
    });
  } catch (error) {
    console.error('Erro ao buscar venda do Baiten:', error);
    res.status(500).json({ mensagem: 'Erro interno ao buscar venda' });
  }
};

module.exports = {
  createVenda,
  listVendas,
  getVendaById,
};

