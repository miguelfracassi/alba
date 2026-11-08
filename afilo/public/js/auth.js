(() => {
  const f = document.getElementById('f'), m = document.getElementById('m'), signup = location.pathname === '/signup';
  const E = { invalid_email: 'E-mail inválido.', invalid_username: 'Usuário: 3 a 20 letras minúsculas, números, _ ou ponto.', invalid_name: 'Informe seu nome.', weak_password: 'A senha precisa ter de 8 a 100 caracteres.', username_taken: 'Esse nome de usuário já está em uso.', email_taken: 'Esse e-mail já está cadastrado.', invalid_credentials: 'Usuário/e-mail ou senha incorretos.', banned: 'Esta conta foi suspensa.', too_many_attempts: 'Muitas tentativas. Aguarde alguns minutos.', config_db: 'Servidor sem DATABASE_URL configurada.', db_auth: 'A senha do banco na DATABASE_URL está incorreta.', db_tenant: 'O usuário do banco na DATABASE_URL está inválido. Copie a URL do Supabase de novo.', db_unreachable: 'Não consegui conectar ao banco. No Supabase, use a URL do Transaction pooler (porta 6543).', db_ssl: 'Falha de segurança (SSL) ao conectar no banco. Veja os logs na Vercel.', db_other: 'Erro ao falar com o banco. Veja os logs na Vercel.', server_error: 'Erro no servidor. Abra /api/health/db para ver o diagnóstico.', config_jwt: 'Servidor sem JWT_SECRET configurada.' };
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); m.className = 'msg'; const b = f.querySelector('button'); b.disabled = true;
    try {
      const r = await fetch('/api/auth/' + (signup ? 'signup' : 'login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(Object.fromEntries(new FormData(f))) });
      const d = await r.json().catch(() => null);
      if (!d) throw { error: 'no_api', status: r.status };
      if (!r.ok) throw d;
      const next = new URLSearchParams(location.search).get('next');
      location.href = next && /^\/[a-z]/.test(next) ? next : '/home';
    } catch (err) { m.className = 'msg err'; m.textContent = err && err.error === 'no_api' ? `O servidor da API não respondeu (HTTP ${err.status}). Confira se a pasta raiz (Root Directory) do projeto na Vercel está correta.` : E[err && err.error] || 'Algo deu errado. Tente de novo.'; b.disabled = false; }
  });
})();
