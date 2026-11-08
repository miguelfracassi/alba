Alba.page('', async (main, me) => {
  const { $, esc, api, av, ago, icon, verified, confirmBox, toast, errText, postHTML } = Alba;
  if (!me.is_admin) { main.innerHTML = '<div class="top"><h1>Administração</h1></div><div class="empty"><b>Acesso restrito</b>Só administradores podem ver esta página.</div>'; return; }
  document.title = 'Administração · Alba';
  main.innerHTML = `<div class="top"><h1>Administração</h1><div class="tabs"><button class="on" data-t="stats">Resumo</button><button data-t="users">Usuários</button><button data-t="posts">Posts</button><button data-t="parishes">Paróquias</button></div></div><div id="v"></div>`;
  const v = $('#v');
  const tabs = {
    async stats() {
      const s = await api('admin/stats');
      const cells = [['Usuários', s.users], ['Novos hoje', s.users_today], ['Verificados', s.verified], ['Suspensos', s.banned], ['Posts', s.posts], ['Pedidos de oração', s.prayer_requests], ['Orações feitas', s.prayers], ['Comentários', s.comments], ['Paróquias', s.parishes], ['Mensagens', s.messages]];
      v.innerHTML = `<div class="stats">${cells.map(([l, n]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>`;
    },
    async users() {
      v.innerHTML = `<div class="pad" style="border-bottom:1px solid var(--line)"><form class="search" style="margin:0" id="sf">${icon('search')}<input id="uq" placeholder="Buscar por nome, @usuário ou e-mail" aria-label="Buscar usuário"></form></div><div id="ul"></div>`;
      let q = '', last = 0;
      const row = (u) => `<div class="row adm" data-id="${u.id}" data-u="${esc(u.username)}"><a href="/perfil/${esc(u.username)}">${av(u, 44)}</a>
        <div class="info"><b>${esc(u.name)}${u.verified ? verified : ''}${u.is_admin ? ' <span class="chip">Admin</span>' : ''}${u.banned_at ? ' <span class="chip red">Suspenso</span>' : ''}</b><small>@${esc(u.username)} · ${esc(u.email)}</small><small>${u.posts} posts · desde ${new Date(u.created_at).toLocaleDateString('pt-BR')}${u.banned_at && u.ban_reason ? ' · motivo: ' + esc(u.ban_reason) : ''}</small></div>
        <div class="adm-act"><button class="btn sm ${u.verified ? 'ghost' : ''}" data-a="verify" data-on="${u.verified ? '' : 1}">${u.verified ? 'Tirar selo' : 'Verificar'}</button>
        <button class="btn sm ghost" data-a="admin" data-on="${u.is_admin ? '' : 1}">${u.is_admin ? 'Tirar admin' : 'Tornar admin'}</button>
        <button class="btn sm ghost" data-a="ban" data-on="${u.banned_at ? '' : 1}">${u.banned_at ? 'Reativar' : 'Suspender'}</button>
        <button class="btn sm danger" data-a="del">Excluir</button></div></div>`;
      const load = async (reset) => {
        if (reset) { last = 0; $('#ul').innerHTML = ''; }
        const d = await api(`admin/users?q=${encodeURIComponent(q)}&before=${last || ''}`);
        $('#ul').querySelector('.more')?.remove();
        $('#ul').insertAdjacentHTML('beforeend', d.users.map(row).join('') || (reset ? '<div class="empty">Nenhum usuário encontrado.</div>' : ''));
        if (d.users.length) last = d.users[d.users.length - 1].id;
        if (d.more) { const b = Object.assign(document.createElement('button'), { className: 'more', textContent: 'Carregar mais' }); b.onclick = () => load(false); $('#ul').append(b); }
      };
      $('#sf').onsubmit = (e) => { e.preventDefault(); q = $('#uq').value.trim(); load(true); };
      $('#uq').addEventListener('input', Alba.debounce(() => { q = $('#uq').value.trim(); load(true); }, 350));
      $('#ul').onclick = async (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const r = b.closest('.adm'), id = r.dataset.id, who = '@' + r.dataset.u, on = !!b.dataset.on;
        try {
          if (b.dataset.a === 'verify') await api('admin/users/' + id, 'PATCH', { verified: on });
          else if (b.dataset.a === 'admin') { if (!(await confirmBox({ title: on ? `Tornar ${who} administrador?` : `Tirar admin de ${who}?`, text: on ? 'Essa pessoa poderá verificar, suspender e excluir contas e posts.' : '', ok: 'Confirmar' }))) return; await api('admin/users/' + id, 'PATCH', { is_admin: on }); }
          else if (b.dataset.a === 'ban') {
            let reason = '';
            if (on) { reason = await confirmBox({ title: `Suspender ${who}?`, text: 'A pessoa será desconectada e não poderá entrar. Informe o motivo (opcional).', ok: 'Suspender', danger: true, input: true, type: 'text', placeholder: 'Motivo' }); if (reason === null) return; }
            await api('admin/users/' + id, 'PATCH', { banned: on, reason: reason.trim() });
          } else if (b.dataset.a === 'del') {
            if (!(await confirmBox({ title: `Excluir ${who}?`, text: 'Apaga a conta, posts e mensagens de forma permanente.', ok: 'Excluir', danger: true }))) return;
            await api('admin/users/' + id, 'DELETE'); r.remove(); return toast('Conta excluída');
          }
          toast('Feito'); load(true);
        } catch (er) { toast(errText(er)); }
      };
      load(true);
    },
    async posts() {
      v.innerHTML = '<div id="pl"></div>'; let last = 0;
      const load = async (reset) => {
        if (reset) { last = 0; $('#pl').innerHTML = ''; }
        const d = await api('admin/posts?before=' + (last || ''));
        $('#pl').querySelector('.more')?.remove();
        $('#pl').insertAdjacentHTML('beforeend', d.posts.map((p) => `<div class="row adm" data-id="${p.id}" style="align-items:flex-start"><a href="/perfil/${esc(p.username)}">${av(p, 40)}</a><div class="info" style="white-space:normal"><b style="display:inline">${esc(p.name)}</b> <small style="display:inline">@${esc(p.username)} · ${ago(p.created_at)}${p.kind === 'prayer' ? ' · pedido de oração' : ''}</small><div style="white-space:pre-wrap;word-break:break-word;overflow:visible">${esc(p.body)}</div>${p.has_image ? `<a href="/api/post-image/${p.id}" target="_blank" rel="noopener" style="color:var(--navy);font-size:14px">ver imagem</a>` : ''}</div><div class="adm-act"><a class="btn sm ghost" href="/post/${p.id}">Abrir</a><button class="btn sm danger" data-a="delpost">Apagar</button></div></div>`).join('') || '<div class="empty">Nenhum post.</div>');
        if (d.posts.length) last = d.posts[d.posts.length - 1].id;
        if (d.more) { const b = Object.assign(document.createElement('button'), { className: 'more', textContent: 'Carregar mais' }); b.onclick = () => load(false); $('#pl').append(b); }
      };
      $('#pl').onclick = async (e) => {
        const b = e.target.closest('[data-a="delpost"]'); if (!b) return;
        if (!(await confirmBox({ title: 'Apagar este post?', text: 'Comentários e orações ligados a ele também somem.', ok: 'Apagar', danger: true }))) return;
        try { await api('admin/posts/' + b.closest('.adm').dataset.id, 'DELETE'); b.closest('.adm').remove(); toast('Post apagado'); } catch (er) { toast(errText(er)); }
      };
      load(true);
    },
    async parishes() {
      const { parishes } = await api('admin/parishes');
      v.innerHTML = parishes.map((p) => `<div class="row adm" data-id="${p.id}"><span class="tag" style="width:46px;height:46px">${icon('church')}</span><div class="info"><b>${esc(p.name)}</b><small>${esc(p.city || 'sem cidade')} · ${p.members} ${p.members === 1 ? 'membro' : 'membros'}</small></div><div class="adm-act"><button class="btn sm danger" data-a="delpar">Excluir</button></div></div>`).join('') || '<div class="empty">Nenhuma paróquia cadastrada.</div>';
      v.onclick = async (e) => {
        const b = e.target.closest('[data-a="delpar"]'); if (!b) return;
        if (!(await confirmBox({ title: 'Excluir paróquia?', text: 'Os membros ficam sem paróquia.', ok: 'Excluir', danger: true }))) return;
        try { await api('admin/parishes/' + b.closest('.adm').dataset.id, 'DELETE'); b.closest('.adm').remove(); toast('Paróquia excluída'); } catch (er) { toast(errText(er)); }
      };
    },
  };
  const go = (t) => { v.onclick = null; v.innerHTML = '<div class="empty">Carregando…</div>'; tabs[t]().catch((e) => { v.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; }); };
  main.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { main.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b)); go(b.dataset.t); }));
  go('stats');
});
