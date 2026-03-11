import { useEffect, useState } from "react";
import type { StoreInfo } from "../types/types";

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreInfo | null>(null)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/storeinfo`)
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar config: ', err);
        setLoading(false);
      });
  }, []);

  return { settings, loading };
}