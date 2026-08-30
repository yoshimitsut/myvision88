import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';

import Select from 'react-select';
import type { StylesConfig, CSSObjectWithLabel, OptionProps, ControlProps } from 'react-select';
import type { OptionType, TimeOptionType, Cake } from "../../types/types";

import "../public/OrderCake.css"; // Reuse existing order styles

import { useTimeSlots } from '../../hooks/useTimeSlots';
import { useHoursOptions } from '../../hooks/useHoursOptions';
import { useOrderForm } from '../../hooks/useOrderForm';

import { calculateTotalPrice } from '../../utils/priceCalculator';
import type { OrderData, OrderStatus, PaymentStatus } from '../../types/stripe';

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

interface CustomOptionType extends OptionType {
  isDisabled?: boolean;
}

export default function OrderSameDayCake() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Fixed to today for same-day
  const today = useMemo(() => new Date(), []);
  
  const [pickupHour, setPickupHour] = useState("時間を選択");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  // States for cake data from same-day API
  const [cakesData, setCakesData] = useState<Cake[]>([]);

  // Use hooks for time options
  const { timeSlotsData } = useTimeSlots();
  const hoursOptions = useHoursOptions(today, timeSlotsData);

  const initialCake = {
    cake_id: 0,
    name: "",
    amount: 1,
    size: "",
    price: 0,
    message_cake: "",
    fruit_option: "無し" as const, // Fixed to default for same day
    candle_option: ""
  };

  const {
    cakes,
    setCakes,
    formData,
    setFormData,
    updateCake,
    handleInputChange,
  } = useOrderForm([initialCake]);

  // Load same day cakes
  useEffect(() => {
    fetch(`${API_URL}/api/samedaycake`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.same_day_cakes)) {
          const activeCakes = data.same_day_cakes.filter((cake: Cake) => cake.is_active !== 0);
          setCakesData(activeCakes);
        }
      })
      .catch((err) => console.error("Erro ao carregar bolos do dia:", err));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const selectedCakeName = searchParams.get("cake");
  const selectedSizeName = searchParams.get("size");

  useEffect(() => {
    if (!cakesData.length || !selectedCakeName) return;

    const normalizedCakeParam = decodeURIComponent(selectedCakeName).normalize("NFC");
    const normalizedSizeParam = selectedSizeName ? decodeURIComponent(selectedSizeName).normalize("NFC") : "";

    const selectedCake = cakesData.find(c => {
      const nameNorm = c.name ? c.name.normalize("NFC") : "";
      return nameNorm === normalizedCakeParam;
    });

    if (selectedCake) {
      const sizeOption = selectedCake.sizes?.find(s => {
        const sizeNorm = s.size ? s.size.normalize("NFC") : "";
        return sizeNorm === normalizedSizeParam;
      });

      const resolvedSize = sizeOption?.size || (selectedCake.sizes?.[0]?.size || "");
      const resolvedPrice = sizeOption?.price || (selectedCake.sizes?.[0]?.price || 0);

      setCakes(prevCakes => {
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
          fruit_option: "無し",
          candle_option: ""
        }];
      });
    }
  }, [cakesData, selectedCakeName, selectedSizeName, setCakes]);

  useEffect(() => {
    // Only calculate using the price set in the state
    const total = cakes.reduce((acc, curr) => acc + (curr.price * curr.amount), 0);
    setTotalAmount(total);
  }, [cakes]);

  useEffect(() => {
    if (pickupHour !== "時間を選択") {
      const isHourAvailable = hoursOptions.some(opt => opt.value === pickupHour);
      if (!isHourAvailable) {
        setPickupHour("時間を選択");
      }
    }
  }, [hoursOptions, pickupHour]);

  const toKatakana = (str: string): string => {
    return str.replace(/[\u3041-\u3096]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );
  };

  const handleKatakanaBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: toKatakana(value) }));
  };

  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (pickupHour === "時間を選択") {
      alert("受け取り時間を選択してください。");
      setIsSubmitting(false);
      return;
    }

    const invalidCake = cakes.find(c => !c.size || c.cake_id === 0);
    if (invalidCake) {
      alert("ケーキとサイズを選択してください。");
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
      date: getLocalDateString(today),
      date_order: format(new Date(), "yyyy-MM-dd"),
      pickupHour,
      status: 'b' as OrderStatus,
      message: formData.message,
      total_amount: totalAmount,
      payment_status: 'pending' as PaymentStatus,
      cakes: cakes.map(c => {
        return {
          cake_id: c.cake_id,
          name: c.name,
          amount: c.amount,
          price: c.price,
          size: c.size as string,
          message_cake: "",
          fruit_option: "無し",
          fruit_price: 0
        };
      })
    };

    try {
      const res = await fetch(`${API_URL}/api/reservar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderDataToSave),
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
      } else {
        alert("予約の保存に失敗しました。");
        console.error(result.error);
      }
    } catch (error) {
      alert("エラーが発生しました。");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
  });

  const customStylesHour = getBaseStyles<TimeOptionType>();

  const selectedCakeData = cakesData.find(c => c.id === cakes[0].cake_id);

  return (
    <div className='reservation-main'>
      <div className="container">
        <h1 className='order-form-title'>当日受取予約フォーム</h1>
        <div className="order-form-divider">
          <span className="divider-line"></span>
          <span className="infinity-symbol">∞</span>
          <span className="divider-line"></span>
        </div>

        <form className="form-order" onSubmit={handleSubmit}>
          <div className="cake-information">
            <div className="box-cake">
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

              {/* Cake Info (Read Only) */}
              <div className='order-field-group'>
                <div className="field-label-row">
                  <span className="field-label-text">商品名</span>
                </div>
                <div className="sameday-read-only-field">
                  {cakes[0].name || "選択されていません"}
                </div>
              </div>

              {/* Quantity */}
              <div className='order-field-group'>
                <div className="field-label-row">
                  <span className="field-label-text">個数</span>
                  <span className="field-required-badge">必須</span>
                </div>
                <div className='quantity-pills-grid'>
                  {Array.from({ length: 5 }, (_, i) => {
                    const quantity = i + 1;
                    const isSelected = cakes[0].amount === quantity;
                    return (
                      <div
                        key={quantity}
                        className={`pill-option-card quantity-pill ${isSelected ? 'selected' : ''}`}
                        onClick={() => updateCake(0, "amount", quantity)}
                        style={{ pointerEvents: cakes[0].cake_id ? 'auto' : 'none' }}
                      >
                        {quantity}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Size */}
              {selectedCakeData && selectedCakeData.sizes && (
                <div className={`order-field-group`}>
                  <div className="field-label-row">
                    <span className="field-label-text">サイズ</span>
                    <span className="field-required-badge">必須</span>
                  </div>
                  <div className="option-pills-grid">
                    {selectedCakeData.sizes.filter(s => s.is_active !== 0 && s.stock > 0).map((s, sIdx) => {
                      const isSelected = cakes[0].size === s.size;
                      return (
                        <div
                          key={sIdx}
                          className={`option-pill-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            updateCake(0, "size", s.size);
                            updateCake(0, "price", s.price);
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
            </div>
          </div>

          <div className="order-form-divider-sub"></div>

          {/* Customer Details Section */}
          <div className="form-section">
            <h2 className="section-title">お客様情報</h2>

            <div className="input-group-row">
              <div className="input-group">
                <div className="field-label-row">
                  <label htmlFor="firstName">姓 (ふりがな)</label>
                  <span className="field-required-badge">必須</span>
                </div>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onBlur={handleKatakanaBlur}
                  required
                  placeholder="やまだ"
                  className="modern-input"
                />
              </div>
              <div className="input-group">
                <div className="field-label-row">
                  <label htmlFor="lastName">名 (ふりがな)</label>
                  <span className="field-required-badge">必須</span>
                </div>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onBlur={handleKatakanaBlur}
                  required
                  placeholder="たろう"
                  className="modern-input"
                />
              </div>
            </div>

            <div className="input-group">
              <div className="field-label-row">
                <label htmlFor="email">メールアドレス</label>
                <span className="field-required-badge">必須</span>
              </div>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="example@email.com"
                className="modern-input"
              />
            </div>

            <div className="input-group">
              <div className="field-label-row">
                <label htmlFor="tel">電話番号</label>
                <span className="field-required-badge">必須</span>
              </div>
              <input
                type="tel"
                id="tel"
                value={formData.tel}
                onChange={handleInputChange}
                required
                placeholder="090-1234-5678"
                className="modern-input"
              />
            </div>
          </div>

          <div className="order-form-divider-sub"></div>

          {/* Date & Time Selection Section */}
          <div className="form-section date-time-section">
            <h2 className="section-title">受け取り時間</h2>
            
            <div className="input-group date-picker-group">
              <div className="field-label-row">
                <label>お受け取り日</label>
              </div>
              <div className="sameday-read-only-field" style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', background: '#f5f5f5' }}>
                本日 ({format(today, 'yyyy年MM月dd日')})
              </div>
            </div>

            <div className="input-group time-select-group">
              <div className="field-label-row">
                <label>ご来店時間</label>
                <span className="field-required-badge">必須</span>
              </div>
              <Select<TimeOptionType, false>
                options={hoursOptions}
                value={hoursOptions.find(option => option.value === pickupHour) || null}
                onChange={(selectedOption) => {
                  if (selectedOption) {
                    setPickupHour(selectedOption.value);
                  }
                }}
                isSearchable={false}
                placeholder="時間を選択"
                styles={customStylesHour}
                noOptionsMessage={() => "選択可能な時間がありません"}
              />
            </div>
          </div>

          {/* Payment Note for Same Day */}
          <div className="payment-method-selector" style={{ marginTop: '30px' }}>
             <h3>お支払い方法</h3>
             <div className="payment-method-options">
               <label className="payment-method-option active">
                 <span className="method-icon"><img src="/icons/store.png" alt="store icon" className='store-icon-order' /></span>
                 <span className="method-label">店舗支払い</span>
                 <span className="method-description">当日店舗でお支払い</span>
               </label>
             </div>
          </div>

          {/* Fixed Footer Actions */}
          <div className="form-actions-fixed">
            <div className="total-amount-display">
              <span className="total-label">合計金額 (税込):</span>
              <span className="total-value">¥{totalAmount.toLocaleString()}</span>
            </div>
            <button 
              type="submit" 
              className={`submit-btn ${isSubmitting ? 'submitting' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? '処理中...' : '予約を確定する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
