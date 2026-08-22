/**
 * Aplica as cores da loja dinamicamente no elemento raiz do DOM (:root)
 */
export function applyStoreTheme(primaryColor?: string, secondaryColor?: string) {
  const root = document.documentElement;
  const primary = primaryColor || '#000000';
  const secondary = secondaryColor || '#fdd111';

  root.style.setProperty('--primary-color', primary);
  root.style.setProperty('--secondary-color', secondary);

  // Calcula automaticamente a cor de hover (mais clara ou mais escura conforme a cor base)
  const hoverColor = adjustBrightness(primary, -20);
  root.style.setProperty('--primary-hover', hoverColor);
}

/**
 * Ajusta o brilho de uma cor HEX (porcentagem negativa escurece, positiva clareia)
 */
function adjustBrightness(hex: string, percent: number): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }

  let num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;

  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
