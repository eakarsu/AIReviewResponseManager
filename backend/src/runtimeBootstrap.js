const bcrypt = require('bcryptjs');
const pool = require('./config/database');

async function main() {
  if (process.env.MIGRATE_ON_START !== 'true') return;
  const email = process.env.PROVISION_ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('runtime admin credentials are required');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user', email_verified BOOLEAN DEFAULT FALSE,
      email_verification_token VARCHAR(255), password_reset_token VARCHAR(255),
      password_reset_expires TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS token_blacklist (
      id SERIAL PRIMARY KEY, token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY, feature VARCHAR(100), business_id INTEGER,
      input_summary TEXT, result_text TEXT, result_json JSONB,
      model_used VARCHAR(255), tokens_used INTEGER, user_id INTEGER,
      endpoint VARCHAR(120), input_data JSONB, result TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (email,password,name,role,email_verified)
     VALUES ($1,$2,$3,'admin',TRUE)
     ON CONFLICT (email) DO UPDATE SET password=EXCLUDED.password,name=EXCLUDED.name,role='admin',email_verified=TRUE,updated_at=NOW()`,
    [email.toLowerCase(), hash, process.env.PROVISION_ADMIN_NAME || 'Runtime Admin']
  );
  await pool.end();
}

main().catch((error) => {
  console.error('Runtime bootstrap failed:', error.message);
  process.exit(1);
});
