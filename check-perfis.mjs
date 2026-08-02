import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ejjhxtkhjloogdqktmnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqamh4dGtoamxvb2dkcWt0bW5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTM0NTAxOSwiZXhwIjoyMTAwOTIxMDE5fQ.J2HwBPy8K65gnExbBsusEpnfuN1DyF2XDS10qo2SJFM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log("Checking perfis table...");
  const { data, error } = await supabase.from('perfis').select('*').limit(1);
  if (error) {
    console.error("Error/Table doesn't exist:", error);
    
    console.log("Attempting to create perfis table via RPC or SQL...");
    // Create via REST if possible, but actually we can just create it via SQL or suggest it to the user.
    // Wait, the best way to execute raw SQL in Supabase JS is via rpc or just using postgres driver if we had the connection string.
    // Without connection string, we can't easily execute DDL unless there's an RPC.
  } else {
    console.log("Perfis table exists:", data);
  }
}

check()
