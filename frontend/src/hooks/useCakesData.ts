import { useState, useEffect } from 'react';
import type { Cake } from '../types/types';

const API_URL = import.meta.env.VITE_API_URL;

export const useCakesData = () => {
  const [cakesData, setCakesData] = useState<Cake[]>([]);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/cake`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.cakes)) {
          setCakesData(data.cakes);
        } else {
          setError("Formato inesperado");
        }
      })
      .catch(err => {
        setError("Erro ao carregar bolos");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  return cakesData;
};