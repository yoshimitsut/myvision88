import { useState, useEffect, useMemo } from 'react';
import DatePicker, { CalendarContainer } from "react-datepicker";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, isSameDay, format, endOfMonth, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';

// import Select from 'react-select';

import type { OrderCake, SizeOption } from "../types/types";

import { PaymentFormStripe } from '../components/PaymentFormStripe';

import "react-datepicker/dist/react-datepicker.css";
import "./OrderCake.css";

// ==================== HOOKS PERSONALIZADOS ====================
import Input from '../components/forms/Input';

import { useCakesData } from '../hooks/useCakesData';
import { useTimeSlots } from '../hooks/useTimeSlots';
import { useExcludedDates } from '../hooks/useExcludedDates';
import { useHoursOptions } from '../hooks/useHoursOptions';
import { useOrderForm } from '../hooks/useOrderForm';
import { useDateValidation } from '../hooks/useDateValidation';

// ==================== IMPORTS PARA PAGAMENTO ====================
import { calculateTotalPrice } from '../utils/priceCalculator';
import type { StripePaymentResponse, StripeError, OrderData, OrderStatus, PaymentStatus } from '../types/stripe';

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

// ==================== TIPOS ====================
interface FruitOption {
  value: "有り" | "無し";
  label: string;
  price: number;
  priceText: string;
}

// ==================== CONSTANTES ====================
const DIAS_BLOQUEADOS = 2;
const FRUIT_OPTIONS: readonly FruitOption[] = [
  { value: "無し", label: "通常盛り", price: 0, priceText: "+0円" },
  { value: "有り", label: "フルーツ増し", price: 648, priceText: "+648円" }
] as const;

// ==================== COMPONENTES ====================
interface CalendarContainerProps {
  className?: string;
  children: React.ReactNode;
}

const CustomCalendarContainer = ({ className, children }: CalendarContainerProps) => (
  <div>
    <CalendarContainer className={className}>{children}</CalendarContainer>
    <div className='calendar-notice'>
      <div style={{ padding: "20px" }}>
        <p>３日前よりご予約可能</p>
      </div>
      <div className='notice'>
        <div className='selectable-info'></div>
        <span className='notice-op'>予約可能日  /  <span className='yassumi'>x</span> 予約不可</span>
      </div>
    </div>
  </div>
);

interface DayCellProps {
  day: number;
  date: Date;
  isSelectable: boolean;
}

