const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/agro_app' });
pool.query('DELETE FROM notifications').then(() => {
  console.log('Notifications cleared');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
