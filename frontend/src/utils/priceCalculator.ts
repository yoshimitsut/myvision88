import type { OrderCake, Cake, SizeOption } from '../types/types';

interface FruitOption {
  value: string;
  label: string;
  price: number;
  priceText: string;
}

// Type guard para verificar se SizeOption tem size definido
const hasSize = (size: SizeOption): size is SizeOption & { size: string } => {
  return size.size !== undefined && size.size !== null;
};

export const calculateTotalPrice = (
  cakes: OrderCake[],
  cakesData: Cake[] | null,
  fruitOptions: readonly FruitOption[]
): number => {
  if (!cakesData) return 0;

  return cakes.reduce<number>((total, cake) => {
    if (!cake.size) return total;
    const fruitPrice = fruitOptions.find(f => f.value === cake.fruit_option)?.price ?? 0;
    return total + (cake.price + fruitPrice) * cake.amount;
  }, 0);
};

export const getSizePrice = (cake: Cake | undefined, size: string): number => {
  if (!cake) return 0;
  const foundSize = cake.sizes.find(s => s.size === size);
  return foundSize?.price ?? 0;
};

export const getAvailableSizes = (cake: Cake): Array<SizeOption & { size: string }> => {
  return cake.sizes.filter(hasSize);
};