const DayCell = ({ day, date, isSelectable }: DayCellProps) => {
  const dayOfWeek = getDay(date);
  const extraClass = dayOfWeek === 0 ? "domingo-vermelho" : dayOfWeek === 6 ? "sabado-azul" : "";

  return (
    <div className={`day-cell ${extraClass}`}>
      <span>{day}</span>
      {!isSelectable && <span className="yassumi">x</span>}
      {isSelectable && <div className="selectable"></div>}
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================
export default function OrderCake() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Estados existentes
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickupHour, setPickupHour] = useState("時間を選択");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para pagamento
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment'>('form');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'store'>('card');
  const [paymentKey, setPaymentKey] = useState(0);
  const [, setProcessingStorePayment] = useState(false);

  // Hooks personalizados
  const cakesData = useCakesData();
  const { timeSlotsData, availableDates } = useTimeSlots();
  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => endOfMonth(addDays(today, 30)), [today]);
  const excludedDates = useExcludedDates(today, DIAS_BLOQUEADOS);
  const hoursOptions = useHoursOptions(selectedDate, timeSlotsData);

  // const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

  const initialCake = {
    cake_id: 0,
    name: "",
    amount: 1,
    size: "",
    price: 0,
    message_cake: "",
    fruit_option: "無し" as const
  };

  const {
    cakes,
    setCakes,
    formData,
    setFormData,
    addCake,
    removeCake,
    updateCake,
    handleInputChange,
    resetForm
  } = useOrderForm([initialCake]);

  // Calcular total do pedido
  useEffect(() => {
    const total = calculateTotalPrice(cakes, cakesData, FRUIT_OPTIONS);
    setTotalAmount(total);
  }, [cakes, cakesData]);

  // Efeito para inicializar bolo da URL
  useEffect(() => {
    const selectedCakeName = searchParams.get("cake");
    if (!cakesData.length || !selectedCakeName) return;

    const selectedCake = cakesData.find(c =>
      String(c.id) === selectedCakeName || c.name === selectedCakeName
    );

    if (selectedCake) {
      setCakes([{
        cake_id: selectedCake.id,
        name: selectedCake.name,
        amount: 1,
        size: "",
        price: 0,
        message_cake: "",
        fruit_option: "無し"
      }]);
    }
  }, [cakesData, searchParams, setCakes]);

  // Resetar horário quando data muda
  useEffect(() => {
    if (selectedDate && pickupHour !== "時間を選択") {
      const isHourAvailable = hoursOptions.some(opt => opt.value === pickupHour);
      if (!isHourAvailable) {
        setPickupHour("時間を選択");
      }
    }
  }, [hoursOptions, pickupHour, selectedDate]);

  // ==================== FUNÇÕES DE VALIDAÇÃO ====================
  const { isDateAllowed } = useDateValidation(today, excludedDates, availableDates);

  const toKatakana = (str: string): string => {
    return str.replace(/[\u3041-\u3096]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );
  };

  const handleKatakanaBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: toKatakana(value) }));
  };

  const getLocalDateString = (date: Date | null): string => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ==================== FUNÇÕES DE SUBMISSÃO ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!selectedDate || pickupHour === "時間を選択") {
      alert("受け取り日時を選択してください。");
      setIsSubmitting(false);
      return;
    }

    const invalidCake = cakes.find(c => !c.size);
    if (invalidCake) {
      alert("全てのケーキのサイズを選択してください。");
      setIsSubmitting(false);
      return;
    }

    const clientId = crypto.randomUUID?.() ||
      `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const orderDataToSave: OrderData = {
      id_client: clientId,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      tel: formData.tel,
      date: getLocalDateString(selectedDate),
      date_order: format(new Date(), "yyyy-MM-dd"),
      pickupHour,
      status: 'b' as OrderStatus,
      message: formData.message,
      total_amount: totalAmount,
      payment_status: 'pending' as PaymentStatus,
      cakes: cakes.map(c => {
        const cakeData = cakesData?.find(cake => Number(cake.id) === Number(c.cake_id));
        const fruitPrice = FRUIT_OPTIONS.find(f => f.value === c.fruit_option)?.price || 0;

        if (!c.size) {
          throw new Error(`Cake size is undefined for cake ${c.cake_id}`);
        }

        return {
          cake_id: cakeData?.id || c.cake_id,
          name: cakeData?.name || c.name,
          amount: c.amount,
          price: c.price,
          size: c.size,
          message_cake: c.message_cake || "",
          fruit_option: c.fruit_option,
          fruit_price: fruitPrice
        };
      })
    };

    setOrderData(orderDataToSave);

    if (paymentMethod === 'store') {
      await handleStorePayment(orderDataToSave);
    } else {
      setPaymentStep('payment');
      setIsSubmitting(false);
    }
  };

  const handleStorePayment = async (orderDataToSave: OrderData) => {
    setProcessingStorePayment(true);

    try {
      const reservationData: OrderData = {
        ...orderDataToSave,
        status: 'b',
        payment_status: 'pending'
      };

      const res = await fetch(`${API_URL}/api/reservar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationData),
      });

      const result = await res.json();

      if (result.success) {
        navigate("/order/check", {
          state: {
            newOrderCreated: true,
            paymentMethod: 'store',
            paymentStatus: 'pending'
          }
        });

        resetForm();
        setSelectedDate(null);
        setPickupHour("時間を選択");
        setPaymentMethod('card');
        setOrderData(null);
      } else {
        alert("予約の保存に失敗しました。");
        console.error(result.error);
      }
    } catch (error) {
      alert("エラーが発生しました。");
      console.error(error);
    } finally {
      setProcessingStorePayment(false);
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentResult: StripePaymentResponse) => {
    if (!orderData) {
      alert("エラー: 注文データが見つかりません。");
      return;
    }

    setIsSubmitting(true);

    try {
      const reservationData: OrderData = {
        ...orderData,
        status: 'f',
        payment_status: 'paid',
        payment_intent_id: paymentResult.paymentIntent.id,
        payment_details: paymentResult.paymentIntent
      };

      const res = await fetch(`${API_URL}/api/reservar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationData),
      });

      const result = await res.json();

      if (result.success) {
        navigate("/order/check", {
          state: {
            newOrderCreated: true,
            paymentSuccess: true,
            paymentId: paymentResult.paymentIntent.id
          }
        });

        resetForm();
        setSelectedDate(null);
        setPickupHour("時間を選択");
        setPaymentStep('form');
        setOrderData(null);
      } else {
        alert("予約の保存に失敗しましたが、支払いは完了しています。管理者に連絡してください。");
        console.error(result.error);
      }
    } catch (error) {
      alert("エラーが発生しました。");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentError = (error: StripeError) => {
    console.error('Payment error:', error);
    alert(`支払いエラー: ${error.message}`);
    setPaymentStep('form');
  };

  const handleBackToForm = () => {
    setPaymentStep('form');
    setPaymentKey(prev => prev + 1);
  };

  const PaymentMethodSelector = ({
    selectedMethod,
    onChange
  }: {
    selectedMethod: 'card' | 'store';
    onChange: (method: 'card' | 'store') => void;
  }) => (
    <div className="payment-method-selector">
      <h3>お支払い方法を選択</h3>
      <div className="payment-method-options">
        <label className={`payment-method-option ${selectedMethod === 'card' ? 'active' : ''}`}>
          <input
            type="radio"
            name="paymentMethod"
            value="card"
            checked={selectedMethod === 'card'}
            onChange={() => onChange('card')}
          />
          <span className="method-icon">💳</span>
          <span className="method-label">クレジットカード</span>
          <span className="method-description">オンライン決済</span>
        </label>

        <label className={`payment-method-option ${selectedMethod === 'store' ? 'active' : ''}`}>
          <input
            type="radio"
            name="paymentMethod"
            value="store"
            checked={selectedMethod === 'store'}
            onChange={() => onChange('store')}
          />
          <span className="method-icon"><img src="/icons/store.png" alt="store icon" className='store-icon-order' /></span>
          <span className="method-label">店舗支払い</span>
          <span className="method-description">店頭でお支払い</span>
        </label>
      </div>
    </div>
  );



  const orderSummaryData = {
    id_order: orderData?.id_client || '',
    items: cakes.map(cake => {
      const cakeData = cakesData?.find(c => c.id === cake.cake_id);
      return {
        name: cakeData?.name || cake.name,
        size: cake.size || '',
        amount: cake.amount,
        price: cake.price,
        fruit_option: cake.fruit_option,
        message_cake: cake.message_cake
      };
    }),
    customer: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      tel: formData.tel
    },
    pickupDate: selectedDate ? format(selectedDate, 'yyyy年MM月dd日') : '',
    pickupTime: pickupHour,
    totalAmount: totalAmount,
    message: formData.message
  };

  // ==================== RENDER ====================
  return (
    <div className='reservation-main'>
      <div className="container">
        <h2 className='cake-title-h2'>デコレーションケーキ</h2>
        <h2 className='cake-title-h2'>予約フォーム</h2>

        {paymentStep === 'form' ? (
          <form className="form-order" onSubmit={handleSubmit}>
            <div className="cake-information">
              {cakes.map((item, index) => {
                const selectedCakeData = cakesData?.find(c => c.id === item.cake_id);
                const sizeOptions: (SizeOption & { value: string; label: string })[] = selectedCakeData?.sizes.map(s => ({
                  ...s,
                  value: s.size || '',
                  label: s.size ? `${s.size} ￥${s.price.toLocaleString()}` : '',
                })) || [];

                return (
                  <div className="box-cake" key={`${item.cake_id}-${index}`}>
                    {index > 0 && (
                      <div className='btn-remove-div'>
                        <button type="button" onClick={() => removeCake(index)} className='btn-remove-cake'>
                          ❌
                        </button>
                      </div>
                    )}

                    {selectedCakeData && selectedCakeData.image && (
                      <img
                        className='img-cake-order'
                        src={`${API_URL}/image/${FOLDER_URL}/${selectedCakeData.image}`}
                        alt={selectedCakeData.name}
                      />
                    )}

                    <div className="input-group-radio cake-name-group">
                      <div className="pill-group cake-name-pills">
                        {cakesData?.map((c) => (
                          <label
                            key={c.id}
                            className={`pill ${item.cake_id === c.id ? "active" : ""}`}
                          >
                            <input
                              type="radio"
                              name={`cake-id-${index}`}
                              value={c.id}
                              checked={item.cake_id === c.id}
                              style={{ display: "none" }}
                              onChange={() => {
                                const newCakeId = Number(c.id);
                                const selectedCake = cakesData?.find(ck => ck.id === newCakeId);
                                updateCake(index, "cake_id", newCakeId);
                                updateCake(index, "size", "");
                                updateCake(index, "price", 0);

                                if (selectedCake?.sizes && selectedCake.sizes.length === 1) {
                                  const singleSize = selectedCake.sizes[0];
                                  if (singleSize.stock > 0 && singleSize.size) {
                                    updateCake(index, "size", singleSize.size);
                                    updateCake(index, "price", singleSize.price);
                                  }
                                }
                              }}
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      </div>
                      <label className='select-group-radio'>*ケーキ名:</label>
                    </div>

                    {selectedCakeData && sizeOptions.length > 0 && (
                      <div className="input-group-radio">
                        <div className="pill-group">
                          {sizeOptions.map(s => (
                            <label
                              key={s.size}
                              className={`pill ${item.size === s.size ? "active" : ""}`}
                            >
                              <input
                                type="radio"
                                name={`cake-size-${index}`}
                                value={s.size}
                                checked={item.size === s.size}
                                style={{ display: "none" }}
                                onChange={() => {
                                  if (s.size) {
                                    updateCake(index, "size", s.size);
                                    updateCake(index, "price", s.price);
                                  }
                                }}
                              />
                              <span>{s.label}</span>
                            </label>
                          ))}
                        </div>
                        <label className='select-group-radio'>*ケーキのサイズ</label>
                      </div>
                    )}

                    <div className="input-group-radio">
                      <div className="pill-group">
                        {FRUIT_OPTIONS.map(option => (
                          <label
                            key={option.value}
                            className={`pill ${item.fruit_option === option.value ? "active" : ""}`}
                          >
                            <input
                              className='radio-input-fruit'
                              type="radio"
                              name={`fruit-option-${index}`}
                              value={option.value}
                              checked={item.fruit_option === option.value}
                              onChange={() => updateCake(index, "fruit_option", option.value)}
                            />
                            <span style={{ width: "120px", textAlign: "start" }}>{option.label}</span>
                            <span style={{ width: "5rem", textAlign: "end" }}>{option.priceText}</span>
                          </label>
                        ))}
                      </div>
                      <label className='select-group-radio'>*フルーツ盛り</label>
                    </div>

                    <div className="input-group-radio">
                      <div className="pill-group" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {Array.from({ length: 10 }, (_, i) => String(i + 1)).map(q => (
                          <label
                            key={q}
                            className={`pill ${String(item.amount) === q ? "active" : ""}`}
                            style={{ flex: '1 0 calc(20% - 0.5rem)', textAlign: 'center', justifyContent: 'center' }}
                          >
                            <input
                              type="radio"
                              name={`amount-${index}`}
                              value={q}
                              checked={String(item.amount) === q}
                              style={{ display: "none" }}
                              onChange={() => updateCake(index, "amount", Number(q))}
                            />
                            <span>{q}</span>
                          </label>
                        ))}
                      </div>
                      <label className='select-group-radio'>*個数:</label>
                    </div>

                    <div className='input-group'>
                      <label htmlFor={`message_cake_${index}`}>メッセージプレート</label>
                      <textarea
                        id={`message_cake_${index}`}
                        name="message_cake"
                        placeholder="ご要望がある場合のみご記入ください。"
                        value={item.message_cake || ""}
                        onChange={(e) => updateCake(index, "message_cake", e.target.value)}
                      />
                    </div>

                    <div className='btn-div'>
                      <button type='button' onClick={addCake} className='btn btn-add-cake'>
                        ➕ 別のケーキを追加
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="client-information">
              <label className='title-information'>お客様情報</label>
              <div className="full-name">
                <Input
                  id="firstName"
                  label="*姓(カタカナ)"
                  placeholder="ヒガ"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onBlur={handleKatakanaBlur}
                  lang="ja"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />

                <Input
                  id="lastName"
                  label="*名(カタカナ)"
                  placeholder="タロウ"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onBlur={handleKatakanaBlur}
                  required
                />

                <Input
                  id="email"
                  label="*メールアドレス"
                  type="email"
                  placeholder="必須"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />

                <Input
                  id="tel"
                  label="*お電話番号"
                  type="tel"
                  placeholder="ハイフン不要"
                  value={formData.tel}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="date-information">
              <label className='title-information'>*受取日時</label>
              <div className='input-group'>
                <label htmlFor="datepicker" className='datepicker'>*受け取り希望日</label>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  minDate={today}
                  maxDate={maxDate}
                  excludeDates={excludedDates}
                  filterDate={isDateAllowed}
                  dateFormat="yyyy年MM月dd日"
                  locale={ja}
                  placeholderText="日付を選択"
                  dayClassName={(date) => {
                    if (isSameDay(date, today)) return "hoje-azul";
                    if (getDay(date) === 0) return "domingo-vermelho";
                    return "";
                  }}
                  className="react-datepicker"
                  calendarClassName="datepicker-calendar"
                  calendarContainer={CustomCalendarContainer}
                  required
                  renderDayContents={(day, date) => (
                    <DayCell
                      day={day}
                      date={date!}
                      isSelectable={isDateAllowed(date!)}
                    />
                  )}
                />
              </div>

              <div className='input-group-radio'>
                <div className="pill-group" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {hoursOptions.length > 0 ? (
                    hoursOptions.map(h => (
                      <label
                        key={h.value}
                        className={`pill ${pickupHour === h.value ? "active" : ""}`}
                        style={{ flex: '1 0 calc(33.333% - 0.5rem)', textAlign: 'center', justifyContent: 'center', opacity: h.isDisabled ? 0.5 : 1, cursor: h.isDisabled ? 'not-allowed' : 'pointer' }}
                      >
                        <input
                          type="radio"
                          name="pickupHour"
                          value={h.value}
                          checked={pickupHour === h.value}
                          disabled={h.isDisabled}
                          style={{ display: "none" }}
                          onChange={() => setPickupHour(h.value)}
                        />
                        <span>{h.label}</span>
                      </label>
                    ))
                  ) : (
                    <span style={{ padding: '10px', color: '#666', fontSize: '1rem' }}>
                      {selectedDate ? "選択可能な時間がありません" : "日付を選択してください"}
                    </span>
                  )}
                </div>
                <label className='select-group-radio'>受け取り希望時間</label>
              </div>

              <div className='input-group' style={{ display: 'none' }}>
                <label htmlFor="message">その他</label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder=""
                />
              </div>
            </div>

            <div className="order-summary">
              <h3>ご注文内容</h3>
              {cakes.filter(cake => cake.cake_id !== 0 && cake.size !== "").map((cake, index) => {
                const cakeData = cakesData?.find(c => c.id === cake.cake_id);
                const fruitPrice = FRUIT_OPTIONS.find(f => f.value === cake.fruit_option)?.price || 0;
                const itemTotal = (cake.price + fruitPrice) * cake.amount;

                return (
                  <div key={index} className="order-item">
                    <span>{cakeData?.name} ({cake.size}) x{cake.amount}</span>
                    <span>￥{itemTotal.toLocaleString()}</span>
                  </div>
                );
              })}
              <div className="order-total">
                <strong>合計:</strong>
                <strong>￥{totalAmount.toLocaleString()}</strong>
              </div>
            </div>

            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onChange={setPaymentMethod}
            />

            <div className='btn-div'>
              <button
                type='submit'
                className='send btn'
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? '処理中...' : `お支払いに進む (￥${totalAmount.toLocaleString()})`}
              </button>
            </div>
          </form>
        ) : (
          <div className="payment-step">
            <button onClick={handleBackToForm} className="btn-back" type="button">
              ← 予約フォームに戻る
            </button>

            <h3>お支払い情報</h3>
            <p className="payment-amount">
              お支払い金額: <strong>￥{totalAmount.toLocaleString()}</strong>
            </p>

            <PaymentFormStripe
              key={paymentKey}
              // publishableKey={STRIPE_PUBLISHABLE_KEY}
              amount={totalAmount}
              currency="jpy"
              orderData={orderSummaryData}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              onReady={() => console.log('Stripe pronto')}
            />
          </div>
        )}
      </div>
    </div>
  );
}