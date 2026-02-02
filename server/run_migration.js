
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/habiio_db',
});

async function run() {
  try {
    await client.connect();
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'migration_unit_details.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration executed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
