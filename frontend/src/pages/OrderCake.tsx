import { useState, useEffect, useMemo } from 'react';
import DatePicker, { CalendarContainer } from "react-datepicker";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, isSameDay, format, endOfMonth, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';

import Select from 'react-select';
import type { StylesConfig, CSSObjectWithLabel, OptionProps, ControlProps } from 'react-select';
import type { OrderCake, OptionType, SizeOption, TimeOptionType } from "../types/types";

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


const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

// ==================== TIPOS ====================
interface CustomOptionType extends OptionType {
  isDisabled?: boolean;
}

// interface FormData {
//   firstName: string;
//   lastName: string;
//   email: string;
//   tel: string;
//   message: string;
// }

// ==================== CONSTANTES ====================
const DIAS_BLOQUEADOS = 2;
const FRUIT_OPTIONS = [
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

  // Estados
  // const [cakes, setCakes] = useState<OrderCake[]>([
  //   { cake_id: 0, name: "", amount: 1, size: "", price: 1, message_cake: "", fruit_option: "無し" }
  // ]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickupHour, setPickupHour] = useState("時間を選択");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [formData, setFormData] = useState<FormData>({
  //   firstName: "",
  //   lastName: "",
  //   email: "",
  //   tel: "",
  //   message: ""
  // });


  // Hooks personalizados
  const cakesData = useCakesData();
  const { timeSlotsData, availableDates } = useTimeSlots();
  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => endOfMonth(addDays(today, 30)), [today]);
  const excludedDates = useExcludedDates(today, DIAS_BLOQUEADOS);
  const hoursOptions = useHoursOptions(selectedDate, timeSlotsData);

   const initialCake = { 
    cake_id: 0, 
    name: "", 
    amount: 1, 
    size: "", 
    price: 1, 
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
        price: 1,
        message_cake: "",
        fruit_option: "無し"
      }]);
    }
  }, [cakesData, searchParams]);

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

  const toKatakana = (str: string) => {
    return str.replace(/[\u3041-\u3096]/g, (ch) => 
      String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, firstName: toKatakana(e.target.value) }));
  };

  const getLocalDateString = (date: Date | null): string => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ==================== SUBMISSÃO ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const clientId = crypto.randomUUID?.() || 
      `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const data = {
      id_client: clientId,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      tel: formData.tel,
      date: getLocalDateString(selectedDate),
      date_order: format(new Date(), "yyyy-MM-dd"),
      pickupHour,
      status: 'b',
      message: formData.message,
      cakes: cakes.map(c => {
        const cakeData = cakesData?.find(cake => Number(cake.id) === Number(c.cake_id));
        return {
          cake_id: cakeData?.id || c.cake_id,
          name: cakeData?.name || c.name,
          amount: c.amount,
          price: c.price,
          size: c.size,
          message_cake: c.message_cake || "",
          fruit_option: c.fruit_option
        };
      })
    };

    try {
      const res = await fetch(`${API_URL}/api/reservar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const result = await res.json();
      
      if (result.success) {
        navigate("/order/check", { state: { newOrderCreated: true } });
        
        // Reset form
        resetForm();
        setSelectedDate(null);
        setPickupHour("時間を選択");
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("送信に失敗しました。");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== STYLES TIPADOS ====================
  // Styles para OptionType (bolos, quantidades)
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

   // Styles para SizeOption (que agora implementa OptionType)
  const customStylesSize: StylesConfig<SizeOption, false> = {
    option: (provided: CSSObjectWithLabel, state: OptionProps<SizeOption, false>) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#fdd111' : state.isFocused ? '#fdeca2' : 'white',
      color: state.isDisabled ? '#999' : '#333',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    }),
    control: (provided: CSSObjectWithLabel, state: ControlProps<SizeOption, false>) => ({
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
  };

  const customStyles = getBaseStyles<OptionType>();
  const customStylesHour = getBaseStyles<TimeOptionType>();
  // const customStylesSize = getBaseStyles<SizeOption>();
  const customStylesCake = getBaseStyles<CustomOptionType>();

  // ==================== RENDER ====================
  return (
    <div className='reservation-main'>
      <div className="container">
        <h2 className='cake-title-h2'>デコレーションケーキ</h2>
        <h2 className='cake-title-h2'>予約フォーム</h2>

        <form className="form-order" onSubmit={handleSubmit}>
          <div className="cake-information">
            {cakes.map((item, index) => {
              const selectedCakeData = cakesData?.find(c => c.id === item.cake_id);
              const sizeOptions: SizeOption[] = selectedCakeData?.sizes.map(s => ({
                ...s,
                value: s.size,
                label: `${s.size} ￥${s.price.toLocaleString()} `
              })) || [];
              const selectedSize = sizeOptions.find(s => s.size === item.size);

              return (
                <div className="box-cake" key={`${item.cake_id}-${index}`}>
                  {index > 0 && (
                    <div className='btn-remove-div'>
                      <button type="button" onClick={() => removeCake(index)} className='btn-remove-cake'>
                        ❌
                      </button>
                    </div>
                  )}
                  
                  {selectedCakeData && (
                    <img 
                      className='img-cake-order' 
                      src={`${API_URL}/image/${FOLDER_URL}/${selectedCakeData.image}`} 
                      alt={selectedCakeData.name} 
                    />
                  )}
                  
                  <div className='input-group'>
                    <Select<CustomOptionType, false>
                      options={cakesData?.map(c => ({ value: String(c.id), label: c.name, image: c.image })) || []}
                      value={cakesData?.map(c => ({ value: String(c.id), label: c.name }))
                        .find(c => Number(c.value) === item.cake_id) || null}
                      onChange={(selected) => {
                        if (selected) {
                          const newCakeId = Number(selected.value);
                          const selectedCake = cakesData?.find(c => c.id === newCakeId);
                          updateCake(index, "cake_id", newCakeId);
                          updateCake(index, "size", "");
                          updateCake(index, "price", 0);
                          
                          if (selectedCake?.sizes && selectedCake.sizes.length === 1) {
                            const singleSize = selectedCake.sizes[0];
                            if (singleSize.stock > 0) {
                              updateCake(index, "size", singleSize.size);
                              updateCake(index, "price", singleSize.price);
                            }
                          }
                        } else {
                          updateCake(index, "cake_id", 0);
                          updateCake(index, "size", "");
                          updateCake(index, "price", 0);
                        }
                      }}
                      noOptionsMessage={() => "読み込み中..."}
                      classNamePrefix="react-select"
                      placeholder="ケーキを選択"
                      required
                      isSearchable={false}
                      styles={customStylesCake}
                    />
                    <label className='select-group'>*ケーキ名:</label>
                  </div>

                  {selectedCakeData && (
                    <div className='input-group'>
                      <Select<SizeOption, false>
                        options={sizeOptions} 
                        value={selectedSize || null}
                        onChange={(selected) => {
                          if (selected) {
                            updateCake(index, "size", selected.size);
                            updateCake(index, "price", selected.price);
                          }
                        }}
                        placeholder='サイズを選択'
                        isSearchable={false}
                        classNamePrefix='react-select'
                        required
                        styles={customStylesSize}
                      />
                      <label className='select-group'>*ケーキのサイズ</label>
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

                  <div className='input-group'>
                    <Select<OptionType, false>
                      options={Array.from({ length: 10 }, (_, i) => ({ 
                        value: String(i + 1), 
                        label: String(i + 1) 
                      }))}
                      value={Array.from({ length: 10 }, (_, i) => ({ 
                        value: String(i + 1), 
                        label: String(i + 1) 
                      })).find(opt => opt.value === String(item.amount)) || null}
                      isSearchable={false}
                      onChange={(selected) => updateCake(index, "amount", selected ? Number(selected.value) : 0)}
                      classNamePrefix="react-select"
                      placeholder="数量"
                      styles={customStyles}
                      required
                    />
                    <label className='select-group'>*個数:</label>
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
                onChange={handleFirstNameChange}
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

            <div className='input-group'>
              <Select<TimeOptionType, false>
                options={hoursOptions}
                value={hoursOptions.find(h => h.value === pickupHour)}
                onChange={(selected) => setPickupHour(selected?.value || "時間を選択")}
                classNamePrefix="react-select"
                styles={customStylesHour}
                placeholder={selectedDate ? "時間を選択" : "日付を選択してください"}
                isSearchable={false}
                isDisabled={!selectedDate || hoursOptions.length === 0}
                required
              />
              <label htmlFor="pickupHour" className='select-group'>受け取り希望時間</label>
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

          <div className='btn-div'>
            <button type='submit' className='send btn' disabled={isSubmitting}>
              {isSubmitting ? "送信中..." : "送信"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}