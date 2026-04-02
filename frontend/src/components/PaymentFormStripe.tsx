// src/components/PaymentFormStripe.tsx
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import type {
  PaymentFormProps,
  StripePaymentResponse,
  OrderSummaryData
} from '../types/stripe';
import './PaymentForm.css';

const API_URL = import.meta.env.VITE_API_URL;
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  { locale: 'ja' }
);

// const API_URL = import.meta.env.VITE_API_URL;

// Componente de resumo do pedido
const OrderCompleteSummary = ({ orderData }: { orderData: OrderSummaryData }) => {
  const calculateItemTotal = (item: OrderSummaryData['items'][0]) => {
    const fruitPrice = item.fruit_option === "有り" ? 648 : 0;
    return (item.price + fruitPrice) * item.amount;
  };

  return (
    <div className="order-complete-summary">
      <h2>🧾 ご注文内容確認</h2>

      <div className="summary-section">
        <h3>👤 お客様情報</h3>
        <div className="customer-info">
          <div className="info-row">
            <span className="info-label">お名前：</span>
            <span className="info-value">{orderData.customer.lastName} {orderData.customer.firstName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">メール：</span>
            <span className="info-value">{orderData.customer.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">電話番号：</span>
            <span className="info-value">{orderData.customer.tel}</span>
          </div>
        </div>
      </div>

      <div className="summary-section">
        <h3>📅 受け取り情報</h3>
        <div className="pickup-info">
          <div className="info-row">
            <span className="info-label">受け取り日：</span>
            <span className="info-value">{orderData.pickupDate}</span>
          </div>
          <div className="info-row">
            <span className="info-label">受け取り時間：</span>
            <span className="info-value">{orderData.pickupTime}</span>
          </div>
        </div>
      </div>

      <div className="summary-section">
        <h3>🍰 ケーキ一覧</h3>
        <div className="cakes-list">
          {orderData.items.map((item, index) => {
            const itemTotal = calculateItemTotal(item);
            const fruitText = item.fruit_option === "有り" ? " (フルーツ増し)" : "";

            return (
              <div key={index} className="cake-item">
                <div className="cake-header">
                  <span className="cake-name">{item.name}{fruitText}</span>
                  <span className="cake-quantity">×{item.amount}</span>
                </div>
                <div className="cake-details">
                  <span className="cake-size">{item.size}</span>
                  <span className="cake-price">￥{itemTotal.toLocaleString()}</span>
                </div>
                {item.message_cake && (
                  <div className="cake-message">
                    <small>📝 {item.message_cake}</small>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {orderData.message && (
        <div className="summary-section">
          <h3>📝 備考</h3>
          <div className="customer-message">
            {orderData.message}
          </div>
        </div>
      )}

      <div className="summary-total-section">
        <div className="total-row">
          <span>商品合計</span>
          <span>￥{orderData.totalAmount.toLocaleString()}</span>
        </div>
        <div className="total-row grand-total">
          <span>お支払い金額 (税込)</span>
          <span className="total-amount">￥{orderData.totalAmount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

// Componente de formulário de pagamento interno usando PaymentElement
interface PaymentFormInnerProps extends PaymentFormProps {
  clientSecret: string;
}

const PaymentFormInner = ({
  amount,
  orderData,
  onPaymentSuccess,
  onPaymentError,
  clientSecret,
}: PaymentFormInnerProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Confirmar o pagamento com o PaymentElement
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/check`,
          payment_method_data: {
            billing_details: {
              name: `${orderData.customer.lastName} ${orderData.customer.firstName}`,
              email: orderData.customer.email,
              phone: orderData.customer.tel,
            },
          },
        },
        redirect: 'if_required', // Não redirecionar automaticamente
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        const paymentResult: StripePaymentResponse = {
          success: true,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            created: paymentIntent.created,
            receipt_email: paymentIntent.receipt_email ?? undefined,
            description: paymentIntent.description ?? undefined,
          },
          clientSecret: clientSecret,
        };

        onPaymentSuccess(paymentResult);
      } else {
        throw new Error('Pagamento não foi confirmado');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro no pagamento';
      setError(errorMsg);
      onPaymentError({ message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      {error && (
        <div className="payment-error">
          <p>❌ {error}</p>
        </div>
      )}

      <div className="payment-element-wrapper">
        <PaymentElement
          options={{
            fields: {
              billingDetails: {
                address: {
                  country: 'never',
                  postalCode: 'never'
                }
              }
            }
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="payment-button"
      >
        {loading ? '処理中...' : `￥${amount.toLocaleString()} を支払う`}
      </button>

      <div className="payment-secure-note">
        <small>🔒 カード情報はStripeに直接送信され、安全に処理されます</small>
      </div>
    </form>
  );
};

// Componente principal
export function PaymentFormStripe({
  amount,
  currency,
  orderData,
  onPaymentSuccess,
  onPaymentError,
  onReady
}: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true);

        console.log('🟡 Criando PaymentIntent...');

        const response = await fetch(`${API_URL}/api/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            currency: currency.toLowerCase(),
            orderData: orderData,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao criar PaymentIntent');
        }

        console.log('✅ PaymentIntent criado:', data);

        setClientSecret(data.clientSecret);
        setLoading(false);
        onReady?.();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao inicializar pagamento';
        console.error('❌ Erro:', errorMsg);
        setError(errorMsg);
        setLoading(false);
        onPaymentError({ message: errorMsg });
      }
    };

    if (amount > 0) {
      createPaymentIntent();
    } else {
      setError('Configuração do Stripe inválida');
      setLoading(false);
      onPaymentError({ message: 'Stripe publishable key não configurada' });
    }
  }, []);

  // ✅ Limpa o estado quando o componente desmontar
  useEffect(() => {
    return () => {
      setClientSecret(null);
    };
  }, []);

  if (loading) {
    return (
      <div className="payment-loading">
        <p>⚙️ 決済フォームを準備中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-error">
        <p>❌ {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="retry-button"
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#fdd111',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          再試行
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <div className="payment-page">
      <div className="payment-left-column">
        <OrderCompleteSummary orderData={orderData} />
      </div>

      <div className="payment-right-column">
        <div className="payment-section">
          <h2>💳 お支払い</h2>

          <Elements
            key={clientSecret}
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#fdd111',
                  colorBackground: '#ffffff',
                  colorText: '#30313d',
                  colorDanger: '#df1b41',
                  fontFamily: 'Ideal Sans, system-ui, sans-serif',
                  spacingUnit: '4px',
                  borderRadius: '8px',
                },
                rules: {
                  '.Fieldset--country': {
                    display: 'none',
                  },
                  '.LinkAuthenticationElement': {
                    display: 'none',
                  },
                  '.AffirmMessage': {
                    display: 'none',
                  },
                  '.Fieldset--postalCode': {
                    display: 'none',
                  },
                },
                labels: 'floating',
              },
            }}
          >
            <PaymentFormInner
              amount={amount}
              currency={currency}
              orderData={orderData}
              onPaymentSuccess={onPaymentSuccess}
              onPaymentError={onPaymentError}
              clientSecret={clientSecret}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}