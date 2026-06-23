require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs    = require('fs');
const path  = require('path');
const mysql = require('mysql2/promise');

async function run() {
    const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    ssl: {
      rejectUnauthorized: false
    }
});

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('⏳ A executar migrations…');
  await conn.query(sql);
  console.log('✅ Migrations executadas com sucesso!');
  await conn.end();
}

run().catch(err => { console.error('❌ Erro nas migrations:', err); process.exit(1); });
