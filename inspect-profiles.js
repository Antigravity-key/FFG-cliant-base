const { Client } = require('pg');

const config = {
  host: 'aws-1-ap-south-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.bfmyewnonnasauisqsqn',
  password: 'Taka0130!!!!',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
};

async function inspectProfiles() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log('--- Inspecting all rows in public.profiles ---');
    const res = await client.query('SELECT id, email, role, created_at FROM public.profiles ORDER BY email, created_at DESC;');
    res.rows.forEach(row => {
      console.log(`Email: ${row.email} | Role: ${row.role} | ID: ${row.id} | Created: ${row.created_at}`);
    });
  } catch (error) {
    console.error('Failed to query profiles:', error.message);
  } finally {
    await client.end();
  }
}

inspectProfiles();
