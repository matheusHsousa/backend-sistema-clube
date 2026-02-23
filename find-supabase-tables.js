const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const candidates = [
  'user',
  'users',
  'User',
  'UserProfile',
  'profile',
  'profiles',
  'desbravador',
  'desbravadores',
  'desbravadorRequisito',
  'classe',
  'classeEntity',
];

(async () => {
  for (const name of candidates) {
    try {
      process.stdout.write(`Testing table: ${name} ... `);
      const { data, error } = await supabase.from(name).select('id').limit(1).maybeSingle();
      if (error) {
        console.log('ERROR:', error.message || JSON.stringify(error));
      } else if (data === null || data === undefined) {
        console.log('OK (no rows)');
      } else {
        console.log('OK (returned row)');
      }
    } catch (err) {
      console.log('EXCEPTION:', err.message || err);
    }
  }
})();
