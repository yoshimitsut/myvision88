const express = require('express');
// const { v4: uuidv4 } = require('uuid');
const { squareApiClient } = require('../config/square');

const router = express.Router();

// Rota de teste (para verificar se está funcionando)
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Rota de pagamento funcionando!'
  });
});


router.post('/', async (req, res) => {
  try {
    const { sourceId, amount, currency = 'JPY' } = req.body;
    
    console.log('Requisição de pagamento recebida:', { sourceId, amount, currency });
    
    // Validações básicas
    if (!sourceId) {
      console.log('Erro: sourceId ausente');
      return res.status(400).json({
        success: false,
        errors: [{ detail: 'sourceId é obrigatório' }]
      });
    }

    if (!amount || amount <= 0) {
      console.log('Erro: amount inválido', amount);
      return res.status(400).json({
        success: false,
        errors: [{ detail: 'amount inválido' }]
      });
    }

    // Simular processamento (versão mock)
    console.log('Processando pagamento...');
    
    // Simular sucesso
    const mockPayment = {
      id: `payment_${Date.now()}`,
      status: 'COMPLETED',
      amount_money: {
        amount: amount,
        currency: currency
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Pagamento processado com sucesso:', mockPayment);
    
    res.json({
      success: true,
      payment: mockPayment
    });

  } catch (error) {
    console.error('Erro no processamento:', error);
    res.status(500).json({
      success: false,
      errors: [{ detail: error.message || 'Erro interno' }]
    });
  }
});

module.exports = router;