import { useState } from 'react';
import type { OrderCake } from '../types/types';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  tel: string;
  message: string;
}

export const useOrderForm = (initialCakes: OrderCake[]) => {
  const [cakes, setCakes] = useState<OrderCake[]>(initialCakes);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    tel: "",
    message: ""
  });

  const addCake = () => {
    setCakes(prev => [
      ...prev,
      { cake_id: 0, name: "", amount: 1, size: "", price: 1, message_cake: "", fruit_option: "無し" }
    ]);
  };

  const removeCake = (index: number) => {
    setCakes(prev => prev.filter((_, i) => i !== index));
  };

  const updateCake = <K extends keyof OrderCake>(
    index: number,
    field: K,
    value: OrderCake[K]
  ) => {
    setCakes(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const resetForm = () => {
    setCakes(initialCakes);
    setFormData({ firstName: "", lastName: "", email: "", tel: "", message: "" });
  };

  return {
    cakes,
    formData,
    setFormData,
    addCake,
    setCakes,
    removeCake,
    updateCake,
    handleInputChange,
    resetForm
  };
};