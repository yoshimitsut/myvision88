import { useState, useEffect, useCallback } from 'react';
import type { Cake, SizeOption } from '../types/types';

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

export const useCakeManagement = () => {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingCake, setEditingCake] = useState<Cake | null>(null);

  const [newCake, setNewCake] = useState({
    name: '',
    description: '',
    image: '',
    is_active: true
  });

  const [newSizes, setNewSizes] = useState<Omit<SizeOption, 'id' | 'cake_id'>[]>([
    { size: '', stock: 0, price: 0, is_active: 1 }
  ]);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Helper para requisições protegidas
  const protectedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = sessionStorage.getItem('store_token');
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    return fetch(url, { ...options, headers });
  }, []);

  // ケーキを読み込む
  const fetchCakes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/cake`);
      const data = await response.json();

      if (data.success && Array.isArray(data.cakes)) {
        setCakes(data.cakes);
      } else {
        throw new Error('予期しないレスポンス形式');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ケーキの読み込みエラー');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCakes();
  }, [fetchCakes]);

  // 🔹 画像処理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('画像は5MB以下にしてください。');
        return;
      }

      setSelectedImage(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 🔹 フォームをクリア
  const clearForm = useCallback(() => {
    setNewCake({ name: '', description: '', image: '', is_active: true });
    setNewSizes([{ size: '', stock: 0, price: 0, is_active: 1 }]);
    setSelectedImage(null);
    setImagePreview(null);
  }, []);

  // 🔹 新しいケーキを追加
  const handleAddCake = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setUploading(true);

      if (!newCake.name.trim()) {
        alert('ケーキ名は必須です');
        setUploading(false);
        return;
      }

      const formData = new FormData();
      const validSizes = newSizes.filter(size => size.size.trim() !== '');
      const hasActiveSize = validSizes.some(size => size.is_active !== 0);

      if (newCake.is_active && !hasActiveSize) {
        alert('少なくとも1つのサイズが必要です');
        setUploading(false);
        return;
      }

      formData.append('name', newCake.name.trim());
      formData.append('description', newCake.description?.trim() || '');
      formData.append('is_active', newCake.is_active ? '1' : '0');
      formData.append('sizes', JSON.stringify(validSizes));

      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await protectedFetch(`${API_URL}/api/cake`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('ケーキが正常に追加されました！');
        clearForm();
        setActiveTab('list');
        fetchCakes();
      } else {
        throw new Error(data.error || 'ケーキの追加に失敗しました');
      }
    } catch (err) {
      console.error('❌ Erro:', err);
      alert(err instanceof Error ? err.message : 'ケーキの追加に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // 🔹 ケーキを更新
  const handleUpdateCake = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCake) return;

    try {
      setUploading(true);

      const validSizes = newSizes.filter(size => size.size.trim() !== '');
      const hasActiveSize = validSizes.some(size => size.is_active !== 0);

      if (newCake.is_active && !hasActiveSize) {
        alert('少なくとも1つのサイズが必要です');
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('name', newCake.name.trim());
      formData.append('description', newCake.description?.trim() || '');
      formData.append('is_active', newCake.is_active ? '1' : '0');
      formData.append('sizes', JSON.stringify(validSizes));

      if (newCake.image && !selectedImage) {
        formData.append('existingImage', newCake.image);
      }

      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await protectedFetch(`${API_URL}/api/cake/${editingCake.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('ケーキが正常に更新されました！');
        setEditingCake(null);
        clearForm();
        setActiveTab('list');
        fetchCakes();
      } else {
        throw new Error(data.error || 'ケーキの更新に失敗しました');
      }
    } catch (err) {
      console.error('❌ Erro:', err);
      alert(err instanceof Error ? err.message : 'ケーキの更新に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // 🔹 新しいサイズを追加
  const addNewSize = () => {
    setNewSizes(prev => [...prev, { size: '', stock: 0, price: 0, is_active: 1 }]);
  };

  // 🔹 サイズを削除
  const removeSize = (index: number) => {
    if (newSizes.length > 1) {
      setNewSizes(prev => prev.filter((_, i) => i !== index));
    }
  };

  // 🔹 サイズを更新
  const updateSize = (index: number, field: keyof Omit<SizeOption, 'id' | 'cake_id'>, value: string | number) => {
    setNewSizes(prev =>
      prev.map((size, i) =>
        i === index ? { ...size, [field]: value } : size
      )
    );
  };

  // 🔹 ケーキを削除
  const handleDeleteCake = async (cakeId: number) => {
    if (!confirm('このケーキを削除してもよろしいですか？')) return;

    try {
      const response = await protectedFetch(`${API_URL}/api/cake/${cakeId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('ケーキが正常に削除されました！');
        fetchCakes();
      } else {
        throw new Error(data.error || 'ケーキの削除に失敗しました');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ケーキの削除に失敗しました');
    }
  };

  // 🔹 ケーキを編集
  const handleEditCake = (cake: Cake) => {
    setEditingCake(cake);
    setNewCake({
      name: cake.name,
      description: cake.description || '',
      image: cake.image || '',
      is_active: cake.is_active === undefined ? true : Boolean(cake.is_active)
    });
    setNewSizes(cake.sizes.length > 0
      ? cake.sizes.map(s => ({ ...s, is_active: s.is_active === undefined ? 1 : s.is_active }))
      : [{ size: '', stock: 0, price: 0, is_active: 1 }]
    );
    setImagePreview(cake.image ? `${API_URL}/image/${FOLDER_URL}/${cake.image}` : null);
    setSelectedImage(null);
    setActiveTab('add');
  };

  return {
    cakes,
    loading,
    error,
    activeTab,
    setActiveTab,
    editingCake,
    setEditingCake,
    newCake,
    setNewCake,
    newSizes,
    selectedImage,
    imagePreview,
    uploading,
    fetchCakes,
    handleImageSelect,
    clearForm,
    handleAddCake,
    handleUpdateCake,
    addNewSize,
    removeSize,
    updateSize,
    handleDeleteCake,
    handleEditCake,
    setImagePreview,
    setSelectedImage,
    API_URL,
    FOLDER_URL
  };
};
