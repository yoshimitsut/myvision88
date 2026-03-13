import { useCallback } from 'react';
import { format, isSameDay } from 'date-fns';

export const useDateValidation = (
  today: Date,
  excludedDates: Date[],
  availableDates: string[]
) => {
  const isDateAllowed = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    if (date < today) return false;
    
    const isBlocked = excludedDates.some(blockedDate => 
      isSameDay(blockedDate, date)
    );
    if (isBlocked) return false;
    
    return availableDates.includes(dateStr);
  }, [today, excludedDates, availableDates]);

  return { isDateAllowed };
};