import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ejjhxtkhjloogdqktmnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqamh4dGtoamxvb2dkcWt0bW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDUwMTksImV4cCI6MjEwMDkyMTAxOX0.IuDyG_xmnArj4jjk46efD2kMWmgkH1F5pRKVC9Valj8'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSettings() {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('nome_empresa, cor_primaria, estilo_pdf')
    .limit(1)
    .single()
  
  if (error) {
    console.error('Error fetching settings:', error)
  } else {
    console.log('Current settings in DB:', data)
  }
}

checkSettings()
