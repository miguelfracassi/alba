Alba.page('explorar', async (main) => {
  const { $, esc, api, av, verified, debounce, postHTML, errText } = Alba;
  main.innerHTML = `<div class="top"><div class="pad" style="padding-bottom:10px"><form class="search" style="margin:0" id="f">${Alba.icon('search')}<input id="q" placeholder="Buscar pessoas, posts e #hashtags" autocomplete="off" aria-label="Buscar"></form></div></div><div id="res"></div>`;
  const q = $('#q'), res = $('#res');
  q.value = new URLSearchParams(location.search).get('q') || '';
  const person = (u, btn = '') => `<div class="row"><a href="/perfil/${esc(u.username)}">${av(u, 48)}</a><a class="info" href="/perfil/${esc(u.username)}"><b>${esc(u.name)}${u.verified ? verified : ''}</b><small>@${esc(u.username)}</small>${u.bio ? `<small>${esc(u.bio)}</small>` : ''}</a>${btn}</div>`;
  async function run() {
    const term = q.value.trim();
    history.replaceState(null, '', term ? '?q=' + encodeURIComponent(term) : location.pathname);
    try {
      if (!term) {
        const [{ users }, { tags }] = await Promise.all([api('suggestions'), api('trending')]);
        res.innerHTML = `<div class="section"><h2>Em alta na fé</h2>${tags.length ? tags.map((t) => `<a class="trend" href="?q=%23${encodeURIComponent(t.tag)}"><b>#${esc(t.tag)}</b><small>${t.n} posts nesta semana</small></a>`).join('') : '<p>As hashtags mais usadas aparecem aqui.</p>'}</div><h2 class="pad" style="font-size:18px;padding-bottom:6px">Pessoas para seguir</h2>` +
          (users.map((u) => person(u, `<button class="btn sm" data-follow="${esc(u.username)}">Seguir</button>`)).join('') || '<div class="empty">Ninguém novo por enquanto.</div>');
        return;
      }
      const { users, posts } = await api('search?q=' + encodeURIComponent(term));
      res.innerHTML = (users.length ? `<h2 class="pad" style="font-size:18px;padding-bottom:6px">Pessoas</h2>${users.map((u) => person(u)).join('')}` : '') +
        (posts.length ? `<h2 class="pad" style="font-size:18px;padding-bottom:6px">Posts</h2>${posts.map((p) => postHTML(p)).join('')}` : '') +
        (!users.length && !posts.length ? `<div class="empty"><b>Nenhum resultado</b>Tente outra palavra ou #hashtag.</div>` : '');
    } catch (e) { res.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; }
  }
  q.addEventListener('input', debounce(run, 300));
  $('#f').onsubmit = (e) => { e.preventDefault(); run(); };
  res.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-follow]'); if (!b) return;
    try { const { on } = await api(`users/${b.dataset.follow}/follow`, 'POST', {}); b.textContent = on ? 'Seguindo' : 'Seguir'; b.classList.toggle('ghost', on); } catch (er) { Alba.toast(errText(er)); }
  });
  run();
});
