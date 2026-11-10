const { pool } = require('../config/db');

// Listar produtos ativos com filtro opcional por categoria ou busca
const listProdutos = async (req, res) => {
  try {
    const { busca, categoria } = req.query;
    let sql = 'SELECT * FROM baiten_produtos WHERE ativo = TRUE';
    const params = [];

    if (categoria && typeof categoria === 'string' && categoria !== 'Todas') {
      sql += ' AND categoria = ?';
      params.push(categoria);
    }

    if (busca && typeof busca === 'string' && busca.trim()) {
      sql += ' AND (nome LIKE ? OR codigo_barras LIKE ?)';
      params.push(`%${busca.trim()}%`, `%${busca.trim()}%`);
    }

    sql += ' ORDER BY categoria ASC, nome ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar produtos do Baiten:', error);
    res.status(500).json({ mensagem: 'Erro interno ao consultar produtos' });
  }
};

// Buscar produto por código de barras
const getProdutoByCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;
    if (!codigo) {
      return res.status(400).json({ mensagem: 'Código de barras não informado' });
    }

    const codigoStr = String(codigo).trim();

    const [rows] = await pool.query(
      'SELECT * FROM baiten_produtos WHERE codigo_barras = ? AND ativo = TRUE LIMIT 1',
      [codigoStr]
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensagem: 'Produto não encontrado com este código de barras' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar produto por código no Baiten:', error);
    res.status(500).json({ mensagem: 'Erro interno ao buscar produto' });
  }
};

// Buscar produto por ID
const getProdutoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM baiten_produtos WHERE id = ? AND ativo = TRUE',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensagem: 'Produto não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar produto por ID no Baiten:', error);
    res.status(500).json({ mensagem: 'Erro interno ao buscar produto' });
  }
};

// Criar novo produto (ou reativar se desativado anteriormente com o mesmo código)
const createProduto = async (req, res) => {
  try {
    const {
      codigo_barras,
      nome,
      descricao = '',
      preco_venda,
      preco_custo = 0,
      estoque_atual = 0,
      estoque_minimo = 5,
      categoria = 'Geral',
    } = req.body;

    if (!codigo_barras || !nome || preco_venda === undefined) {
      return res.status(400).json({ mensagem: 'Código de barras, nome e preço de venda são obrigatórios.' });
    }

    if (Number(preco_venda) <= 0) {
      return res.status(400).json({ mensagem: 'O preço de venda deve ser maior que zero.' });
    }

    // Verificar se o código de barras já existe
    const [existentes] = await pool.query(
      'SELECT id, ativo FROM baiten_produtos WHERE codigo_barras = ?',
      [codigo_barras.trim()]
    );

    if (existentes.length > 0) {
      if (existentes[0].ativo) {
        return res.status(409).json({ mensagem: 'Já existe um produto ativo cadastrado com este código de barras.' });
      } else {
        // Reativar e atualizar caso estivesse desativado
        await pool.query(
          `UPDATE baiten_produtos 
           SET ativo = TRUE, nome = ?, descricao = ?, preco_venda = ?, preco_custo = ?, estoque_atual = ?, estoque_minimo = ?, categoria = ? 
           WHERE id = ?`,
          [nome.trim(), descricao, preco_venda, preco_custo, estoque_atual, estoque_minimo, categoria, existentes[0].id]
        );
        return res.status(200).json({ id: existentes[0].id, mensagem: 'Produto reativado e atualizado com sucesso!' });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO baiten_produtos (codigo_barras, nome, descricao, preco_venda, preco_custo, estoque_atual, estoque_minimo, categoria, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [codigo_barras.trim(), nome.trim(), descricao, preco_venda, preco_custo, estoque_atual, estoque_minimo, categoria]
    );

    // Registra entrada inicial de estoque se for maior que zero
    if (Number(estoque_atual) > 0) {
      await pool.query(
        'INSERT INTO baiten_movimentacoes_estoque (produto_id, tipo, quantidade, motivo) VALUES (?, "ENTRADA", ?, "Estoque inicial no cadastro")',
        [result.insertId, estoque_atual]
      );
    }

    res.status(201).json({
      id: result.insertId,
      codigo_barras,
      nome,
      preco_venda,
      estoque_atual,
      mensagem: 'Produto cadastrado com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao criar produto no Baiten:', error);
    res.status(500).json({ mensagem: 'Erro interno ao cadastrar produto' });
  }
};

// Atualizar produto existente
const updateProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo_barras,
      nome,
      descricao,
      preco_venda,
      preco_custo,
      estoque_atual,
      estoque_minimo,
      categoria,
    } = req.body;

    const [produtoAtual] = await pool.query(
      'SELECT * FROM baiten_produtos WHERE id = ? AND ativo = TRUE',
      [id]
    );

    if (produtoAtual.length === 0) {
      return res.status(404).json({ mensagem: 'Produto não encontrado.' });
    }

    // Se mudou código de barras, checar se não conflita com outro produto
    if (codigo_barras && codigo_barras.trim() !== produtoAtual[0].codigo_barras) {
      const [duplicados] = await pool.query(
        'SELECT id FROM baiten_produtos WHERE codigo_barras = ? AND id != ?',
        [codigo_barras.trim(), id]
      );
      if (duplicados.length > 0) {
        return res.status(409).json({ mensagem: 'Este código de barras já está em uso por outro produto.' });
      }
    }

    const novoEstoque = estoque_atual !== undefined ? Number(estoque_atual) : produtoAtual[0].estoque_atual;
    const diferencaEstoque = novoEstoque - produtoAtual[0].estoque_atual;

    await pool.query(
      `UPDATE baiten_produtos SET 
        codigo_barras = COALESCE(?, codigo_barras),
        nome = COALESCE(?, nome),
        descricao = COALESCE(?, descricao),
        preco_venda = COALESCE(?, preco_venda),
        preco_custo = COALESCE(?, preco_custo),
        estoque_atual = ?,
        estoque_minimo = COALESCE(?, estoque_minimo),
        categoria = COALESCE(?, categoria)
       WHERE id = ?`,
      [
        codigo_barras ? codigo_barras.trim() : null,
        nome ? nome.trim() : null,
        descricao !== undefined ? descricao : null,
        preco_venda !== undefined ? preco_venda : null,
        preco_custo !== undefined ? preco_custo : null,
        novoEstoque,
        estoque_minimo !== undefined ? estoque_minimo : null,
        categoria !== undefined ? categoria : null,
        id,
      ]
    );

    // Registra movimentação de ajuste se o estoque foi alterado manualmente
    if (diferencaEstoque !== 0) {
      await pool.query(
        'INSERT INTO baiten_movimentacoes_estoque (produto_id, tipo, quantidade, motivo) VALUES (?, "AJUSTE_MANUAL", ?, "Ajuste manual via edição de produto")',
        [id, diferencaEstoque]
      );
    }

    res.json({ mensagem: 'Produto atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar produto no Baiten:', error);
    res.status(500).json({ mensagem: 'Erro interno ao atualizar produto' });
  }
};

// Excluir produto (soft-delete)
const deleteProduto = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE baiten_produtos SET ativo = FALSE WHERE id = ?', [id]);
    res.json({ mensagem: 'Produto desativado com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir produto no Baiten:', error);
    res.status(500).json({ mensagem: 'Erro interno ao excluir produto' });
  }
};

module.exports = {
  listProdutos,
  getProdutoByCodigo,
  getProdutoById,
  createProduto,
  updateProduto,
  deleteProduto,
};

