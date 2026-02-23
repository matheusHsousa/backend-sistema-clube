const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  try {
    const { data, error } = await supabase.from('User').select('id,email').limit(1).maybeSingle();
    if (error) {
      console.error('Supabase error:', error);
      process.exit(2);
    }
    console.log('Supabase OK, sample row:', data);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(3);
  }
})();
