Alba.page('', async (main, me) => {
  const { $, esc, api, av, compress, confirmBox, toast, errText } = Alba;
  main.innerHTML = `<div class="top"><h1>Conta e segurança</h1></div>
  <section class="section"><h2>Perfil</h2><p>Foto, nome e uma frase sobre você.</p>
    <div class="avatar-edit"><span id="av">${av(me, 84, true)}</span><div class="acts"><label class="btn ghost sm" tabindex="0">Trocar foto<input type="file" id="file" accept="image/*" class="sr"></label><button class="btn ghost sm" id="rmav">Remover</button></div></div>
    <form id="fp"><div class="msg"></div><label class="field"><span>Nome</span><input class="input" name="name" maxlength="50" required value="${esc(me.name)}"></label>
    <label class="field"><span>Bio</span><textarea class="input" name="bio" maxlength="160">${esc(me.bio)}</textarea><small>Seu usuário é @${esc(me.username)}.</small></label><button class="btn">Salvar perfil</button></form></section>
  <section class="section"><h2>E-mail</h2><p>Usado para entrar na sua conta.</p>
    <form id="fe"><div class="msg"></div><label class="field"><span>E-mail</span><input class="input" type="email" name="email" required value="${esc(me.email)}" autocomplete="email"></label>
    <label class="field"><span>Senha atual</span><input class="input" type="password" name="password" required autocomplete="current-password"></label><button class="btn">Alterar e-mail</button></form></section>
  <section class="section"><h2>Alterar senha</h2><p>Ao trocar a senha, os outros aparelhos são desconectados.</p>
    <form id="fw"><div class="msg"></div><label class="field"><span>Senha atual</span><input class="input" type="password" name="current" required autocomplete="current-password"></label>
    <label class="field"><span>Nova senha</span><input class="input" type="password" name="next" minlength="8" required autocomplete="new-password"><small>Mínimo de 8 caracteres.</small></label><button class="btn">Alterar senha</button></form></section>
  <section class="section"><h2>Aparelhos conectados</h2><p>Se perdeu um celular ou entrou em um computador emprestado, encerre as outras sessões. Esta continua ativa.</p><button class="btn ghost" id="lo">Sair dos outros aparelhos</button></section>
  <section class="section"><h2>Excluir conta</h2><p>Apaga seu perfil, posts, orações e mensagens de forma permanente.</p><button class="btn danger" id="del">Excluir minha conta</button></section>`;
  const show = (f, ok, t) => { const m = $('.msg', f); m.className = 'msg ' + (ok ? 'ok' : 'err'); m.textContent = t; };
  const form = (id, fn, okText, reset) => { $(id).onsubmit = async (e) => { e.preventDefault(); const f = e.target; try { await fn(Object.fromEntries(new FormData(f))); show(f, true, okText); if (reset) f.reset(); } catch (er) { show(f, false, errText(er)); } }; };
  form('#fp', (d) => api('me', 'PATCH', d), 'Perfil atualizado.');
  form('#fe', (d) => api('me/email', 'PATCH', d), 'E-mail alterado.', true);
  form('#fw', (d) => api('me/password', 'POST', d), 'Senha alterada. Os outros aparelhos foram desconectados.', true);
  $('#file').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const image = await compress(f, 320, 0.85); const { avatar_v } = await api('me/avatar', 'POST', { image }); $('#av').innerHTML = av({ ...me, avatar_v }, 84, true); toast('Foto atualizada'); } catch (er) { toast(errText(er)); }
  };
  $('#rmav').onclick = async () => { try { await api('me/avatar', 'DELETE', {}); $('#av').innerHTML = av({ ...me, avatar_v: 0 }, 84, true); toast('Foto removida'); } catch (er) { toast(errText(er)); } };
  $('#lo').onclick = async () => { if (await confirmBox({ title: 'Sair dos outros aparelhos?', ok: 'Sair' })) { await api('me/logout-all', 'POST', {}); toast('Outros aparelhos desconectados'); } };
  $('#del').onclick = async () => {
    const pw = await confirmBox({ title: 'Excluir conta?', text: 'Isso é permanente. Digite sua senha para confirmar.', ok: 'Excluir', danger: true, input: true });
    if (!pw) return;
    try { await api('me', 'DELETE', { password: pw }); location.href = '/'; } catch (er) { toast(errText(er)); }
  };
});
