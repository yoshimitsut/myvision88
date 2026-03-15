import type { Cake, SizeOption } from '../types/types';

// Interface para o que o priceCalculator precisa
export interface CakeForCalculation {
  id: number;
  name: string;
  sizes: Array<{
    size: string;      // Aqui é obrigatório
    price: number;
    stock: number;
  }>;
  image: string | null;
}

// Converte Cake para o formato que o priceCalculator espera
export const adaptCakeForCalculation = (cake: Cake): CakeForCalculation => ({
  id: cake.id,
  name: cake.name,
  image: cake.image,
  sizes: cake.sizes
    .filter((size): size is SizeOption & { size: string } => {
      // Filtra apenas sizes que têm size definido
      return size.size !== undefined && size.size !== null;
    })
    .map(size => ({
      size: size.size,        // Agora é string (garantido pelo filter)
      price: size.price,
      stock: size.stock
    }))
});

export const adaptCakesForCalculation = (cakes: Cake[] | null): CakeForCalculation[] | null => {
  if (!cakes) return null;
  return cakes.map(adaptCakeForCalculation);
};

// Função segura para obter preço
export const getSizePriceSafe = (cake: Cake | undefined, size: string): number => {
  if (!cake) return 0;
  const foundSize = cake.sizes.find(s => s.size === size);
  return foundSize?.price ?? 0;
};

// Função segura para verificar disponibilidade
export const isSizeAvailable = (cake: Cake | undefined, size: string): boolean => {
  if (!cake) return false;
  const foundSize = cake.sizes.find(s => s.size === size);
  return foundSize ? foundSize.stock > 0 : false;
};