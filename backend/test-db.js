const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 10000
});

async function test() {
  try {
    console.log("🔄 A tentar ligar ao MySQL...");

    const conn = await pool.getConnection();

    console.log("✅ CONNECTED OK");
    conn.release();

    process.exit(0);

  } catch (err) {
    console.error("❌ FULL ERROR:");
    console.error(err);   // 👈 isto agora mostra TUDO
    process.exit(1);
  }
}

test();