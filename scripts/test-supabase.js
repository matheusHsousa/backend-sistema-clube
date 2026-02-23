// backend/scripts/test-supabase.js
// Usage:
// Locally (PowerShell):
// $env:SUPABASE_URL = '<your SUPABASE_URL>'
// $env:SUPABASE_SERVICE_ROLE_KEY = '<your SERVICE_ROLE_KEY>'
// node backend/scripts/test-supabase.js

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  try {
    console.log('Testing Supabase connection...');
    // simple read from `user` table used by the app
    const { data, error } = await supabase.from('user').select('id, firebaseUid, email').limit(1);
    if (error) {
      console.error('Supabase returned error:', error);
      process.exit(1);
    }
    console.log('Supabase query successful. Sample row(s):', data);
  } catch (err) {
    console.error('Unexpected error while testing Supabase:', err?.message || err);
    process.exit(1);
  }
})();
