import { useEffect, useRef, useState, useCallback } from 'react';
import type { 
  SquareWindow, 
  SquareCard, 
  PaymentFormProps,
  OrderSummaryData 
} from '../types/square';

import './PaymentForm.css'

declare const window: SquareWindow;

const API_URL = import.meta.env.VITE_API_URL;

// Componente de resumo completo do pedido
const OrderCompleteSummary = ({ orderData }: { orderData: OrderSummaryData }) => {
  const calculateItemTotal = (item: OrderSummaryData['items'][0]) => {
    const fruitPrice = item.fruit_option === "有り" ? 648 : 0;
    return (item.price + fruitPrice) * item.amount;
  };

  return (
    <div className="order-complete-summary">
      <h2>🧾 ご注文内容確認</h2>
      
      {/* Seção do cliente */}
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

      {/* Seção de retirada */}
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

      {/* Seção dos bolos */}
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

      {/* Mensagem adicional do cliente */}
      {orderData.message && (
        <div className="summary-section">
          <h3>📝 備考</h3>
          <div className="customer-message">
            {orderData.message}
          </div>
        </div>
      )}

      {/* Total */}
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


export function PaymentForm({
  appId,
  locationId,
  amount,
  currency,
  orderData,
  onPaymentSuccess,
  onPaymentError,
  onReady
}: PaymentFormProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isCardReady, setIsCardReady] = useState(false);
  const paymentInstance = useRef<SquareCard | null>(null);
  const initialized = useRef(false); // 🔥 Flag para evitar múltiplas inicializações
  
  // Verificar se as credenciais foram fornecidas
  useEffect(() => {
    if (!appId || appId === 'undefined' || appId.includes('SEU_APP_ID')) {
      setError('Configuração do Square inválida');
      setLoading(false);
      onPaymentError(new Error('Square APP_ID não configurado'));
    }
  }, [appId, onPaymentError]);

  const initializeSquare = useCallback(async () => {
    // 🔥 Se já inicializou, não faz nada
    if (initialized.current) {
      console.log('Square já inicializado, ignorando...');
      return;
    }

    try {
      console.log('Inicializando Square com:', { appId, locationId });
      
      if (!window.Square) {
        throw new Error('Square SDK não carregado');
      }

      // 🔥 Limpar o container antes de anexar
      if (cardRef.current) {
        cardRef.current.innerHTML = '';
      }

      const payments = window.Square.payments(appId, locationId);
      
      console.log('Criando componente de cartão...');
      const card = await payments.card();
      paymentInstance.current = card;

      if (cardRef.current) {
        console.log('Anexando cartão ao DOM...');
        await card.attach(cardRef.current);
        console.log('Cartão anexado com sucesso');
        initialized.current = true; // 🔥 Marcar como inicializado
        setIsCardReady(true);
      }

      setLoading(false);
      onReady?.();
    } catch (err) {
      console.error('Erro detalhado ao inicializar Square:', err);
      setError('決済システムの初期化に失敗しました');
      setLoading(false);
      
      if (err instanceof Error) {
        onPaymentError(err);
      } else {
        onPaymentError(new Error('Erro desconhecido na inicialização'));
      }
    }
  }, [appId, locationId, onReady, onPaymentError]);

  useEffect(() => {
    let isMounted = true;
    // let timeoutId: NodeJS.Timeout;

    // Se as credenciais são inválidas, não tenta carregar o SDK
    if (!appId || appId === 'undefined' || !locationId || locationId === 'undefined') {
      return;
    }

    // 🔥 Se já inicializou, não faz nada
    if (initialized.current) {
      console.log('Square já inicializado, ignorando...');
      return;
    }

    // Timeout de segurança
    const timeoutId = setTimeout(() => {
      if (loading && !error && isMounted) {
        console.warn('Timeout na inicialização do Square');
        setError('初期化に時間がかかっています。ページを再読み込みしてください。');
        setLoading(false);
      }
    }, 10000);

    if (!window.Square) {
      console.log('Carregando script do Square...');
      const script = document.createElement('script');
      script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.async = true;
      script.onload = () => {
        console.log('Script do Square carregado');
        if (isMounted) {
          initializeSquare();
        }
      };
      script.onerror = (event) => {
        console.error('Erro ao carregar script do Square:', event);
        if (isMounted) {
          setError('決済システムの読み込みに失敗しました');
          setLoading(false);
          onPaymentError(new Error('Falha ao carregar Square SDK'));
        }
      };
      document.body.appendChild(script);
    } else {
      initializeSquare();
    }

    // 🔥 Cleanup: não remove o script, mas marca como não inicializado
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      // Não resetar initialized.current aqui para evitar recriação
    };
  }, [appId, locationId, initializeSquare, onPaymentError]);

  const handlePayment = async () => {
  if (!paymentInstance.current) {
    setError('決済システムが初期化されていません');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    console.log('🟡 1. Tentando tokenizar cartão...');
    console.log('🟡 2. paymentInstance.current existe:', !!paymentInstance.current);
    
    const tokenResult = await paymentInstance.current.tokenize();
    
    console.log('🟢 3. Resultado do tokenize RECEBIDO:');
    console.log('🟢 3.1. Status:', tokenResult.status);
    console.log('🟢 3.2. Token:', tokenResult.token);
    console.log('🟢 3.3. Details:', tokenResult.details);
    console.log('🟢 3.4. Objeto completo:', JSON.stringify(tokenResult, null, 2));
    
    if (tokenResult.status === 'OK') {
      console.log('✅ 4. Token gerado com sucesso, enviando para backend...');
      console.log('📡 Enviando para:', `${API_URL}/api/process-payment`);
      
      const response = await fetch(`${API_URL}/api/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceId: tokenResult.token,
          amount,
          currency
        })
      });
      console.log('✅ 5. Status da resposta:', response.status);
      const result = await response.json();
      console.log('✅ 6. Resposta do backend:', result);

      if (result.success === true) {
        onPaymentSuccess(result);
      } else {
        let errorMsg = '決済に失敗しました';
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          errorMsg = result.errors[0]?.detail || errorMsg;
        }
        setError(errorMsg);
        onPaymentError(new Error(errorMsg));
      }
    } else {
      console.log('🔴 4. Tokenize FALHOU!');
      console.log('🔴 4.1. Status:', tokenResult.status);
      console.log('🔴 4.2. Details:', tokenResult.details);
      console.log('🔴 4.3. Erro completo:', tokenResult);
      
      // Extrair mensagem de erro mais específica
      let errorMessage = 'カード情報が無効です';
      if (tokenResult.details) {
        if (typeof tokenResult.details === 'string') {
          errorMessage = tokenResult.details;
        } else if (tokenResult.details.message) {
          errorMessage = tokenResult.details.message;
        }
      }
      
      throw new Error(errorMessage);
    }
  } catch (err) {
    console.error('🔥 5. ERRO CAPTURADO:');
    console.error('🔥 5.1. Tipo:', typeof err);
    console.error('🔥 5.2. É Error?', err instanceof Error);
    console.error('🔥 5.3. Mensagem:', err instanceof Error ? err.message : 'Erro desconhecido');
    console.error('🔥 5.4. Objeto:', err);
    
    let errorMsg = '決済処理中にエラーが発生しました';
    if (err instanceof Error) {
      errorMsg = err.message;
    }
    setError(errorMsg);
    onPaymentError(new Error(errorMsg));
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="payment-page">
      {/* Coluna esquerda: Resumo do pedido */}
      <div className="payment-left-column">
        <OrderCompleteSummary orderData={orderData} />
      </div>

      {/* Coluna direita: Pagamento */}
      <div className="payment-right-column">
        <div className="payment-section">
          <h2>💳 お支払い</h2>
          
          {error && (
            <div className="payment-error">
              <p>❌ {error}</p>
            </div>
          )}

          <div className="card-container">
            <div 
              ref={cardRef} 
              className="sq-card-wrapper"
            ></div>
            {loading && !error && (
              <div className="payment-loading">
                <p>⚙️ 決済フォームを準備中...</p>
              </div>
            )}
          </div>

          <button
            onClick={handlePayment}
            disabled={loading || !isCardReady}
            className="payment-button"
            type="button"
          >
            {loading ? '処理中...' : !isCardReady ? '準備中...' : `￥${amount.toLocaleString()} を支払う`}
          </button>

          <div className="payment-secure-note">
            <small>🔒 カード情報は直接Squareに送信され、安全に処理されます</small>
          </div>
        </div>
      </div>
    </div>
  );
}