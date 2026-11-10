const express = require('express');
const router = express.Router();

const produtoController = require('../controllers/produtoController');
const vendaController = require('../controllers/vendaController');
const { initBaitenTables } = require('../config/db');

// Middleware para garantir que as tabelas existem na primeira requisição
router.use(async (req, res, next) => {
  try {
    await initBaitenTables();
  } catch (err) {
    // Continua mesmo se der erro no check (logs no console)
  }
  next();
});

// Health check do Baiten
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    sistema: 'MyVision88 - Módulo Seinenkai Baiten',
    timestamp: new Date().toISOString(),
  });
});

// Rotas de Produtos
router.get('/produtos', produtoController.listProdutos);
router.get('/produtos/codigo/:codigo', produtoController.getProdutoByCodigo);
router.get('/produtos/:id', produtoController.getProdutoById);
router.post('/produtos', produtoController.createProduto);
router.put('/produtos/:id', produtoController.updateProduto);
router.delete('/produtos/:id', produtoController.deleteProduto);

// Rotas de Vendas
router.get('/vendas', vendaController.listVendas);
router.get('/vendas/:id', vendaController.getVendaById);
router.post('/vendas', vendaController.createVenda);

module.exports = router;

