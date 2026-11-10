import React, { useState, useEffect } from 'react';
import type { ResumoVendas } from '../types';
import { getHistoricoVendas } from '../services/api';

export const HistoricoTab: React.FC = () => {
  const [vendas, setVendas] = useState<any[]>([]);
  const [resumo, setResumo] = useState<ResumoVendas>({
    total_vendas: 0,
    faturamento_total: 0,
    total_dinheiro: 0,
    total_pix: 0,
    total_cartao: 0,
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarHistorico = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await getHistoricoVendas();
      setVendas(data.vendas);
      setResumo(data.resumo);
    } catch (err: any) {
      setErro(err.message || 'Erro ao consultar histórico de vendas.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  const formatarData = (dataStr: string) => {
    try {
      const d = new Date(dataStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dataStr;
    }
  };

  const badgeFormaPagamento = (forma: string) => {
    switch (forma) {
      case 'DINHEIRO':
        return <span className="tag-pagamento dinheiro">💵 Dinheiro</span>;
      case 'PIX':
        return <span className="tag-pagamento pix">📱 PIX</span>;
      case 'CARTAO_CREDITO':
        return <span className="tag-pagamento cartao">💳 Crédito</span>;
      case 'CARTAO_DEBITO':
        return <span className="tag-pagamento cartao">💳 Débito</span>;
      default:
        return <span className="tag-pagamento">{forma}</span>;
    }
  };

  return (
    <div className="historico-container">
      <div className="historico-header">
        <div>
          <h2>📊 Histórico de Vendas & Fechamento</h2>
          <p className="subtitle">Visão consolidada do faturamento e vendas realizadas no evento.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={carregarHistorico}>
            🔄 Atualizar
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            🖨️ Imprimir Fechamento
          </button>
        </div>
      </div>

      {erro && <div className="status-banner erro">{erro}</div>}

      {/* Cards de Métricas do Fechamento de Caixa */}
      <div className="metric-cards-grid">
        <div className="metric-card faturamento">
          <span className="metric-title">Faturamento Total</span>
          <strong className="metric-val">R$ {Number(resumo.faturamento_total).toFixed(2)}</strong>
          <span className="metric-sub">{resumo.total_vendas} vendas concluídas</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">💵 Dinheiro em Caixa</span>
          <strong className="metric-val">R$ {Number(resumo.total_dinheiro).toFixed(2)}</strong>
          <span className="metric-sub">Total recebido em espécie</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">📱 Recebido em PIX</span>
          <strong className="metric-val">R$ {Number(resumo.total_pix).toFixed(2)}</strong>
          <span className="metric-sub">Transferências instantâneas</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">💳 Total em Cartão</span>
          <strong className="metric-val">R$ {Number(resumo.total_cartao).toFixed(2)}</strong>
          <span className="metric-sub">Crédito + Débito</span>
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="tabela-card">
        <h3 className="section-title">Últimas Vendas Realizadas</h3>
        <table className="tabela-produtos">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Código da Venda</th>
              <th>Forma de Pagamento</th>
              <th>Valor Total</th>
              <th>Valor Pago</th>
              <th>Troco</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vendas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  {carregando ? 'Carregando vendas...' : 'Nenhuma venda registrada ainda.'}
                </td>
              </tr>
            ) : (
              vendas.map((v) => (
                <tr key={v.id}>
                  <td>{formatarData(v.criado_em)}</td>
                  <td>
                    <code className="code-badge">{v.codigo_venda}</code>
                  </td>
                  <td>{badgeFormaPagamento(v.forma_pagamento)}</td>
                  <td>
                    <strong>R$ {Number(v.valor_total).toFixed(2)}</strong>
                  </td>
                  <td>R$ {Number(v.valor_pago).toFixed(2)}</td>
                  <td>
                    {v.troco > 0 ? (
                      <span className="text-troco">R$ {Number(v.troco).toFixed(2)}</span>
                    ) : (
                      'R$ 0,00'
                    )}
                  </td>
                  <td>
                    <span className="status-label normal">{v.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

