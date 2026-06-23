require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const { testConnection } = require('./config/database');
const gameRoutes         = require('./routes/games');
const skinRoutes         = require('./routes/skins');
const giveawayRoutes     = require('./routes/giveaways');
const leaderboardRoutes  = require('./routes/leaderboard');
const storeRoutes        = require('./routes/store');
const sportsRoutes       = require('./routes/sports');
const betsRoutes         = require('./routes/bets');
const adminRoutes        = require('./routes/admin');
const { errorHandler }   = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3001;

// CORS_ORIGIN pode ser uma única URL ou várias separadas por vírgula
// (ex: "http://localhost:5173,https://teu-user.github.io")
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
}));
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Rate limit global
app.use(rateLimit({ windowMs: 60 * 1000, max: 300,
  message: { error: 'Demasiados pedidos, aguarda um momento.' } }));

// Rotas
app.use('/api/games',       gameRoutes);
app.use('/api/skins',       skinRoutes);
app.use('/api/giveaways',   giveawayRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/store',       storeRoutes);
app.use('/api/sports',      sportsRoutes);
app.use('/api/bets',        betsRoutes);
app.use('/api/admin',       adminRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));
app.use((_, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use(errorHandler);

async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 NovaCrates API → http://localhost:${PORT}`);
  });
}
start();
