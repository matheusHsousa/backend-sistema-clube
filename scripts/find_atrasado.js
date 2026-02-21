const { Client } = require('pg');

const config = {
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '1234',
  port: 5432,
};

(async () => {
  const c = new Client(config);
  await c.connect();
  const res = await c.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
  const dbs = res.rows.map(r => r.datname).filter(n => n !== 'postgres');
  console.log('Databases to check:', dbs.join(', '));
  for (const db of dbs) {
    const client = new Client({ ...config, database: db });
    await client.connect();
    try {
      const r = await client.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Atrasado');");
      if (r.rows[0].exists) {
        console.log('Table Atrasado exists in database:', db);
      }
    } catch (e) {
      // ignore
    } finally {
      await client.end();
    }
  }
  await c.end();
})();
