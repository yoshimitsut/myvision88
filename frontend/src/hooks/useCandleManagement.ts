import { useState, useEffect, useCallback } from 'react';
import type { Candle } from '../types/types';

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

export function useCandleManagement() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingCandle, setEditingCandle] = useState<Candle | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [newCandle, setNewCandle] = useState<Partial<Candle>>({
    name: '',
    description: '',
    price: 0,
    is_active: true,
    candle_type: 'ノーマル',
    max_limit: 1
  });

  const fetchCandles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/candles`);
      if (!response.ok) throw new Error('Erro ao carregar velas');
      const data = await response.json();
      setCandles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearForm = () => {
    setEditingCandle(null);
    setNewCandle({ name: '', description: '', price: 0, is_active: true, candle_type: 'ノーマル', max_limit: 1 });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleAddCandle = async () => {
    if (!newCandle.name) {
      alert('Nome da vela é obrigatório');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('name', newCandle.name);
    formData.append('description', newCandle.description || '');
    formData.append('price', String(newCandle.price || 0));
    formData.append('is_active', String(newCandle.is_active));
    formData.append('candle_type', newCandle.candle_type || 'ノーマル');
    formData.append('max_limit', String(newCandle.max_limit || 1));

    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    try {
      const token = sessionStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/candles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('キャンドルの追加エラー');

      clearForm();
      fetchCandles();
    } catch (err: any) {
      console.error('Erro:', err);
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateCandle = async () => {
    if (!editingCandle || !editingCandle.name) {
      alert('Nome da vela é obrigatório');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('name', editingCandle.name);
    formData.append('description', editingCandle.description || '');
    formData.append('price', String(editingCandle.price || 0));
    formData.append('is_active', String(editingCandle.is_active));
    formData.append('candle_type', editingCandle.candle_type || 'ノーマル');
    formData.append('max_limit', String(editingCandle.max_limit || 1));

    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    try {
      const token = sessionStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/candles/${editingCandle.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Erro ao atualizar vela');

      clearForm();
      fetchCandles();
    } catch (err: any) {
      console.error('Erro:', err);
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCandle = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta vela?')) return;

    try {
      const token = sessionStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/candles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao excluir vela');
      fetchCandles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleActive = async (id: number) => {
    try {
      const token = sessionStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/candles/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao alterar status');
      fetchCandles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return {
    candles,
    loading,
    error,
    editingCandle,
    setEditingCandle,
    newCandle,
    setNewCandle,
    selectedImage,
    setSelectedImage,
    imagePreview,
    setImagePreview,
    uploading,
    handleImageSelect,
    clearForm,
    handleAddCandle,
    handleUpdateCandle,
    handleDeleteCandle,
    toggleActive,
    API_URL,
    FOLDER_URL
  };
}
