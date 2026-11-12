import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  abaAtiva: 'pdv' | 'produtos' | 'historico';
  setAbaAtiva: (aba: 'pdv' | 'produtos' | 'historico') => void;
  itensCarrinhoQtd: number;
}

export const Navbar: React.FC<NavbarProps> = ({ abaAtiva, setAbaAtiva, itensCarrinhoQtd }) => {
  const navigate = useNavigate();

  return (
    <header className="navbar-container">
      <div className="navbar-brand">
        <span className="brand-icon">🏮</span>
        <div>
          <h1 className="brand-title">Seinenkai Baiten</h1>
          <span className="brand-subtitle"></span>
        </div>
      </div>

      <nav className="navbar-tabs">
        <button
          className={`tab-btn ${abaAtiva === 'pdv' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('pdv')}
        >
          <span className="tab-icon">🛒</span>
          <span>Caixa</span>
          {itensCarrinhoQtd > 0 && (
            <span className="badge-cart">{itensCarrinhoQtd}</span>
          )}
        </button>

        <button
          className={`tab-btn ${abaAtiva === 'produtos' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('produtos')}
        >
          <span className="tab-icon"></span>
          <span>Produtos & Estoque</span>
        </button>

        <button
          className={`tab-btn ${abaAtiva === 'historico' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('historico')}
        >
          <span className="tab-icon"></span>
          <span>Histórico & Fechamento</span>
        </button>

      </nav>
    </header>
  );
};

