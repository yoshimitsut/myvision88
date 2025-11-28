const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar Routers - CORRIGIDO para usar a pasta 'routers' em todas as importações
const cakeRoutes = require('./routers/cakeRoutes');
const orderRoutes = require('./routers/orderRoutes');
const timeslotRoutes = require('./routers/timeslotRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Define as origens permitidas
const allowedOrigins = [
  'https://myvision88.com',     // Domínio principal do frontend
  'https://www.myvision88.com', // Variação com www do frontend
  'https://yoyaku.myvision88.com', // Variação com www do frontend
  'https://www.yoyaku.myvision88.com', // Variação com www do frontend
  // Se você tiver um ambiente de staging ou teste, adicione aqui
  'http://localhost:3000',      // Opcional: Para desenvolvimento local futuro
];

app.use(cors(corsOptions));

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem 'origin' (ex: Postman, requisições do mesmo servidor)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      // Origem permitida
      callback(null, true);
    } else {
      // Origem não permitida
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true, // Necessário se você usa cookies ou sessões
};

app.use('/image', express.static('image'))

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


// 🔹 USAR OS ROUTERS SEPARADOS
app.use('/api/cake', cakeRoutes);
app.use('/api/timeslots', timeslotRoutes);
// Rotas de pedido (reservar, orders/list)
app.use('/api/', orderRoutes); 


app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));