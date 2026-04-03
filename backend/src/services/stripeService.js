// backend/src/services/stripeService.js
const Stripe = require('stripe');

let stripe = null;

function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY não configurada');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

async function cancelStripePayment(paymentIntentId, reason = 'requested_by_customer') {
  const stripe = getStripe();

  if (!paymentIntentId) {
    console.log('⚠️ Nenhum payment_intent_id fornecido');
    return {
      success: false,
      error: 'PaymentIntent ID é obrigatório',
      message: 'Pedido não possui pagamento online'
    };
  }

  try {
    console.log(`🔄 Processando cancelamento: ${paymentIntentId}`);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(`📊 Status atual: ${paymentIntent.status}`);

    if (paymentIntent.status === 'succeeded') {
      // Verificar se já existe reembolso
      const refunds = await stripe.refunds.list({
        payment_intent: paymentIntentId,
        limit: 1
      });

      if (refunds.data.length > 0) {
        console.log('⚠️ Reembolso já existe para este pagamento');
        return {
          success: true,
          action: 'already_refunded',
          refundId: refunds.data[0].id,
          message: 'Reembolso já foi processado anteriormente'
        };
      }
    }

    switch (paymentIntent.status) {
      case 'succeeded':
        console.log('💰 Criando reembolso...');
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: 'requested_by_customer',
          metadata: {
            cancelled_by: 'admin',
            cancelled_at: new Date().toISOString(),
            order_cancel_reason: 'admin_cancelled'
          }
        });

        return {
          success: true,
          action: 'refund',
          refundId: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          message: 'Reembolso criado com sucesso'
        };

      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        console.log('❌ Cancelando pagamento pendente...');
        await stripe.paymentIntents.cancel(paymentIntentId);

        return {
          success: true,
          action: 'cancel',
          message: 'Pagamento cancelado com sucesso'
        };

      case 'canceled':
        return {
          success: true,
          action: 'already_canceled',
          message: 'Pagamento já estava cancelado'
        };

      default:
        return {
          success: false,
          action: 'not_supported',
          status: paymentIntent.status,
          message: `Não é possível cancelar pagamento com status: ${paymentIntent.status}`
        };
    }

  } catch (error) {
    console.error('❌ Erro no Stripe:', error.message);
    return {
      success: false,
      error: error.message,
      code: error.code,
      message: 'Erro na comunicação com Stripe'
    };
  }
}

module.exports = { cancelStripePayment, getStripe };