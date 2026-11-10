import type { Produto, VendaPayload, VendaFinalizada, ResumoVendas } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${BASE_URL}/api/baiten`;

export async function getProdutos(busca?: string, categoria?: string): Promise<Produto[]> {
  const params = new URLSearchParams();
  if (busca) params.append('busca', busca);
  if (categoria) params.append('categoria', categoria);

  const res = await fetch(`${API_BASE}/produtos?${params.toString()}`);
  if (!res.ok) throw new Error('Erro ao buscar produtos');
  return res.json();
}

export async function getProdutoPorCodigo(codigo: string): Promise<Produto> {
  const res = await fetch(`${API_BASE}/produtos/codigo/${encodeURIComponent(codigo)}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Produto não encontrado com código: ${codigo}`);
    }
    throw new Error('Falha ao consultar código de barras');
  }
  return res.json();
}

export async function salvarProduto(produto: Partial<Produto>): Promise<{ id: number; mensagem: string }> {
  const isEdicao = Boolean(produto.id);
  const url = isEdicao ? `${API_BASE}/produtos/${produto.id}` : `${API_BASE}/produtos`;
  const method = isEdicao ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(produto),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.mensagem || 'Falha ao salvar produto');
  }
  return data;
}

export async function deletarProduto(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/produtos/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.mensagem || 'Falha ao desativar produto');
  }
}

export async function finalizarVenda(payload: VendaPayload): Promise<{ mensagem: string; venda: VendaFinalizada }> {
  const res = await fetch(`${API_BASE}/vendas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.mensagem || 'Falha ao registrar venda');
  }
  return data;
}

export async function getHistoricoVendas(): Promise<{ vendas: any[]; resumo: ResumoVendas }> {
  const res = await fetch(`${API_BASE}/vendas`);
  if (!res.ok) throw new Error('Erro ao buscar histórico de vendas');
  return res.json();
}

