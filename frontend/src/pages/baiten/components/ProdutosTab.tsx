import React, { useState, useEffect, useRef } from 'react';
import type { Produto } from '../types';
import { getProdutos, salvarProduto, deletarProduto } from '../services/api';

export const ProdutosTab: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Modal de Cadastro/Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Partial<Produto> | null>(null);
  const [salvando, setSalvando] = useState(false);

  const barcodeInputModalRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await getProdutos(
        busca || undefined,
        categoriaFiltro === 'Todas' ? undefined : categoriaFiltro
      );
      setProdutos(data);
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar lista de produtos');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [categoriaFiltro]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    carregar();
  };

  const abrirModalNovo = () => {
    setProdutoEditando({
      codigo_barras: '',
      nome: '',
      descricao: '',
      preco_venda: 0,
      preco_custo: 0,
      estoque_atual: 10,
      estoque_minimo: 5,
      categoria: 'Geral',
    });
    setModalAberto(true);
    setTimeout(() => barcodeInputModalRef.current?.focus(), 150);
  };

  const abrirModalEditar = (prod: Produto) => {
    setProdutoEditando({ ...prod });
    setModalAberto(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoEditando) return;

    if (!produtoEditando.codigo_barras || !produtoEditando.nome || !produtoEditando.preco_venda) {
      alert('Preencha os campos obrigatórios: Código de Barras, Nome e Preço de Venda.');
      return;
    }

    setSalvando(true);
    try {
      await salvarProduto(produtoEditando);
      setModalAberto(false);
      setProdutoEditando(null);
      carregar();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id: number, nome: string) => {
    if (confirm(`Tem certeza que deseja desativar o produto "${nome}"?`)) {
      try {
        await deletarProduto(id);
        carregar();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleAjusteRapidoEstoque = async (prod: Produto, delta: number) => {
    try {
      const novoEstoque = Math.max(0, prod.estoque_atual + delta);
      await salvarProduto({
        id: prod.id,
        estoque_atual: novoEstoque,
      });
      setProdutos((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, estoque_atual: novoEstoque } : p))
      );
    } catch (err: any) {
      alert(`Falha ao ajustar estoque: ${err.message}`);
    }
  };

  const categorias = ['Todas', ...Array.from(new Set(produtos.map((p) => p.categoria)))];

  return (
    <div className="produtos-container">
      <div className="produtos-header">
        <div>
          <h2>📦 Gestão de Produtos & Estoque</h2>
          <p className="subtitle">Cadastre novos itens, leia códigos de barras e monitore os níveis de estoque.</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNovo}>
          ➕ Cadastrar Novo Produto
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="filtros-bar">
        <form onSubmit={handleBuscar} className="busca-form">
          <input
            type="text"
            placeholder="Buscar por nome ou código de barras..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input-busca"
          />
          <button type="submit" className="btn-secondary">
            🔍 Buscar
          </button>
        </form>

        <div className="categorias-select-wrapper">
          <label>Categoria:</label>
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="select-categoria"
          >
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && <div className="status-banner erro">{erro}</div>}

      {/* Tabela de Produtos */}
      <div className="tabela-card">
        <table className="tabela-produtos">
          <thead>
            <tr>
              <th>Código de Barras</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Preço Venda</th>
              <th>Estoque Atual</th>
              <th>Status</th>
              <th>Ajuste Rápido</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  {carregando ? 'Carregando produtos...' : 'Nenhum produto cadastrado ou encontrado.'}
                </td>
              </tr>
            ) : (
              produtos.map((prod) => {
                const esgotado = prod.estoque_atual <= 0;
                const baixo = prod.estoque_atual <= prod.estoque_minimo && !esgotado;

                return (
                  <tr key={prod.id}>
                    <td>
                      <span className="barcode-badge">
                        ||| {prod.codigo_barras}
                      </span>
                    </td>
                    <td>
                      <strong>{prod.nome}</strong>
                      {prod.descricao && <small className="desc-text">{prod.descricao}</small>}
                    </td>
                    <td>
                      <span className="tag-categoria">{prod.categoria}</span>
                    </td>
                    <td>
                      <strong className="preco-text">
                        R$ {Number(prod.preco_venda).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span className={`estoque-pill ${esgotado ? 'esgotado' : baixo ? 'baixo' : 'ok'}`}>
                        {prod.estoque_atual} un
                      </span>
                    </td>
                    <td>
                      {esgotado ? (
                        <span className="status-label esgotado">Esgotado</span>
                      ) : baixo ? (
                        <span className="status-label baixo">Estoque Baixo</span>
                      ) : (
                        <span className="status-label normal">Normal</span>
                      )}
                    </td>
                    <td>
                      <div className="botoes-ajuste-estoque">
                        <button
                          className="btn-mini"
                          title="Adicionar 5 unidades"
                          onClick={() => handleAjusteRapidoEstoque(prod, 5)}
                        >
                          +5
                        </button>
                        <button
                          className="btn-mini"
                          title="Adicionar 10 unidades"
                          onClick={() => handleAjusteRapidoEstoque(prod, 10)}
                        >
                          +10
                        </button>
                      </div>
                    </td>
                    <td className="text-right">
                      <button
                        className="btn-action edit"
                        onClick={() => abrirModalEditar(prod)}
                        title="Editar produto"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-action delete"
                        onClick={() => handleDeletar(prod.id, prod.nome)}
                        title="Desativar produto"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Cadastro / Edição */}
      {modalAberto && produtoEditando && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{produtoEditando.id ? '✏️ Editar Produto' : '➕ Cadastrar Novo Produto'}</h3>
              <button className="btn-close-modal" onClick={() => setModalAberto(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvar} className="modal-body">
              <div className="form-group">
                <label className="field-label">Código de Barras (EAN-13 / Custom) *</label>
                <input
                  ref={barcodeInputModalRef}
                  type="text"
                  required
                  placeholder="Ex: 7891991000858"
                  value={produtoEditando.codigo_barras || ''}
                  onChange={(e) =>
                    setProdutoEditando({ ...produtoEditando, codigo_barras: e.target.value })
                  }
                  className="modal-input font-mono"
                />
              </div>

              <div className="form-group">
                <label className="field-label">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pastel de Carne Especial"
                  value={produtoEditando.nome || ''}
                  onChange={(e) =>
                    setProdutoEditando({ ...produtoEditando, nome: e.target.value })
                  }
                  className="modal-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="field-label">Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex: Comidas, Bebidas, Doces"
                    value={produtoEditando.categoria || ''}
                    onChange={(e) =>
                      setProdutoEditando({ ...produtoEditando, categoria: e.target.value })
                    }
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={produtoEditando.preco_venda || ''}
                    onChange={(e) =>
                      setProdutoEditando({
                        ...produtoEditando,
                        preco_venda: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="modal-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="field-label">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={produtoEditando.preco_custo || ''}
                    onChange={(e) =>
                      setProdutoEditando({
                        ...produtoEditando,
                        preco_custo: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Estoque Atual</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={produtoEditando.estoque_atual ?? ''}
                    onChange={(e) =>
                      setProdutoEditando({
                        ...produtoEditando,
                        estoque_atual: parseInt(e.target.value) || 0,
                      })
                    }
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5"
                    value={produtoEditando.estoque_minimo ?? ''}
                    onChange={(e) =>
                      setProdutoEditando({
                        ...produtoEditando,
                        estoque_minimo: parseInt(e.target.value) || 0,
                      })
                    }
                    className="modal-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

