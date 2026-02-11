const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar Routers - CORRIGIDO para usar a pasta 'routers' em todas as importações
const cakeRoutes = require('./routers/cakeRoutes');
const orderRoutes = require('./routers/orderRoutes');
const timeslotRoutes = require('./routers/timeslotRoutes');
const newsletterRoutes = require('./routers/newsletter.js');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

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
app.use("/api/newsletters", newsletterRoutes);


app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));