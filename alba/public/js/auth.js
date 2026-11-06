(() => {
  const f = document.getElementById('f'), m = document.getElementById('m'), signup = location.pathname === '/signup';
  const E = { invalid_email: 'E-mail inválido.', invalid_username: 'Usuário: 3 a 20 letras minúsculas, números, _ ou ponto.', invalid_name: 'Informe seu nome.', weak_password: 'A senha precisa ter de 8 a 100 caracteres.', username_taken: 'Esse nome de usuário já está em uso.', email_taken: 'Esse e-mail já está cadastrado.', invalid_credentials: 'Usuário/e-mail ou senha incorretos.', too_many_attempts: 'Muitas tentativas. Aguarde alguns minutos.', config_db: 'Servidor sem DATABASE_URL configurada.', config_jwt: 'Servidor sem JWT_SECRET configurada.' };
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); m.className = 'msg'; const b = f.querySelector('button'); b.disabled = true;
    try {
      const r = await fetch('/api/auth/' + (signup ? 'signup' : 'login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(Object.fromEntries(new FormData(f))) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw d;
      const next = new URLSearchParams(location.search).get('next');
      location.href = next && /^\/[a-z]/.test(next) ? next : '/home';
    } catch (err) { m.className = 'msg err'; m.textContent = E[err && err.error] || 'Algo deu errado. Tente de novo.'; b.disabled = false; }
  });
})();
