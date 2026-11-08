Alba.page('mensagens', async (main, me) => {
  const { $, esc, api, av, ago, icon, verified, errText, toast } = Alba;
  const to = location.pathname.split('/')[2];
  if (!to) {
    main.innerHTML = `<div class="top"><h1>Mensagens</h1></div><form class="pad" id="nf" style="display:flex;gap:10px;border-bottom:1px solid var(--line)"><input class="input" name="u" placeholder="Iniciar conversa com @usuario" aria-label="Usuário" autocomplete="off"><button class="btn">Abrir</button></form><div id="list"><div class="empty">Carregando…</div></div>`;
    $('#nf').onsubmit = (e) => { e.preventDefault(); const v = e.target.u.value.trim().replace(/^@/, '').toLowerCase(); if (v) location.href = '/mensagens/' + encodeURIComponent(v); };
    try {
      const { items } = await api('conversations');
      $('#list').innerHTML = items.map((c) => `<a class="row${c.unread ? ' unread' : ''}" href="/mensagens/${esc(c.username)}">${av(c, 48)}<span class="info"><b>${esc(c.name)}${c.verified ? verified : ''}</b><small>${c.mine ? 'Você: ' : ''}${esc(c.body)}</small></span><span class="when">${ago(c.created_at)}</span></a>`).join('') || '<div class="empty"><b>Nenhuma conversa ainda</b>Abra o perfil de alguém e toque no envelope, ou digite um @usuário acima.</div>';
    } catch (e) { $('#list').innerHTML = `<div class="empty">${esc(errText(e))}</div>`; }
    return;
  }
  document.body.classList.add('in-chat');
  main.innerHTML = `<div class="top"><div class="head-row"><a class="back" href="/mensagens" aria-label="Voltar">${icon('back')}</a><div id="who"></div></div></div><div class="chat" style="height:calc(100vh - 62px)"><div class="log" id="log"></div><form id="f"><input class="input" name="m" placeholder="Escreva uma mensagem" autocomplete="off" maxlength="1000" aria-label="Mensagem"><button class="btn">Enviar</button></form></div>`;
  let after = 0, first = true;
  const log = $('#log');
  async function poll() {
    try {
      const d = await api(`messages/${encodeURIComponent(to)}?after=${after}`);
      if (first) { $('#who').innerHTML = `<a href="/perfil/${esc(d.user.username)}" style="display:flex;align-items:center;gap:10px">${av(d.user, 36)}<b>${esc(d.user.name)}</b></a>`; }
      if (d.items.length) {
        const bottom = first || log.scrollHeight - log.scrollTop - log.clientHeight < 80;
        log.insertAdjacentHTML('beforeend', d.items.map((m) => `<div class="bubble${m.mine ? ' mine' : ''}">${esc(m.body)}</div>`).join(''));
        after = d.items[d.items.length - 1].id; if (bottom) log.scrollTop = log.scrollHeight;
      } else if (first) log.innerHTML = '<div class="empty">Comece a conversa com um “Paz e bem”.</div>';
      first = false;
    } catch (e) { if (first) { log.innerHTML = `<div class="empty"><b>Conversa indisponível</b>${esc(errText(e))}</div>`; first = false; } }
  }
  $('#f').onsubmit = async (e) => {
    e.preventDefault(); const i = e.target.m, v = i.value.trim(); if (!v) return; i.value = '';
    try { if (!after) log.innerHTML = ''; await api('messages/' + encodeURIComponent(to), 'POST', { body: v }); await poll(); } catch (er) { toast(errText(er)); i.value = v; }
  };
  poll(); setInterval(() => { if (!document.hidden) poll(); }, 4000);
});
