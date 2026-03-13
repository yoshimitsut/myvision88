import { useMemo } from 'react';
import { addDays } from 'date-fns';

export const useExcludedDates = (today: Date, diasBloqueados: number) => {
  return useMemo(() => {
    const blockedDates: Date[] = [];
    
    for (let i = 0; i < diasBloqueados; i++) {
      blockedDates.push(addDays(today, i));
    }

    return blockedDates;
  }, [today, diasBloqueados]);
};