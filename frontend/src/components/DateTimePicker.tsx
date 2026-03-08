// components/DateTimePicker.tsx
import { useState, useEffect, useMemo } from "react";
import DatePicker from "react-datepicker";
import Select from "react-select";
import { ja } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import type { TimeOptionType } from "../types/types";
import { addDays, isSameDay, endOfMonth, getDay, format } from "date-fns";

export type DateTimePickerProps = {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  placeholderDate?: string;
  placeholderTime?: string;
};

const today = new Date();
const diasABloquear = 3;
const maxDate = endOfMonth(addDays(today, 90));

const gerarDiasBloqueadosInicio = () => {
  const datas = [];
  let data = today;
  while (datas.length < diasABloquear) {
    datas.push(data);
    data = addDays(data, 1);
  }
  return datas;
};

const excludedDatesBase = gerarDiasBloqueadosInicio();

export default function DateTimePicker({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
}: DateTimePickerProps) {
  const [pickupHour, setPickupHour] = useState(selectedTime || "");
  const [allTimeslots, setAllTimeslots] = useState<{ id: number; date: string; time: string }[]>([]);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());

  // Fetch único de todos os timeslots
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/timeslots`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAllTimeslots(data.timeslots);
          // Monta set de datas disponíveis para filtrar o calendário
          const dates = new Set<string>(data.timeslots.map((t: { date: string }) => t.date));
          setAvailableDates(dates);
        }
      })
      .catch((err) => console.error("Erro ao buscar timeslots:", err));
  }, []);

  const handleDateChange = (date: Date | null) => {
    setPickupHour("");
    setSelectedTime("");
    setSelectedDate(date);
  }
  
  const timeOptions = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return allTimeslots
      .filter((t) => t.date === dateStr)
      .map((t) => ({ id: t.id, value: t.time, label: t.time }));
  }, [selectedDate, allTimeslots]);

  // Data só é selecionável se existir no banco
  const isDateAllowed = (date: Date) => {
    if (excludedDatesBase.some((d) => isSameDay(d, date))) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    return availableDates.has(dateStr);
  };

  const renderDayContents = (day: number, date: Date) => {
    const todayNow = new Date();
    const isBlocked = !isDateAllowed(date);
    const isSunday = getDay(date) === 0;
    const isPast = date.getTime() < new Date(todayNow.setHours(0, 0, 0, 0)).getTime();
    const isGraySunday = isSunday && (isBlocked || isPast);

    return (
      <div className={`day-cell ${isGraySunday ? "domingo-cinza" : ""}`}>
        <span>{day}</span>
      </div>
    );
  };

  return (
    <div className="datetime-picker">
      <div className="input-group-edit">
        <label style={{ paddingLeft: "2px" }}>受け取り希望日</label>
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          minDate={today}
          maxDate={maxDate}
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
          required
          renderDayContents={renderDayContents}
        />
      </div>

      <div className="input-group-edit">
        <label>受け取り希望時間</label>
        <Select<TimeOptionType>
          options={timeOptions}
          value={timeOptions.find((h) => h.value === pickupHour) || null}
          onChange={(selected) => {
            const newTime = selected?.value || "";
            setPickupHour(newTime);
            setSelectedTime(newTime);
          }}
          classNamePrefix="react-select"
          placeholder={selectedDate ? "時間を選択" : "先に日付を選択してください"}
          isSearchable={false}
          isDisabled={!selectedDate}
          required
          isOptionDisabled={(opt) => !!opt.isDisabled}
          noOptionsMessage={() => "この日は空きがありません"}
        />
      </div>
    </div>
  );
}