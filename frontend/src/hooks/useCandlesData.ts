import { useState, useEffect } from 'react';
import type { Candle } from '../types/types';

const API_URL = import.meta.env.VITE_API_URL;

export const useCandlesData = () => {
  const [candlesData, setCandlesData] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/candles`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filtra apenas as velas ativas (is_active = 1 ou true)
          const activeCandles = data.filter((candle: Candle) => candle.is_active);
          setCandlesData(activeCandles);
        } else {
          setError("予期しないレスポンス形式");
        }
      })
      .catch(err => {
        setError("キャンドルの読み込みエラー");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  return { candlesData, loading, error };
};
