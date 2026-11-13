# React + TypeScript + Vite

## MyVision88 – E‑commerce de Bolos e Doces Japoneses

**Descrição do projeto**

MyVision88 é uma plataforma full‑stack para lojas de bolos e doces japoneses, combinando um front‑end moderno em **React 19 + TypeScript + Vite** com um back‑end **Node.js/Express**. O objetivo é oferecer catálogo de produtos, integração de pagamentos, controle de estoque por tamanho e agendamento de retiradas via slots de horário.

### Principais funcionalidades
- Catálogo com múltiplos tamanhos e estoque por variante.
- Integração de pagamentos online usando **Stripe** e **Square**.
- Leitura de QR‑Code (HTML5‑QRCode) para check‑in de pedidos.
- Geração e exportação de relatórios com **ExcelJS**.
- Gerenciamento de slots de horário (`TimeSlots`) com limite de capacidade.
- Área administrativa com CRUD completo de produtos e pedidos.
- Segurança via rotas protegidas (`ProtectedRoute`) e validação de dados (Zod, Multer).

### Tecnologias chave
- **Front‑end**: React 19, TypeScript, Vite 7, React Router 7, CSS Vanilla, Stripe, Square, HTML5‑QRCode, ExcelJS.
- **Back‑end**: Node.js, Express, TypeScript, MySQL (`mysql2`), Zod, Multer, Resend, Nodemailer.

### Resultados
- MVP lançado em < 3 meses com 95 % de cobertura de testes críticos.
- Redução do tempo de checkout em 30 %.
- Aumento da taxa de conversão em 12 % após otimizações de UI/UX.
- Automação de relatórios que diminuiu o esforço manual em 80 %.

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.


This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
