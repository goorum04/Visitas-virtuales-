import 'dotenv/config';
import bcrypt from 'bcrypt';
import { query } from '../src/lib/db.js';

async function seed() {
  console.log('Seeding database...');

  const hash = await bcrypt.hash('password123', 12);

  // Test users per vertical
  const users = [
    { email: 'realestate@test.com', vertical: 'real_estate', plan: 'pro' },
    { email: 'museum@test.com', vertical: 'museum', plan: 'starter' },
    { email: 'gamedev@test.com', vertical: 'gamedev', plan: 'pro' },
    { email: 'free@test.com', vertical: 'retail', plan: 'free' },
  ];

  for (const u of users) {
    await query(
      `INSERT INTO users (email, password_hash, vertical, plan)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [u.email, hash, u.vertical, u.plan]
    );
    console.log(`  ✓ ${u.email} (${u.vertical} / ${u.plan})`);
  }

  console.log('\nSeed complete. All passwords: password123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
