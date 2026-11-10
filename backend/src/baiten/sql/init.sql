-- Script de inicialização das tabelas do Seinenkai Baiten (PDV & Estoque)
-- Integrado ao MyVision88 mantendo tabelas com prefixo baiten_

CREATE TABLE IF NOT EXISTS baiten_produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_barras VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(120) NOT NULL,
    descricao VARCHAR(255) DEFAULT '',
    preco_venda DECIMAL(10, 2) NOT NULL,
    preco_custo DECIMAL(10, 2) DEFAULT 0.00,
    estoque_atual INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 5,
    categoria VARCHAR(60) DEFAULT 'Geral',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_codigo_barras (codigo_barras)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS baiten_vendas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_venda VARCHAR(36) NOT NULL UNIQUE,
    valor_total DECIMAL(10, 2) NOT NULL,
    valor_pago DECIMAL(10, 2) NOT NULL,
    troco DECIMAL(10, 2) DEFAULT 0.00,
    forma_pagamento ENUM('DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'OUTRO') NOT NULL,
    status ENUM('CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'CONCLUIDA',
    observacoes VARCHAR(255) DEFAULT '',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS baiten_itens_venda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venda_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (venda_id) REFERENCES baiten_vendas(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES baiten_produtos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS baiten_movimentacoes_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    tipo ENUM('ENTRADA', 'SAIDA_VENDA', 'AJUSTE_MANUAL', 'CANCELAMENTO_VENDA') NOT NULL,
    quantidade INT NOT NULL,
    venda_id INT NULL,
    motivo VARCHAR(255) DEFAULT '',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES baiten_produtos(id),
    FOREIGN KEY (venda_id) REFERENCES baiten_vendas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exemplos iniciais (produtos típicos de Baiten)
INSERT INTO baiten_produtos (codigo_barras, nome, descricao, preco_venda, preco_custo, estoque_atual, estoque_minimo, categoria)
VALUES 
    ('7894900010015', 'Coca-Cola Lata 350ml', 'Refrigerante Coca-Cola em lata', 6.00, 3.20, 50, 10, 'Bebidas'),
    ('7891991000858', 'Guaraná Antarctica Lata 350ml', 'Refrigerante Guaraná em lata', 6.00, 3.10, 45, 10, 'Bebidas'),
    ('7898080640018', 'Água Mineral sem Gás 500ml', 'Água mineral natural garrafa', 4.00, 1.50, 60, 15, 'Bebidas'),
    ('7891000244105', 'Pastel de Carne Especial', 'Pastel frito na hora sabor carne', 12.00, 4.50, 30, 5, 'Comidas'),
    ('7891000244112', 'Pastel de Queijo', 'Pastel frito na hora sabor queijo', 12.00, 4.20, 30, 5, 'Comidas'),
    ('7891000244129', 'Yakisoba Tradicional', 'Porção de Yakisoba tradicional', 25.00, 10.00, 25, 5, 'Comidas'),
    ('7891000244136', 'Gyoza Suíno (6 un)', 'Porção de 6 guiozas grelhados', 18.00, 7.00, 20, 5, 'Comidas'),
    ('7891000244143', 'Choux Cream de Baunilha', 'Sobremesa japonesa recheada com creme de baunilha', 10.00, 4.00, 20, 5, 'Sobremesas')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

