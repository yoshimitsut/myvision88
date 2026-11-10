import React, { useState, useEffect, useRef } from 'react';
import type { Produto, ItemCarrinho, FormaPagamento, VendaFinalizada } from '../types';
import { getProdutos, getProdutoPorCodigo, finalizarVenda } from '../services/api';
import { playBeep } from '../utils/audio';
import { BarcodeCameraScanner } from './BarcodeCameraScanner';

interface PDVTabProps {
  carrinho: ItemCarrinho[];
  setCarrinho: React.Dispatch<React.SetStateAction<ItemCarrinho[]>>;
}

export const PDVTab: React.FC<PDVTabProps> = ({ carrinho, setCarrinho }) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [codigoInput, setCodigoInput] = useState('');
  const [mensagemStatus, setMensagemStatus] = useState<{ texto: string; tipo: 'sucesso' | 'erro' } | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todas');
  const [loading, setLoading] = useState(false);

  // Controle da Câmera do Smartphone
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [ultimoCodigoLido, setUltimoCodigoLido] = useState<string | null>(null);
  const [mostrarEntradaManual, setMostrarEntradaManual] = useState(false);

  // Estados do Modal de Pagamento
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [valorPago, setValorPago] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [processandoVenda, setProcessandoVenda] = useState(false);

  // Estado do Modal de Sucesso
  const [vendaConcluida, setVendaConcluida] = useState<VendaFinalizada | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const valorPagoInputRef = useRef<HTMLInputElement>(null);

  // Carrega produtos para acesso rápido
  const carregarProdutos = async () => {
    try {
      const data = await getProdutos();
      setProdutos(data);
    } catch (err) {
      console.error('Erro ao carregar produtos do Baiten:', err);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  // Foca no campo manual quando necessário
  useEffect(() => {
    if (!cameraAtiva && !modalPagamentoAberto && !vendaConcluida && mostrarEntradaManual) {
      barcodeInputRef.current?.focus();
    }
  }, [cameraAtiva, modalPagamentoAberto, vendaConcluida, mostrarEntradaManual]);

  // Foca no campo de valor pago ao abrir modal de pagamento
  useEffect(() => {
    if (modalPagamentoAberto && formaPagamento === 'DINHEIRO') {
      setTimeout(() => valorPagoInputRef.current?.focus(), 100);
    }
  }, [modalPagamentoAberto, formaPagamento]);

  const categorias = ['Todas', ...Array.from(new Set(produtos.map((p) => p.categoria)))];

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
  const totalItensQtd = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  const adicionarAoCarrinho = (produto: Produto, quantidade = 1) => {
    if (produto.estoque_atual <= 0) {
      playBeep('error');
      setMensagemStatus({
        texto: `⚠️ "${produto.nome}" está ESGOTADO no estoque!`,
        tipo: 'erro',
      });
      return;
    }

    setCarrinho((prev) => {
      const itemExistente = prev.find((item) => item.produto.id === produto.id);

      if (itemExistente) {
        const novaQtd = itemExistente.quantidade + quantidade;
        if (novaQtd > produto.estoque_atual) {
          playBeep('error');
          setMensagemStatus({
            texto: `⚠️ Estoque máximo atingido para "${produto.nome}" (${produto.estoque_atual} disponíveis).`,
            tipo: 'erro',
          });
          return prev;
        }

        playBeep('success');
        setMensagemStatus({
          texto: `+1 ${produto.nome} (Total no carrinho: ${novaQtd})`,
          tipo: 'sucesso',
        });

        return prev.map((item) =>
          item.produto.id === produto.id
            ? {
              ...item,
              quantidade: novaQtd,
              subtotal: Number((novaQtd * Number(produto.preco_venda)).toFixed(2)),
            }
            : item
        );
      } else {
        playBeep('success');
        setMensagemStatus({
          texto: `Adicionado: ${produto.nome} (R$ ${Number(produto.preco_venda).toFixed(2)})`,
          tipo: 'sucesso',
        });

        return [
          ...prev,
          {
            produto,
            quantidade,
            subtotal: Number((quantidade * Number(produto.preco_venda)).toFixed(2)),
          },
        ];
      }
    });
  };

  const alterarQuantidade = (produtoId: number, delta: number) => {
    setCarrinho((prev) => {
      return prev
        .map((item) => {
          if (item.produto.id === produtoId) {
            const novaQtd = item.quantidade + delta;
            if (novaQtd <= 0) return null;
            if (novaQtd > item.produto.estoque_atual) {
              setMensagemStatus({
                texto: `⚠️ Estoque insuficiente (${item.produto.estoque_atual} disponíveis)`,
                tipo: 'erro',
              });
              return item;
            }
            return {
              ...item,
              quantidade: novaQtd,
              subtotal: Number((novaQtd * Number(item.produto.preco_venda)).toFixed(2)),
            };
          }
          return item;
        })
        .filter(Boolean) as ItemCarrinho[];
    });
  };

  const removerDoCarrinho = (produtoId: number) => {
    setCarrinho((prev) => prev.filter((item) => item.produto.id !== produtoId));
  };

  const limparCarrinho = () => {
    if (carrinho.length === 0) return;
    if (confirm('Deseja realmente esvaziar o carrinho atual?')) {
      setCarrinho([]);
      setMensagemStatus(null);
    }
  };

  // Processa o código de barras lido (seja via Câmera do Celular ou Leitor USB)
  const processarCodigoBarras = async (codigoBruto: string) => {
    const codigo = codigoBruto.trim();
    if (!codigo) return;

    setLoading(true);
    try {
      // 1. Tenta buscar em cache local para resposta ultra-rápida
      const produtoLocal = produtos.find(
        (p) => p.codigo_barras.toLowerCase() === codigo.toLowerCase()
      );

      if (produtoLocal) {
        adicionarAoCarrinho(produtoLocal);
        setUltimoCodigoLido(`${produtoLocal.nome} (${codigo})`);
      } else {
        // 2. Se não estiver em cache, consulta o banco de dados
        const produtoApi = await getProdutoPorCodigo(codigo);
        adicionarAoCarrinho(produtoApi);
        setUltimoCodigoLido(`${produtoApi.nome} (${codigo})`);
      }
      setCodigoInput('');
    } catch (err: any) {
      playBeep('error');
      setMensagemStatus({
        texto: err.message || `Código "${codigo}" não encontrado!`,
        tipo: 'erro',
      });
      setUltimoCodigoLido(`Não encontrado: ${codigo}`);
      setCodigoInput('');
    } finally {
      setLoading(false);
    }
  };

  // Disparado ao submeter formulário manual ou leitor USB
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processarCodigoBarras(codigoInput);
    barcodeInputRef.current?.focus();
  };

  // Disparado automaticamente pela câmera do celular ao detectar barra de código
  const handleCameraScan = (codigoDetectado: string) => {
    processarCodigoBarras(codigoDetectado);
  };

  const abrirModalPagamento = () => {
    if (carrinho.length === 0) {
      alert('Adicione pelo menos um produto ao pedido antes de finalizar.');
      return;
    }
    setValorPago(totalCarrinho.toFixed(2));
    setModalPagamentoAberto(true);
  };

  const handleFinalizarVenda = async () => {
    const valorPagoNum = parseFloat(valorPago.replace(',', '.')) || totalCarrinho;

    if (formaPagamento === 'DINHEIRO' && valorPagoNum < totalCarrinho) {
      alert(`Valor recebido (R$ ${valorPagoNum.toFixed(2)}) é menor que o total (R$ ${totalCarrinho.toFixed(2)})`);
      return;
    }

    setProcessandoVenda(true);
    try {
      const res = await finalizarVenda({
        forma_pagamento: formaPagamento,
        valor_pago: formaPagamento === 'DINHEIRO' ? valorPagoNum : totalCarrinho,
        observacoes,
        itens: carrinho.map((i) => ({
          produto_id: i.produto.id,
          quantidade: i.quantidade,
        })),
      });

      // Sucesso na venda!
      setModalPagamentoAberto(false);
      setVendaConcluida(res.venda);
      setCarrinho([]);
      setObservacoes('');
      carregarProdutos(); // Atualiza estoques
    } catch (err: any) {
      alert(`Erro ao finalizar venda: ${err.message}`);
    } finally {
      setProcessandoVenda(false);
    }
  };

  const produtosFiltrados = categoriaAtiva === 'Todas'
    ? produtos
    : produtos.filter((p) => p.categoria === categoriaAtiva);

  const trocoCalculado = Math.max(
    0,
    (parseFloat(valorPago.replace(',', '.')) || 0) - totalCarrinho
  );

  return (
    <div className="pdv-container">
      {/* Coluna Esquerda: Câmera do Celular, Leitor e Catálogo Rápido */}
      <div className="pdv-left">
        {/* Leitor de Código de Barras via Câmera do Smartphone */}
        <BarcodeCameraScanner
          ativo={cameraAtiva && !modalPagamentoAberto && !vendaConcluida}
          setAtivo={setCameraAtiva}
          onScan={handleCameraScan}
          ultimoCodigoLido={ultimoCodigoLido}
        />

        {/* Feedback de status visual */}
        {mensagemStatus && (
          <div className={`status-banner ${mensagemStatus.tipo}`}>
            {mensagemStatus.texto}
          </div>
        )}

        {/* Entrada Manual / Leitor USB (Opcional ou Alternativa) */}
        <div className="scanner-card">
          <div className="scanner-label" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="scanner-icon">⌨️</span>
              <strong>Digitar Código ou Leitor USB</strong>
            </div>
            <button
              type="button"
              className="btn-link-toggle"
              onClick={() => setMostrarEntradaManual(!mostrarEntradaManual)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {mostrarEntradaManual ? '▲ Recolher' : '▼ Expandir'}
            </button>
          </div>

          {mostrarEntradaManual && (
            <form onSubmit={handleScanSubmit} className="scanner-form" style={{ marginTop: '0.5rem' }}>
              <input
                ref={barcodeInputRef}
                type="text"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                placeholder="Ex: 7894900010015"
                className="scanner-input"
                disabled={loading}
                autoComplete="off"
              />
              <button type="submit" className="scanner-btn" disabled={loading || !codigoInput}>
                {loading ? 'Buscando...' : 'Adicionar'}
              </button>
            </form>
          )}
        </div>

        {/* Grade de Produtos Rápidos (para toque/clique direto) */}
        <div className="quick-products-section">
          <div className="category-filters">
            {categorias.map((cat) => (
              <button
                key={cat}
                className={`category-pill ${categoriaAtiva === cat ? 'active' : ''}`}
                onClick={() => setCategoriaAtiva(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="quick-grid">
            {produtosFiltrados.map((p) => {
              const esgotado = p.estoque_atual <= 0;
              return (
                <button
                  key={p.id}
                  className={`product-card-btn ${esgotado ? 'esgotado' : ''}`}
                  onClick={() => adicionarAoCarrinho(p)}
                  disabled={esgotado}
                  title={`Código: ${p.codigo_barras}`}
                >
                  <div className="product-card-header">
                    <span className="product-card-categoria">{p.categoria}</span>
                    <span className={`product-card-estoque ${p.estoque_atual <= p.estoque_minimo ? 'baixo' : ''}`}>
                      {p.estoque_atual} un
                    </span>
                  </div>
                  <div className="product-card-nome">{p.nome}</div>
                  <div className="product-card-preco">
                    R$ {Number(p.preco_venda).toFixed(2)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Coluna Direita: Carrinho e Caixa */}
      <div className="pdv-right">
        <div className="cart-card">
          <div className="cart-header">
            <h2>🛒 Pedido do Cliente</h2>
            {carrinho.length > 0 && (
              <button onClick={limparCarrinho} className="btn-clear-cart" title="Esvaziar">
                Limpar
              </button>
            )}
          </div>

          {/* Lista de Itens no Carrinho */}
          <div className="cart-items-container">
            {carrinho.length === 0 ? (
              <div className="cart-empty">
                <span className="cart-empty-icon">🛒</span>
                <p>Nenhum item adicionado.</p>
                <small>Aponte a câmera do celular para o código de barras para começar a compra.</small>
              </div>
            ) : (
              <div className="cart-items-list">
                {carrinho.map((item) => (
                  <div key={item.produto.id} className="cart-item">
                    <div className="cart-item-info">
                      <strong className="cart-item-nome">{item.produto.nome}</strong>
                      <span className="cart-item-preco-un">
                        R$ {Number(item.produto.preco_venda).toFixed(2)} un
                      </span>
                    </div>

                    <div className="cart-item-controls">
                      <button
                        onClick={() => alterarQuantidade(item.produto.id, -1)}
                        className="btn-qty"
                      >
                        -
                      </button>
                      <span className="cart-item-qty">{item.quantidade}</span>
                      <button
                        onClick={() => alterarQuantidade(item.produto.id, 1)}
                        className="btn-qty"
                      >
                        +
                      </button>
                    </div>

                    <div className="cart-item-subtotal">
                      R$ {item.subtotal.toFixed(2)}
                    </div>

                    <button
                      onClick={() => removerDoCarrinho(item.produto.id)}
                      className="btn-remove"
                      title="Remover produto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo e Botão de Finalização */}
          <div className="cart-footer">
            <div className="cart-totals">
              <div className="totals-row">
                <span>Quantidade de Itens:</span>
                <strong>{totalItensQtd} un</strong>
              </div>
              <div className="totals-row total-highlight">
                <span>Total a Pagar:</span>
                <span className="total-amount">R$ {totalCarrinho.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={abrirModalPagamento}
              disabled={carrinho.length === 0}
              className="btn-checkout"
            >
              💵 Finalizar Venda (R$ {totalCarrinho.toFixed(2)})
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento */}
      {modalPagamentoAberto && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>💳 Pagamento & Fechamento</h3>
              <button
                className="btn-close-modal"
                onClick={() => setModalPagamentoAberto(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-total-display">
                <span>Total da Venda</span>
                <strong>R$ {totalCarrinho.toFixed(2)}</strong>
              </div>

              {/* Formas de Pagamento */}
              <label className="field-label">Forma de Pagamento:</label>
              <div className="payment-options">
                {(
                  [
                    { id: 'DINHEIRO', label: '💵 Dinheiro' },
                    { id: 'PIX', label: '📱 PIX' },
                    { id: 'CARTAO_CREDITO', label: '💳 Crédito' },
                    { id: 'CARTAO_DEBITO', label: '💳 Débito' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    className={`payment-btn ${formaPagamento === m.id ? 'active' : ''}`}
                    onClick={() => setFormaPagamento(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Se for dinheiro: cálculo de troco */}
              {formaPagamento === 'DINHEIRO' && (
                <div className="troco-section">
                  <label className="field-label">Valor Recebido (R$):</label>
                  <input
                    ref={valorPagoInputRef}
                    type="number"
                    step="0.01"
                    min={totalCarrinho}
                    value={valorPago}
                    onChange={(e) => setValorPago(e.target.value)}
                    className="modal-input"
                  />

                  {/* Botões rápidos de cédulas */}
                  <div className="quick-money-buttons">
                    {[10, 20, 50, 100].map((valor) => (
                      <button
                        key={valor}
                        type="button"
                        className="btn-quick-money"
                        onClick={() => setValorPago(valor.toFixed(2))}
                      >
                        R$ {valor}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn-quick-money"
                      onClick={() => setValorPago(totalCarrinho.toFixed(2))}
                    >
                      Exato
                    </button>
                  </div>

                  <div className="troco-box">
                    <span>Troco a Devolver:</span>
                    <strong className="troco-valor">
                      R$ {trocoCalculado.toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setModalPagamentoAberto(false)}
                disabled={processandoVenda}
              >
                Voltar
              </button>
              <button
                className="btn-primary"
                onClick={handleFinalizarVenda}
                disabled={processandoVenda}
              >
                {processandoVenda ? 'Gravando no Banco...' : 'Confirmar e Baixar Estoque'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Venda Concluída com Sucesso */}
      {vendaConcluida && (
        <div className="modal-overlay">
          <div className="modal-box modal-success">
            <div className="success-icon-badge">✓</div>
            <h2>Venda Realizada com Sucesso!</h2>
            <p className="success-code">Código: <strong>{vendaConcluida.codigo_venda}</strong></p>

            <div className="success-summary">
              <div className="summary-row">
                <span>Forma:</span>
                <strong>{vendaConcluida.forma_pagamento}</strong>
              </div>
              <div className="summary-row">
                <span>Total Pago:</span>
                <strong>R$ {Number(vendaConcluida.valor_pago).toFixed(2)}</strong>
              </div>
              {vendaConcluida.troco > 0 && (
                <div className="summary-row troco-highlight">
                  <span>Troco Entregue:</span>
                  <strong>R$ {Number(vendaConcluida.troco).toFixed(2)}</strong>
                </div>
              )}
            </div>

            <div className="modal-footer justify-center">
              <button
                className="btn-primary btn-large"
                onClick={() => setVendaConcluida(null)}
                autoFocus
              >
                Próximo Atendimento (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
