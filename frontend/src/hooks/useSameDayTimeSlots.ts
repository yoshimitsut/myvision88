import { useState, useEffect } from 'react';
import type { SameDayTimeSlot } from '../types/types';

const API_URL = import.meta.env.VITE_API_URL;

export const useSameDayTimeSlots = () => {
  const [timeSlots, setTimeSlots] = useState<SameDayTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeSlots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/sameday-times`);
      const data = await res.json();
      if (data.success && Array.isArray(data.timeslots)) {
        // Create a Map to automatically handle duplicates by key (id)
        // This ensures that if there are duplicate IDs, only the last one is kept
        const uniqueSlotsMap = new Map<number, SameDayTimeSlot>();

        data.timeslots.forEach((slot: SameDayTimeSlot) => {
          uniqueSlotsMap.set(slot.id, slot);
        });

        // Convert the Map values back to an array
        const uniqueSlots = Array.from(uniqueSlotsMap.values());

        setTimeSlots(uniqueSlots);
      } else {
        setError(data.error || 'Erro ao carregar horários');
      }
    } catch (err) {
      console.error('Erro ao buscar horários:', err);
      setError('Erro de conexão ao buscar horários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  const addTimeSlot = async (time: string) => {
    try {
      const token = sessionStorage.getItem('store_token');
      const res = await fetch(`${API_URL}/api/sameday-times`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ time, is_active: 1 })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTimeSlots();
        return true;
      }
      throw new Error(data.error || 'Falha ao adicionar horário');
    } catch (e: any) {
      console.error(e);
      alert(e.message);
      return false;
    }
  };

  const toggleTimeSlot = async (id: number, time: string, currentStatus: number) => {
    try {
      const token = sessionStorage.getItem('store_token');
      const res = await fetch(`${API_URL}/api/sameday-times/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ time, is_active: currentStatus === 1 ? 0 : 1 })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTimeSlots();
        return true;
      }
      throw new Error(data.error || 'Falha ao atualizar horário');
    } catch (e: any) {
      console.error(e);
      alert(e.message);
      return false;
    }
  };

  const deleteTimeSlot = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este horário?')) return false;
    try {
      const token = sessionStorage.getItem('store_token');
      const res = await fetch(`${API_URL}/api/sameday-times/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        await fetchTimeSlots();
        return true;
      }
      throw new Error(data.error || 'Falha ao remover horário');
    } catch (e: any) {
      console.error(e);
      alert(e.message);
      return false;
    }
  };

  return { timeSlots, loading, error, addTimeSlot, toggleTimeSlot, deleteTimeSlot, refreshTimeSlots: fetchTimeSlots };
};
