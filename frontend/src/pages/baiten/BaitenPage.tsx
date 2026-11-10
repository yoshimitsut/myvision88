import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { PDVTab } from './components/PDVTab';
import { ProdutosTab } from './components/ProdutosTab';
import { HistoricoTab } from './components/HistoricoTab';
import type { ItemCarrinho } from './types';
import './Baiten.css';

export const BaitenPage: React.FC = () => {
  const [abaAtiva, setAbaAtiva] = useState<'pdv' | 'produtos' | 'historico'>('pdv');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);

  const totalItensNoCarrinho = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <div className="baiten-page">
      <Navbar
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        itensCarrinhoQtd={totalItensNoCarrinho}
      />

      <main className="main-content">
        {abaAtiva === 'pdv' && (
          <PDVTab carrinho={carrinho} setCarrinho={setCarrinho} />
        )}
        {abaAtiva === 'produtos' && <ProdutosTab />}
        {abaAtiva === 'historico' && <HistoricoTab />}
      </main>
    </div>
  );
};

export default BaitenPage;

