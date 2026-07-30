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

async function createAdmin() {
  const email = 'brunobjd05@gmail.com';
  const password = '#Granuct80808';

  console.log(`Criando usuário ${email}...`);
  
  // 1. Criar o usuário Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true // Pula a verificação de e-mail
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
        console.log("Usuário já existe no Auth. Tentando pegar o ID...");
        // O usuário já existe, não precisamos recriar o auth, mas podemos precisar criar na tabela usuarios
    } else {
        console.error("Erro ao criar usuário auth:", authError.message);
        process.exit(1);
    }
  }

  // Pegar o ID do usuário
  let userId;
  if (authData?.user) {
    userId = authData.user.id;
  } else {
    // Busca o usuário existente
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
    
    // Atualiza a senha e confirma o email por segurança
    await supabase.auth.admin.updateUserById(userId, { password: password, email_confirm: true });
  }

  console.log(`ID do usuário: ${userId}`);

  // 2. Inserir o usuário na tabela 'usuarios' como admin
  const { error: dbError } = await supabase
    .from('usuarios')
    .upsert({
      id: userId,
      nome: 'Bruno (Mestre)',
      perfil: 'admin'
    });

  if (dbError) {
    console.error("Erro ao criar perfil na tabela 'usuarios':", dbError.message);
  } else {
    console.log("Usuário mestre criado com sucesso!");
  }
}

createAdmin();
