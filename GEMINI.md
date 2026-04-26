# 📄 MyVision88 - Documentação do Projeto

Este documento resume os principais recursos, tecnologias e regras de negócio do projeto **MyVision88**, uma plataforma de e-commerce e gerenciamento para lojas de bolos (Cakes) e doces japoneses (Okashi).

---

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 19**: Framework principal para a interface.
- **Vite 7**: Build tool e ambiente de desenvolvimento ultra-rápido.
- **TypeScript**: Tipagem estática em todo o projeto.
- **React Router DOM 7**: Gerenciamento de rotas e navegação.
- **CSS Vanilla**: Estilização sob medida sem frameworks de utilitários (Tailwind/Bootstrap).
- **Stripe & Square**: Integração de pagamentos online.
- **HTML5-QRCode**: Leitura de QR Codes para check-in de pedidos.
- **ExcelJS**: Geração de relatórios e exportação de dados.

### Backend
- **Node.js + Express**: Servidor robusto e escalável.
- **MySQL (mysql2)**: Banco de dados relacional.
- **Zod**: Validação de esquemas e dados.
- **Multer**: Processamento de upload de imagens.
- **Resend & Nodemailer**: Envio de e-mails transacionais e newsletters.

---

## 🎨 Design System

O projeto utiliza uma estética moderna e limpa, focada na experiência do usuário (UX) e facilidade de administração.

- **Cores Principais**:
    - `Amarelo (#fdd111)`: Usado em botões de ação principal (Submit).
    - `Azul (#007bff)`: Usado para navegação e destaques.
    - `Verde (#28a745)`: Ações de edição e sucesso.
    - `Vermelho (#dc3545)`: Exclusão e erros.
- **Componentização**:
    - Arquitetura baseada em componentes reutilizáveis (ex: `CakeForm`).
    - Hooks customizados para isolar lógica de negócio (`useCakeManagement`).
    - CSS encapsulado por componente/página.
- **UX**:
    - Feedback visual de carregamento (`loading`) e erros.
    - Previews de imagem em tempo real no upload.
    - Design responsivo para dispositivos móveis e desktop.

---

## 📑 Páginas do Sistema

### Público (Cliente)
- **Home (Hero)**: Apresentação da loja e destaques.
- **Pedido (OrderCake)**: Catálogo de produtos e fluxo de compra.
- **Informações do Produto**: Detalhes sobre ingredientes e tamanhos.
- **Newsletter**: Captura de e-mails para marketing.
- **Check (Order Check)**: Consulta de status de pedidos e retirada.

### Administrativo (Gestão)
- **Store Login**: Acesso restrito para administradores.
- **Cake/Okashi Management**: CRUD completo de produtos, tamanhos, preços e estoque.
- **List Order**: Gerenciamento de pedidos recebidos com filtros e exportação.
- **Sales Order**: Visão rápida de vendas e pedidos.
- **TimeSlot Management**: Configuração de horários disponíveis para retirada/entrega.
- **Store Settings**: Configurações gerais da loja, e-mails e integrações.
- **Newsletter Management**: Gestão de inscritos e criação de campanhas.

---

## ⚖️ Regras de Negócio

1. **Gestão de Produtos**:
    - Um produto (Bolo/Okashi) pode ter múltiplos tamanhos associados.
    - O controle de estoque é feito individualmente por tamanho.
    - Produtos inativos não aparecem na visualização do cliente.
2. **Ativação de Produtos**:
    - Para que um bolo esteja ativo, ele deve ter pelo menos um tamanho/opção também ativo.
3. **Imagens**:
    - Suporte para JPG, PNG e GIF.
    - Limite de tamanho de 5MB por upload.
4. **Pedidos e Horários**:
    - Pedidos são vinculados a slots de tempo (`TimeSlots`).
    - Cada slot possui um limite de capacidade para evitar sobrecarga na produção/retirada.
5. **Status de Pedido**:
    - O sistema rastreia o ciclo de vida do pedido: `Aguardando`, `Reservado`, `Pago`, `Entregue`, `Cancelado`.
6. **Segurança**:
    - Rotas administrativas são protegidas por um componente de alta ordem (`ProtectedRoute`).
    - Validação rigorosa de dados tanto no frontend (TS/Zod) quanto no backend.
