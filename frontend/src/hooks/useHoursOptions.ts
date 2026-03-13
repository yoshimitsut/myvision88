import { useMemo } from 'react';
import { format } from 'date-fns';
import type { TimeslotSQL } from '../types/types';

export const useHoursOptions = (
  selectedDate: Date | null, 
  timeSlotsData: TimeslotSQL[]
) => {
  return useMemo(() => {
    if (!selectedDate) return [];

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const availableSlots = timeSlotsData.filter((slot) => {
      const slotDateStr = slot.date.split("T")[0];
      return slotDateStr === formattedDate;
    });

    return availableSlots.map((slot) => ({
      id: slot.id,
      value: slot.time,
      label: slot.time,
      isDisabled: false
    }));
  }, [selectedDate, timeSlotsData]);
};