const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const path = require('path');


// Manter o processo vivo
setInterval(() => {
  // Apenas para manter o event loop ocupado
}, 1000000);

// Importar Routers
const cakeRoutes = require('./routers/cakeRoutes');
const orderRoutes = require('./routers/orderRoutes');
const giftRoutes = require('./routers/giftRoutes');
const timeslotRoutes = require('./routers/timeslotRoutes');
const newsletterRoutes = require('./routers/newsletter');
const storeInfo = require('./routers/storeInfo');
const stripeRoutes = require('./routers/stripe');
const authRoutes = require('./routers/authRoutes');

// Middleware de Autenticação
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

// 🚀 Prevenção de queda do servidor
process.on('uncaughtException', (err) => {
  console.error('❌ ERRO CRÍTICO (Não capturado):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ REJEIÇÃO NÃO TRATADA em:', promise, 'razão:', reason);
});
const PORT = process.env.PORT || 3001;

// app.use(helmet({
//   crossOriginResourcePolicy: false, 
// }));

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, 
//   max: 100, 
//   message: 'Muitas requisições vindas deste IP, tente novamente mais tarde.'
// });
// app.use('/api/', limiter);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// app.use('/image', express.static('image'));
app.use('/image', express.static(path.join(__dirname, '../uploads')));

// Rota de Teste de Conexão (opcional, pode ser movida)
const pool = require('./config/db'); // Se quiser manter o teste de conexão aqui
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS `current_time`');
    res.json({ success: true, message: 'Conexão bem-sucedida!', data: rows });
  } catch (err) {
    console.error('Erro ao conectar ao MySQL:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔹 MIDDLEWARE DE PROTEÇÃO SELETIVA
// Define o que é público e o que precisa de Token
const selectiveAuth = (req, res, next) => {
  // Rotas Públicas
  // Verificamos a URL original para evitar problemas com rotas montadas
  const isPublicGet = req.method === 'GET' && (
    req.originalUrl.startsWith('/api/cake') ||
    req.originalUrl.startsWith('/api/gift') ||
    req.originalUrl.startsWith('/api/timeslots') ||
    req.originalUrl.startsWith('/api/storeinfo') ||
    req.originalUrl.startsWith('/api/newsletters')
  );

  const isPublicPost = req.method === 'POST' && (
    req.originalUrl === '/api/reservar' ||
    req.originalUrl.startsWith('/api/newsletters')
  );

  if (isPublicGet || isPublicPost) {
    return next();
  }

  // Todo o resto do painel administrativo precisa de Token
  console.log(`🔐 [PROTECTED] ${req.method} ${req.path}`);
  authMiddleware(req, res, next);
};

// 🔹 REGISTRO DE ROTAS
app.use("/api/auth", authRoutes);
app.use("/api", stripeRoutes);

// Aplicar roteadores com proteção seletiva e caminhos corretos
app.use('/api/cake', selectiveAuth, cakeRoutes);
app.use('/api/gift', selectiveAuth, giftRoutes);
app.use('/api/timeslots', selectiveAuth, timeslotRoutes);
app.use('/api/newsletters', selectiveAuth, newsletterRoutes);
app.use('/api/storeinfo', selectiveAuth, storeInfo);

// OrderRoutes é montado na raiz /api porque já contém /reservar e /list internamente
app.use('/api', selectiveAuth, orderRoutes);


app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));