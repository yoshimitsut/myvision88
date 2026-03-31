// backend/routes/stripe.js
const express = require('express');
const Stripe = require('stripe');
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔑 Stripe inicializado com chave:', process.env.STRIPE_SECRET_KEY ? '✅ Configurada' : '❌ Não configurada');

// Middleware para garantir que todas as respostas são JSON
router.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Rota de teste primeiro
router.get('/stripe-test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Rota Stripe funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Criar PaymentIntent
router.post('/create-payment-intent', async (req, res) => {
  try {
    console.log('📥 Recebendo requisição:', {
      body: req.body,
      amount: req.body.amount,
      currency: req.body.currency
    });
    
    const { amount, currency, orderData } = req.body;
    
    // Validações
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Amount inválido',
        details: 'O valor do pagamento é obrigatório e deve ser maior que zero'
      });
    }
    
    if (!currency) {
      return res.status(400).json({ 
        error: 'Currency inválida',
        details: 'A moeda é obrigatória'
      });
    }
    
    console.log(`🟡 Criando PaymentIntent de ${amount} ${currency}`);
    
    // Criar PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      metadata: {
        orderName: orderData?.customer?.lastName + ' ' + orderData?.customer?.firstName || 'Cliente',
        orderEmail: orderData?.customer?.email || '',
        orderPhone: orderData?.customer?.tel || '',
        pickupDate: orderData?.pickupDate || '',
        pickupTime: orderData?.pickupTime || '',
      },
      description: `Pedido de bolo - ${orderData?.customer?.lastName || 'Cliente'}`,
      receipt_email: orderData?.customer?.email || undefined,
    });
    
    console.log(`✅ PaymentIntent criado: ${paymentIntent.id}`);
    
    // Resposta JSON
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar PaymentIntent:', error);
    
    // Retornar erro em formato JSON
    res.status(500).json({ 
      success: false,
      error: 'Erro ao criar pagamento',
      details: error.message,
      type: error.type
    });
  }
});

module.exports = router;