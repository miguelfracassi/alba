Alba.page('perfil', async (main, me) => {
  const { $, esc, api, av, icon, verified, feed, toast, errText } = Alba;
  const seg = location.pathname.split('/')[2];
  const uname = seg ? decodeURIComponent(seg) : me.username;
  let u;
  try { u = (await api('users/' + encodeURIComponent(uname))).user; }
  catch { main.innerHTML = '<div class="top"><h1>Perfil</h1></div><div class="empty"><b>Perfil não encontrado</b>Esse usuário não existe.</div>'; return; }
  document.title = `${u.name} (@${u.username}) · Alba`;
  const joined = new Date(u.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  main.innerHTML = `<div class="top"><div class="head-row"><a class="back" href="/home" aria-label="Voltar">${icon('back')}</a><div><b>${esc(u.name)}</b><br><small style="color:var(--muted)"><span id="np">${u.posts}</span> posts</small></div></div></div>
    <div class="cover"></div><div class="profile"><div class="top-row">${av(u, 104)}<div id="btns" style="display:flex;gap:8px"></div></div>
    <h2>${esc(u.name)}${u.verified ? verified : ''}</h2><div class="at">@${esc(u.username)}</div>${u.bio ? `<p>${esc(u.bio)}</p>` : ''}
    <div class="meta">${u.parish_name ? `<span>${icon('church').replace('class="ico "', 'class="ico" style="width:16px;height:16px;vertical-align:-3px"')} ${esc(u.parish_name)}</span>` : ''}<span>Entrou em ${esc(joined)}</span>${u.streak > 0 ? `<span class="streak">${icon('candle').replace('class="ico "', 'class="ico" style="width:16px;height:16px;vertical-align:-3px"')} Terço: ${u.streak} ${u.streak === 1 ? 'dia' : 'dias'} seguidos</span>` : ''}</div>
    <div class="meta"><span><b id="nf">${u.followers}</b> seguidores</span><span><b>${u.following}</b> seguindo</span></div></div>
    <div class="tabs" style="border-bottom:1px solid var(--line)"><button class="on" data-t="posts">Posts</button><button data-t="prayers">Orações</button><button data-t="reposts">Republicados</button><button data-t="likes">Curtidas</button></div><div id="list"></div>`;
  const btns = $('#btns');
  if (u.mine) btns.innerHTML = '<a class="btn ghost sm" href="/configuracoes">Editar perfil</a>';
  else {
    btns.innerHTML = `<a class="btn ghost sm" href="/mensagens/${esc(u.username)}" aria-label="Enviar mensagem">${icon('mail').replace('class="ico "', 'class="ico" style="width:18px;height:18px"')}</a><button class="btn sm${u.i_follow ? ' ghost' : ''}" id="fol">${u.i_follow ? 'Seguindo' : 'Seguir'}</button>`;
    $('#fol').onclick = async (e) => {
      try { const { on } = await api(`users/${u.username}/follow`, 'POST', {}); e.target.textContent = on ? 'Seguindo' : 'Seguir'; e.target.classList.toggle('ghost', on); $('#nf').textContent = +$('#nf').textContent + (on ? 1 : -1); } catch (er) { toast(errText(er)); }
    };
  }
  const E = { posts: 'Nenhum post ainda', prayers: 'Nenhum pedido de oração', reposts: 'Nada republicado', likes: 'Nenhuma curtida' };
  const start = (t) => feed($('#list'), (b) => api(`users/${u.username}/posts?tab=${t}&before=${b || ''}`), { title: E[t] });
  main.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { main.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b)); start(b.dataset.t); }));
  start('posts');
});
