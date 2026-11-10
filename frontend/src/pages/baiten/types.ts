export interface Produto {
  id: number;
  codigo_barras: string;
  nome: string;
  descricao?: string;
  preco_venda: number;
  preco_custo: number;
  estoque_atual: number;
  estoque_minimo: number;
  categoria: string;
  ativo: boolean;
  criado_em?: string;
}

export interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  subtotal: number;
}

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'OUTRO';

export interface VendaPayload {
  forma_pagamento: FormaPagamento;
  valor_pago?: number;
  observacoes?: string;
  itens: {
    produto_id: number;
    quantidade: number;
  }[];
}

export interface VendaFinalizada {
  id: number;
  codigo_venda: string;
  valor_total: number;
  valor_pago: number;
  troco: number;
  forma_pagamento: FormaPagamento;
  status: string;
  itens: {
    produto_id: number;
    nome: string;
    codigo_barras: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
  }[];
}

export interface ResumoVendas {
  total_vendas: number;
  faturamento_total: number;
  total_dinheiro: number;
  total_pix: number;
  total_cartao: number;
}

