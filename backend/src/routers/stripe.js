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
      payment_method_types: ['card'],
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

// 🆕 ROTA PARA CANCELAR/REEMBOLSAR PAGAMENTO
router.post('/cancel-payment', async (req, res) => {
  try {
    const { paymentIntentId, reason = 'requested_by_customer' } = req.body;

    console.log(`🔄 Processando cancelamento do PaymentIntent: ${paymentIntentId}`);

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'PaymentIntent ID é obrigatório'
      });
    }

    // Buscar o PaymentIntent atual
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(`📊 Status atual do pagamento: ${paymentIntent.status}`);

    let result;

    // Verificar status e decidir ação
    switch (paymentIntent.status) {
      case 'succeeded':
        // Pagamento já foi capturado - criar reembolso
        console.log('💰 Criando reembolso...');
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: reason,
          metadata: {
            cancellation_reason: reason,
            canceled_at: new Date().toISOString()
          }
        });

        result = {
          success: true,
          action: 'refund',
          refundId: refund.id,
          amount: refund.amount,
          status: refund.status,
          message: 'Reembolso criado com sucesso'
        };
        break;

      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        // Pagamento ainda não foi confirmado - apenas cancelar
        console.log('❌ Cancelando pagamento não confirmado...');
        const canceled = await stripe.paymentIntents.cancel(paymentIntentId);

        result = {
          success: true,
          action: 'cancel',
          paymentIntentId: canceled.id,
          status: canceled.status,
          message: 'Pagamento cancelado com sucesso'
        };
        break;

      case 'canceled':
        // Já está cancelado
        result = {
          success: true,
          action: 'already_canceled',
          message: 'Este pagamento já foi cancelado anteriormente'
        };
        break;

      default:
        // Outros status não tratados
        result = {
          success: false,
          action: 'not_supported',
          status: paymentIntent.status,
          message: `Não é possível cancelar/reembolsar pagamento com status: ${paymentIntent.status}`
        };
    }

    console.log(`✅ Resultado: ${result.action} - ${result.message}`);

    res.json(result);

  } catch (error) {
    console.error('❌ Erro ao cancelar/reembolsar pagamento:', error);

    res.status(500).json({
      success: false,
      error: 'Erro ao processar cancelamento',
      details: error.message,
      type: error.type
    });
  }
});

// 🆕 ROTA PARA VERIFICAR STATUS DO PAGAMENTO
router.get('/payment-status/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'PaymentIntent ID é obrigatório'
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      created: paymentIntent.created,
      metadata: paymentIntent.metadata
    });

  } catch (error) {
    console.error('❌ Erro ao buscar status do pagamento:', error);

    res.status(500).json({
      success: false,
      error: 'Erro ao buscar status',
      details: error.message
    });
  }
});

module.exports = router;