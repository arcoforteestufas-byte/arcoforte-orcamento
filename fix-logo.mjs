import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ejjhxtkhjloogdqktmnh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqamh4dGtoamxvb2dkcWt0bW5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTM0NTAxOSwiZXhwIjoyMTAwOTIxMDE5fQ.J2HwBPy8K65gnExbBsusEpnfuN1DyF2XDS10qo2SJFM'
)

async function clearLogo() {
  const { data, error } = await supabase
    .from('configuracoes')
    .update({ logo_url: null })
    .neq('id', '00000000-0000-0000-0000-000000000000')
  
  if (error) {
    console.error('Error clearing logo:', error)
  } else {
    console.log('Logo cleared successfully')
  }
}

clearLogo()
