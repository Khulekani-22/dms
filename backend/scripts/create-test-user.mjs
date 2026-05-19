// ─── Create DMS test admin user ───────────────────────────────────────────────
// Usage: node scripts/create-test-user.mjs
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL        = 'https://qbjlkihexqyyajmjpzin.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiamxraWhleHF5eWFqbWpwemluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkxNDc2OSwiZXhwIjoyMDc5NDkwNzY5fQ.Ma99eMRulW9UJ49U8sEZe0vI2ih0j5DTR_ckg6MCdcA';

const TEST_EMAIL    = 'admin@dms.local';
const TEST_PASSWORD = 'DmsAdmin@2026!';
const FULL_NAME     = 'DMS Administrator';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('Creating test user...\n');

  // 1. Create the auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,          // skip email confirmation
    user_metadata: {
      full_name: FULL_NAME,
      role: 'admin',
    },
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      console.log('ℹ️  User already exists — credentials below are still valid.\n');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Auth user created:', data.user.id, '\n');

    // 2. Upsert into dms_profiles (trigger may have already done this)
    const { error: profileError } = await supabase
      .from('dms_profiles')
      .upsert({ id: data.user.id, full_name: FULL_NAME, role: 'admin' });

    if (profileError) {
      console.warn('⚠️  Profile upsert warning:', profileError.message);
    } else {
      console.log('✅ dms_profiles row created\n');
    }
  }

  console.log('─────────────────────────────────────');
  console.log('  LOCAL TEST CREDENTIALS');
  console.log('─────────────────────────────────────');
  console.log(`  Email    : ${TEST_EMAIL}`);
  console.log(`  Password : ${TEST_PASSWORD}`);
  console.log(`  URL      : http://localhost:5174`);
  console.log('─────────────────────────────────────\n');
}

main();
