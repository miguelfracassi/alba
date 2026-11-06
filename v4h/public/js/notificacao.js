Alba.page('notificacao', async (main) => {
  const { esc, api, av, ago, icon, errText } = Alba;
  main.innerHTML = '<div class="top"><h1>Notificações</h1></div><div id="list"><div class="empty">Carregando…</div></div>';
  const T = { like: ['heart', 'curtiu seu post', 'like'], comment: ['comment', 'comentou no seu post'], repost: ['repeat', 'republicou seu post'], follow: ['user2', 'começou a seguir você'], pray: ['candle', 'está rezando pelo seu pedido'] };
  try {
    const { items } = await api('notifications');
    document.getElementById('list').innerHTML = items.length ? items.map((n) => {
      const [ic, txt, cls = ''] = T[n.type] || ['bell', 'interagiu com você'];
      const href = n.post_id ? `/post/${n.post_id}` : `/perfil/${esc(n.username)}`;
      return `<a class="row${n.unread ? ' unread' : ''}" href="${href}"><span class="tag ${cls}">${icon(ic)}</span>${av(n, 40)}<span class="info"><b>${esc(n.name)} <span style="font-weight:400">${txt}</span></b>${n.snippet ? `<small>${esc(n.snippet)}</small>` : ''}</span><span class="when">${ago(n.created_at)}</span></a>`;
    }).join('') : '<div class="empty"><b>Tudo em paz por aqui</b>Quando alguém curtir, comentar, seguir ou rezar por você, você vê aqui.</div>';
    if (items.some((n) => n.unread)) { await api('notifications/read', 'POST', {}); const p = document.querySelector('[data-pip="notificacao"]'); if (p) p.hidden = true; }
  } catch (e) { document.getElementById('list').innerHTML = `<div class="empty">${esc(errText(e))}</div>`; }
});
