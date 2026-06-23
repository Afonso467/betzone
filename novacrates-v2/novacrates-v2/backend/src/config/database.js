const mysql = require('mysql2/promise');

// Pool de conexões reutilizáveis para melhor performance
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'novacrates',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  // O Aiven (e a maioria dos serviços de MySQL na cloud) exige SSL.
  // Define DB_SSL=true no .env de produção para ativar.
  // rejectUnauthorized:false porque o Aiven usa um certificado próprio
  // que normalmente não está na lista de CAs confiáveis do Node por defeito.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

// Testar conexão ao iniciar
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL conectado com sucesso');
    conn.release();
  } catch (err) {
    console.error('❌ Erro ao conectar ao MySQL:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
