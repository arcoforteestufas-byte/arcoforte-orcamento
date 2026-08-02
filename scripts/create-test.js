const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTest() {
  const email = 'teste@arcoforte.com';
  const password = 'arcoteste';

  console.log(`Criando usuário ${email}...`);
  
  // 1. Criar o usuário Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
        console.log("Usuário já existe no Auth. Tentando pegar o ID...");
    } else {
        console.error("Erro ao criar usuário auth:", authError.message);
        process.exit(1);
    }
  }

  let userId;
  if (authData?.user) {
    userId = authData.user.id;
  } else {
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
        console.error("Erro ao listar usuários:", usersError.message);
        process.exit(1);
    }
    const user = usersData.users.find(u => u.email === email);
    if (!user) {
        console.error("Não foi possível encontrar o usuário.");
        process.exit(1);
    }
    userId = user.id;
    
    await supabase.auth.admin.updateUserById(userId, { password: password, email_confirm: true });
  }

  console.log(`ID do usuário: ${userId}`);

  // 2. Inserir o usuário na tabela 'usuarios'
  const { error: dbError } = await supabase
    .from('usuarios')
    .upsert({
      id: userId,
      nome: 'Vendedor Teste',
      perfil: 'vendedor'
    });

  if (dbError) {
    console.error("Erro ao criar perfil na tabela 'usuarios':", dbError.message);
  } else {
    console.log("Usuário teste criado com sucesso!");
  }
}

createTest();
