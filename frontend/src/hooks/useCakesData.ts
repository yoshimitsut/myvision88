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
          const activeCakes = data.cakes
            .filter((cake: Cake) => cake.is_active !== 0)
            .map((cake: Cake) => ({
              ...cake,
              sizes: cake.sizes ? cake.sizes.filter(size => size.is_active !== 0) : []
            }));
          setCakesData(activeCakes);
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