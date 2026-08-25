import { useState, useEffect, useMemo } from 'react';
import DatePicker, { CalendarContainer } from "react-datepicker";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, isSameDay, format, endOfMonth, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';

import Select from 'react-select';
import type { StylesConfig, CSSObjectWithLabel, OptionProps, ControlProps } from 'react-select';
import type { OrderCake, OptionType, TimeOptionType } from "../../types/types";

import { PaymentFormStripe } from '../../components/order/PaymentFormStripe';

import "react-datepicker/dist/react-datepicker.css";
import "./OrderCake.css";
// ==================== HOOKS PERSONALIZADOS ====================

import { useCakesData } from '../../hooks/useCakesData';
import { useTimeSlots } from '../../hooks/useTimeSlots';
import { useExcludedDates } from '../../hooks/useExcludedDates';
import { useHoursOptions } from '../../hooks/useHoursOptions';
import { useOrderForm } from '../../hooks/useOrderForm';
import { useDateValidation } from '../../hooks/useDateValidation';

// ==================== IMPORTS PARA PAGAMENTO ====================
import { calculateTotalPrice } from '../../utils/priceCalculator';
import type { StripePaymentResponse, StripeError, OrderData, OrderStatus, PaymentStatus } from '../../types/stripe';

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

// ==================== TIPOS ====================
interface CustomOptionType extends OptionType {
  isDisabled?: boolean;
}

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
  const [stepProgress, setStepProgress] = useState({
    cakeSelected: false,
    quantitySelected: false,
    sizeSelected: false,
    fruitSelected: false,
    messageSelected: false,
    candlesSelected: false,
    dateSelected: false,
    timeSelected: false,
    firstNameSelected: false,
    lastNameSelected: false,
    emailSelected: false,
    telSelected: false,
  });
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

  // Rola para o topo ao carregar a página
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Calcular total do pedido
  useEffect(() => {
    const total = calculateTotalPrice(cakes, cakesData, FRUIT_OPTIONS);
    setTotalAmount(total);
  }, [cakes, cakesData]);

  const selectedCakeName = searchParams.get("cake");
  const selectedSizeName = searchParams.get("size");

  // Efeito para inicializar bolo da URL
  // useEffect(() => {
  //   if (!cakesData.length || !selectedCakeName) return;

  //   const selectedCake = cakesData.find(c =>
  //     String(c.id) === selectedCakeName || c.name === selectedCakeName
  //   );

  //   if (selectedCake) {
  //     setCakes(prevCakes => {
  //       const sizeOption = selectedCake.sizes?.find(s => s.size === selectedSizeName);
  //       const resolvedSize = sizeOption?.size || "";

  //       // Prevent infinite loop by checking if we already set it
  //       if (prevCakes.length > 0 && prevCakes[0].cake_id === selectedCake.id && prevCakes[0].size === resolvedSize) {
  //         return prevCakes;
  //       }

  //       return [{
  //         cake_id: selectedCake.id,
  //         name: selectedCake.name,
  //         amount: 1,
  //         size: resolvedSize,
  //         price: sizeOption?.price || 0,
  //         message_cake: "",
  //         fruit_option: "無し"
  //       }];
  //     });
  //   }
  // }, [cakesData, selectedCakeName, selectedSizeName, setCakes]);

  // ==================== CORREÇÃO ULTRA-SEGURA PARA IPHONE (NFC) ====================
  useEffect(() => {
    if (!cakesData.length || !selectedCakeName) return;

    // Força decodificação correta e normalização para o padrão NFC usado em bancos de dados/APIs
    const normalizedCakeParam = decodeURIComponent(selectedCakeName).normalize("NFC");
    const normalizedSizeParam = selectedSizeName ? decodeURIComponent(selectedSizeName).normalize("NFC") : "";

    // Busca o bolo aplicando a normalização NFC em ambas as strings
    const selectedCake = cakesData.find(c => {
      const nameNorm = c.name ? c.name.normalize("NFC") : "";
      const idStr = String(c.id);
      return idStr === normalizedCakeParam || nameNorm === normalizedCakeParam;
    });

    if (selectedCake) {
      // Busca o tamanho aplicando rigidamente a normalização NFC
      const sizeOption = selectedCake.sizes?.find(s => {
        const sizeNorm = s.size ? s.size.normalize("NFC") : "";
        return sizeNorm === normalizedSizeParam;
      });

      const resolvedSize = sizeOption?.size || "";
      const resolvedPrice = sizeOption?.price || 0;

      setCakes(prevCakes => {
        // Trava rigorosa anti-loop infinito para o Safari
        if (
          prevCakes.length === 1 &&
          prevCakes[0].cake_id === selectedCake.id &&
          prevCakes[0].size === resolvedSize
        ) {
          return prevCakes;
        }

        return [{
          cake_id: selectedCake.id,
          name: selectedCake.name,
          amount: 1,
          size: resolvedSize,
          price: resolvedPrice,
          message_cake: "",
          fruit_option: "無し"
        }];
      });
    }
    // Deixe setCakes fora das dependências para evitar loops causados por mutação de referência
  }, [cakesData, selectedCakeName, selectedSizeName]);
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

  const updateStepProgress = (field: string, value: boolean) => {
    setStepProgress(prev => ({ ...prev, [field]: value }));
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

  // ==================== STYLES TIPADOS ====================
  const getBaseStyles = <T extends OptionType>(): StylesConfig<T, false> => ({
    option: (provided: CSSObjectWithLabel, state: OptionProps<T, false>) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#fdd111' : state.isFocused ? '#fdeca2' : 'white',
      color: state.isDisabled ? '#999' : '#333',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    }),
    control: (provided: CSSObjectWithLabel, state: ControlProps<T, false>) => ({
      ...provided,
      borderColor: state.isFocused ? '#fdeca2' : '#ddd',
      boxShadow: state.isFocused ? '0 0 0 1px #fdeca2' : 'none',
      '&:hover': {
        ...(provided['&:hover'] as CSSObjectWithLabel),
        borderColor: '#fdeca2'
      },
    }),
    singleValue: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: '#333',
      borderRadius: '4px',
      padding: '2px 6px',
    }),
    menu: (provided: CSSObjectWithLabel) => ({
      ...provided,
      zIndex: 9999,
    }),
  });

  const customStyles = getBaseStyles<OptionType>();
  const customStylesHour = getBaseStyles<TimeOptionType>();
  const customStylesCake = getBaseStyles<CustomOptionType>();

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
        {/* Title Header */}
        <h1 className='order-form-title'>オーダーフォーム</h1>
        <div className="order-form-divider">
          <span className="divider-line"></span>
          <span className="infinity-symbol">∞</span>
          <span className="divider-line"></span>
        </div>

        {paymentStep === 'form' ? (
          <form className="form-order" onSubmit={handleSubmit}>
            <div className="cake-information">
              {cakes.map((item, index) => {
                const selectedCakeData = cakesData?.find(c => c.id === item.cake_id);

                return (
                  <div className="box-cake" key={`${item.cake_id}-${index}`}>
                    {index > 0 && (
                      <div className='btn-remove-div'>
                        <button type="button" onClick={() => removeCake(index)} className='btn-remove-cake'>
                          ❌
                        </button>
                      </div>
                    )}

                    {/* Top Hero Cake Image Banner */}
                    <div className="order-cake-hero-banner">
                      {selectedCakeData && selectedCakeData.image ? (
                        <img
                          src={`${API_URL}/image/${FOLDER_URL}/${selectedCakeData.image}`.replace(/([^:]\/)\/+/g, "$1")}
                          alt={selectedCakeData.name}
                        />
                      ) : (
                        <div className="order-cake-no-img">
                          <span>🎂 ケーキ画像</span>
                        </div>
                      )}
                    </div>

                    {/* 1. 商品名 (Cake Select) */}
                    <div className='order-field-group'>
                      <div className="field-label-row">
                        <span className="field-label-text">商品名</span>
                        <span className="field-required-badge">必須</span>
                      </div>
                      <Select<CustomOptionType, false>
                        options={cakesData?.map(c => ({
                          value: String(c.id),
                          label: c.name,
                          image: c.image,
                          isDisabled: false
                        })) || []}
                        value={cakesData?.map(c => ({
                          value: String(c.id),
                          label: c.name,
                          image: c.image,
                          isDisabled: false
                        })).find(c => Number(c.value) === item.cake_id) || null}
                        onChange={(selected) => {
                          if (selected) {
                            const newCakeId = Number(selected.value);
                            const selectedCake = cakesData?.find(c => c.id === newCakeId);

                            updateCake(index, "cake_id", newCakeId);
                            updateCake(index, "size", "");
                            updateCake(index, "price", 0);

                            updateStepProgress("cakeSelected", true);

                            if (selectedCake?.sizes && selectedCake.sizes.length === 1) {
                              const singleSize = selectedCake.sizes[0];
                              if (singleSize.stock > 0 && singleSize.size) {
                                updateCake(index, "size", singleSize.size);
                                updateCake(index, "price", singleSize.price);
                                updateStepProgress("sizeSelected", true);
                              }
                            }
                          } else {
                            updateCake(index, "cake_id", 0);
                            updateCake(index, "size", "");
                            updateCake(index, "price", 0);
                            updateStepProgress("cakeSelected", false);
                            updateStepProgress("quantitySelected", false);
                          }
                        }}
                        isDisabled={false}
                        noOptionsMessage={() => "読み込み中..."}
                        classNamePrefix="react-select"
                        placeholder="ケーキを選択"
                        required
                        isSearchable={false}
                        styles={customStylesCake}
                      />
                    </div>

                    {/* 2. 個数 (Quantity Select) */}
                    <div className='order-field-group'>
                      <div className="field-label-row">
                        <span className="field-label-text">個数</span>
                        <span className="field-required-badge">必須</span>
                      </div>
                      <div className='quantity-pills-grid'>
                        {Array.from({ length: 10 }, (_, i) => {
                          const quantity = i + 1;
                          const isSelected = item.amount === quantity;
                          return (
                            <div
                              key={quantity}
                              className={`pill-option-card quantity-pill ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                updateCake(index, "amount", quantity);
                                updateStepProgress("quantitySelected", true);
                              }}
                              style={{
                                pointerEvents: stepProgress.cakeSelected ? 'auto' : 'none',
                                opacity: stepProgress.cakeSelected ? 1 : 0.5
                              }}
                            >
                              {quantity}
                            </div>
                          )
                        })}

                      </div>
                    </div>

                    {/* 3. サイズ (Size Pills Grid) */}
                    {selectedCakeData && selectedCakeData.sizes && (
                      <div className={`order-field-group`}>
                        <div className="field-label-row">
                          <span className="field-label-text">サイズ</span>
                          <span className="field-required-badge">必須</span>
                        </div>
                        <div className="option-pills-grid">
                          {selectedCakeData.sizes.map((s, sIdx) => {
                            const isSelected = item.size === s.size;
                            return (
                              <div
                                key={sIdx}
                                className={`option-pill-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  if (stepProgress.cakeSelected) {
                                    updateCake(index, "size", s.size);
                                    updateCake(index, "price", s.price);
                                    updateStepProgress('sizeSelected', true);
                                  }
                                }}
                                style={{
                                  pointerEvents: stepProgress.cakeSelected ? 'auto' : 'none',
                                  opacity: stepProgress.cakeSelected ? 1 : 0.5
                                }}
                              >
                                {isSelected && <span className="option-pill-checkmark">✓</span>}
                                <span className="option-pill-title">{s.size}</span>
                                <span className="option-pill-price">¥{s.price.toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 4. フルーツ盛り (Fruit Option Pills Grid) */}
                    <div className='order-field-group'>
                      <div className="field-label-row">
                        <span className="field-label-text">フルーツ盛り</span>
                        <span className="field-required-badge">必須</span>
                      </div>
                      <div className="option-pills-grid">
                        {FRUIT_OPTIONS.map(option => {
                          const isSelected = item.fruit_option === option.value;
                          return (
                            <div
                              key={option.value}
                              className={`option-pill-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                if (stepProgress.sizeSelected) {
                                  updateCake(index, "fruit_option", option.value);
                                  updateStepProgress("fruitSelected", true);
                                }
                              }}
                              style={{
                                pointerEvents: stepProgress.sizeSelected ? 'auto' : 'none',
                                opacity: stepProgress.sizeSelected ? 1 : 0.5
                              }}
                            >
                              {isSelected && <span className="option-pill-checkmark">✓</span>}
                              <span className="option-pill-title">{option.label}</span>
                              <span className="option-pill-price">{option.priceText}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5. メッセージプレート (Message Plate Option Pills Grid) */}
                    <div className='order-field-group'>
                      <div className="field-label-row">
                        <span className="field-label-text">メッセージプレート</span>
                        <span className="field-required-badge">必須</span>
                      </div>
                      <div className="option-pills-grid">
                        {[
                          { value: "お名前＋おたんじょうびおめでとう", label: "お名前＋おたんじょうびおめでとう", priceText: "+¥100" },
                          { value: "お名前＋Happy Birthday", label: "お名前＋Happy Birthday", priceText: "+¥100" },
                          { value: "その他", label: "その他", priceText: "+¥100" }
                        ].map(pOpt => {
                          const currentPlateType = (item as any).plate_type || "";
                          const isSelected = currentPlateType === pOpt.value;
                          return (
                            <div
                              key={pOpt.value}
                              className={`option-pill-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                if (stepProgress.fruitSelected) {
                                  updateCake(index, "plate_type" as any, pOpt.value);
                                  if (pOpt.value !== "その他") {
                                    updateCake(index, "message_cake", pOpt.label);
                                  } else {
                                    updateCake(index, "message_cake", "");
                                  }
                                  updateStepProgress("messageSelected", true);
                                }
                              }}
                              style={{
                                pointerEvents: stepProgress.fruitSelected ? 'auto' : 'none',
                                opacity: stepProgress.fruitSelected ? 1 : 0.5
                              }}
                            >
                              {isSelected && <span className="option-pill-checkmark">✓</span>}
                              <span className="option-pill-title">{pOpt.label}</span>
                              <span className="option-pill-price">{pOpt.priceText}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="plate-message-input-box" style={{ marginTop: '10px' }}>
                        <input
                          type="text"
                          className="order-styled-input"
                          placeholder="お名前・メッセージをご記入ください (例: たろうくん お誕生日おめでとう)"
                          value={item.message_cake || ""}
                          onChange={(e) => updateCake(index, "message_cake", e.target.value)}
                          disabled={!stepProgress.messageSelected}
                          style={{
                            opacity: stepProgress.messageSelected ? 1 : 0.5,
                            pointerEvents: stepProgress.messageSelected ? 'auto' : 'none'
                          }}
                        />
                      </div>
                    </div>

                    {/* 6. キャンドル (Candles Option Pills Grid) */}
                    <div className='order-field-group'>
                      <div className="field-label-row">
                        <span className="field-label-text">キャンドル</span>
                        <span className="field-required-badge">必須</span>
                      </div>
                      <div className="option-pills-grid">
                        {[
                          { value: "ノーマル", label: "ノーマル", priceText: "¥0" },
                          { value: "ナンバーキャンドル", label: "ナンバーキャンドル", priceText: "¥100" },
                          { value: "なし", label: "なし", priceText: "¥0" }
                        ].map(cOpt => {
                          const isSelected = (item as any).candle_option === cOpt.value || (cOpt.value === "ノーマル" && !(item as any).candle_option);
                          return (
                            <div
                              key={cOpt.value}
                              className={`option-pill-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                if (stepProgress.messageSelected) {
                                  updateCake(index, "candle_option" as any, cOpt.value)
                                  updateStepProgress("candlesSelected", true);
                                }
                              }}
                              style={{
                                pointerEvents: stepProgress.messageSelected ? 'auto' : 'none',
                                opacity: stepProgress.messageSelected ? 1 : 0.5
                              }}
                            >
                              {isSelected && <span className="option-pill-checkmark">✓</span>}
                              <span className="option-pill-title">{cOpt.label}</span>
                              {cOpt.priceText && <span className="option-pill-price">{cOpt.priceText}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {cakes.length > 1 && (
                      <div className='btn-div'>
                        <button type='button' onClick={addCake} className='btn btn-add-cake'>
                          ➕ 別のケーキを追加
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="order-section-divider"></div>

            {/* Customer Details & Pickup Information */}
            <div className="client-information">
              {/* 受取日 */}
              <div className='order-field-group'>
                <div className="field-label-row">
                  <span className="field-label-text">受取日</span>
                  <span className="field-required-badge">必須</span>
                </div>
                <div className="datepicker-input-wrapper">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => {
                      setSelectedDate(date);
                      updateStepProgress("dateSelected", true);
                    }}
                    disabled={!stepProgress.candlesSelected}
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
                    className="order-styled-input react-datepicker"
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
                  <span className="calendar-icon-indicator">📅</span>
                </div>
              </div>

              {/* 受け取り希望時間 */}
              <div className='order-field-group'>
                <div className="field-label-row">
                  <span className="field-label-text">受け取り希望時間</span>
                  <span className="field-required-badge">必須</span>
                </div>
                <Select<TimeOptionType, false>
                  options={hoursOptions}
                  value={hoursOptions.find(h => h.value === pickupHour)}
                  onChange={(selected) => {
                    setPickupHour(selected?.value || "時間を選択")
                    updateStepProgress("timeSelected", true);
                  }}
                  classNamePrefix="react-select"
                  styles={customStylesHour}
                  placeholder={selectedDate ? "時間を選択" : "日付を選択してください"}
                  isSearchable={false}
                  isDisabled={!selectedDate || hoursOptions.length === 0 || !stepProgress.dateSelected}
                  required
                />
              </div>

              {/* ヒガ (カタカナ) */}
              <div className='order-field-group'>
                <div className="field-label-row">
                  <span className="field-label-text">ヒガ（カタカナ）</span>
                  <span className="field-required-badge">必須</span>
                </div>
                <input
                  id="firstName"
                  className="order-styled-input"
                  placeholder="例）ヒガ"
                  value={formData.firstName}
                  onChange={(e) => {
                    handleInputChange(e);
                    if (e.target.value.trim() !== '') {
                      updateStepProgress('firstNameSelected', true);
                    }
                  }}
                  onBlur={handleKatakanaBlur}
                  disabled={!stepProgress.timeSelected}
                  style={{
                    opacity: stepProgress.timeSelected ? 1 : 0.5,
                    pointerEvents: stepProgress.timeSelected ? 'auto' : 'none'
                  }}
                  lang="ja"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
              </div>

              {/* タロウ (カタカナ) */}
              <div className='order-field-group'>
                <div className="field-label-row">
                  <span className="field-label-text">タロウ（カタカナ）</span>
                  <span className="field-required-badge">必須</span>
                </div>
                <input
                  id="lastName"
                  className="order-styled-input"
                  placeholder="例）タロウ"
                  value={formData.lastName}
                  onChange={(e) => {
                    handleInputChange(e)
                    if (e.target.value.trim() !== '') {
                      updateStepProgress('lastNameSelected', true);
                    }
                  }}
                  onBlur={handleKatakanaBlur}
                  disabled={!stepProgress.firstNameSelected}
                  style={{
                    opacity: stepProgress.firstNameSelected ? 1 : 0.5,
                    pointerEvents: stepProgress.firstNameSelected ? 'auto' : 'none'
                  }}
                  required
                />
              </div>

              {/* メールアドレス */}
              <div className='order-field-group'>
                <div className="field-label-row">
                  <span className="field-label-text">メールアドレス</span>
                  <span className="field-required-badge">必須</span>
                </div>
                <input
                  id="email"
                  type="email"
                  className="order-styled-input"
                  placeholder="例）example@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    handleInputChange(e)
                    if (e.target.value.trim() !== '') {
                      updateStepProgress('emailSelected', true);
                    }
                  }}
                  disabled={!stepProgress.emailSelected}
                  style={{
                    opacity: stepProgress.emailSelected ? 1 : 0.5,
                    pointerEvents: stepProgress.emailSelected ? 'auto' : 'none'
                  }}
                  required
                />
              </div>

              {/* 電話番号 */}
              <div className='order-field-group'>
                <div className="field-label-row">
                  <span className="field-label-text">電話番号</span>
                  <span className="field-required-badge">必須</span>
                </div>
                <input
                  id="tel"
                  type="tel"
                  className="order-styled-input"
                  placeholder="例）09012345678"
                  value={formData.tel}
                  onChange={(e) => {
                    handleInputChange(e);
                    if (e.target.value.trim() !== '') {
                      updateStepProgress('telSelected', true);
                    }
                  }}
                  disabled={!stepProgress.emailSelected}
                  style={{
                    opacity: stepProgress.emailSelected ? 1 : 0.5,
                    pointerEvents: stepProgress.emailSelected ? 'auto' : 'none'
                  }}
                  required
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

            {/* Bottom Submit CTA Button */}
            <div className='btn-div'>
              <button
                type='submit'
                className='order-submit-btn'
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? '処理中...' : '入力内容を確認する  ›'}
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