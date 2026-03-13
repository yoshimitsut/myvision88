import { useState, useEffect } from 'react';
import type { TimeslotSQL } from '../types/types';

const API_URL = import.meta.env.VITE_API_URL;

export const useTimeSlots = () => {
  const [timeSlotsData, setTimeSlotsData] = useState<TimeslotSQL[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/timeslots/`)
      .then(res => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.timeslots)) {
          setTimeSlotsData(data.timeslots);
          
          const uniqueDates = [...new Set(
            data.timeslots.map((slot: TimeslotSQL) => slot.date.split("T")[0])
          )] as string[];
          
          setAvailableDates(uniqueDates);
        }
      })
      .catch(err => console.error("Erro ao carregar datas:", err))
      .finally(() => setLoading(false));
  }, []);

  return { timeSlotsData, availableDates, loading };
};