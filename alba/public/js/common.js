/* Alba — código compartilhado: API, ícones, posts, estrutura do app (menu, coluna da direita). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ERR = {
    unauthorized: 'Entre na sua conta para continuar.', invalid_email: 'E-mail inválido.', invalid_username: 'Usuário: 3 a 20 letras minúsculas, números, _ ou ponto.',
    invalid_name: 'Nome muito curto.', weak_password: 'A senha precisa ter de 8 a 100 caracteres.', username_taken: 'Esse nome de usuário já está em uso.',
    email_taken: 'Esse e-mail já está cadastrado.', invalid_credentials: 'Usuário/e-mail ou senha incorretos.', too_many_attempts: 'Muitas tentativas. Aguarde alguns minutos.',
    wrong_password: 'Senha atual incorreta.', invalid_image: 'Imagem inválida ou muito grande.', empty: 'Escreva algo antes de enviar.',
    config_db: 'Servidor sem banco de dados configurado (DATABASE_URL).', config_jwt: 'Servidor sem JWT_SECRET configurada.', server_error: 'Algo deu errado. Tente de novo.',
  };
  const errText = (e) => ERR[e && e.code] || ERR.server_error;

  async function api(path, method = 'GET', body) {
    const r = await fetch('/api/' + path, {
      method, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401 && !/^auth\//.test(path) && document.body.dataset.app) location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search);
      throw Object.assign(new Error(data.error || 'error'), { code: data.error, status: r.status });
    }
    return data;
  }

  /* ---------- ícones ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    candle: '<path d="M12 2c1.3 1.7 2 2.9 2 4a2 2 0 0 1-4 0c0-1.1.7-2.3 2-4z"/><rect x="8" y="10" width="8" height="12" rx="1.6"/>',
    church: '<path d="M12 2v5M10 4h4"/><path d="m12 7 5 4v3H7v-3z"/><path d="M3 22v-8l4-1v9M21 22v-8l-4-1v9M10 22v-5h4v5M3 22h18"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    dots: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-9 9"/>',
    comment: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    user2: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M17 11h5M19.5 8.5v5"/>',
  };
  const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
  const verified = '<svg class="badge" viewBox="0 0 24 24" aria-label="Verificado"><path fill="currentColor" d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3-1-3 2.6-1.9 1-3 3.2.1z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="m8 12.2 2.7 2.7L16 9.6"/></svg>';

  /* ---------- utilidades ---------- */
  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const av = (u, size = 44, dark = false) =>
    `<span class="av${dark ? ' dark' : ''}" style="--s:${size}px"><i style="font-style:normal">${esc(initials(u.name))}</i>${Number(u.avatar_v) ? `<img src="/api/avatar/${encodeURIComponent(u.username)}?v=${u.avatar_v}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  const ago = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return 'agora';
    if (s < 3600) return Math.floor(s / 60) + ' min';
    if (s < 86400) return Math.floor(s / 3600) + ' h';
    if (s < 604800) return Math.floor(s / 86400) + ' d';
    return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  };
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' mi' : n >= 1e4 ? Math.round(n / 1e3) + ' mil' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.', ',') + ' mil' : String(n || ''));
  const linkify = (t) => esc(t).replace(/(^|\s)#([\p{L}\p{N}_]+)/gu, (m, a, tag) => `${a}<a href="/explorar?q=%23${encodeURIComponent(tag)}">#${tag}</a>`);
  const debounce = (fn, ms) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };

  function toast(msg) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = Object.assign(document.createElement('div'), { className: 'toast', textContent: msg, role: 'status' });
    document.body.append(t); setTimeout(() => t.remove(), 3200);
  }
  function confirmBox({ title, text = '', ok = 'Confirmar', danger = false, input = false }) {
    return new Promise((resolve) => {
      const m = document.createElement('div');
      m.className = 'modal';
      m.innerHTML = `<div class="box" role="dialog" aria-modal="true"><h3>${esc(title)}</h3><p>${esc(text)}</p>${input ? '<input class="input" type="password" placeholder="Sua senha" autocomplete="current-password">' : ''}<div class="btns"><button class="btn ghost sm" data-r="0">Cancelar</button><button class="btn sm${danger ? ' danger' : ''}" data-r="1">${esc(ok)}</button></div></div>`;
      const done = (v) => { m.remove(); resolve(v); };
      m.addEventListener('click', (e) => { if (e.target === m) done(null); const r = e.target.closest('[data-r]'); if (r) done(r.dataset.r === '1' ? (input ? $('input', m).value : true) : null); });
      document.body.append(m); const i = $('input', m); if (i) i.focus(); else $('[data-r="1"]', m).focus();
    });
  }

  // Reduz a foto no navegador antes de enviar (cabe bem no banco e carrega rápido).
  function compress(file, max, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(Object.assign(new Error('img'), { code: 'invalid_image' }));
      img.src = url;
    });
  }

  /* ---------- posts ---------- */
  function postHTML(p, { full = false } = {}) {
    const prayer = p.kind === 'prayer' ? `<div class="prayer-card"><span class="flame">${icon('candle')}</span><div><b>Pedido de oração</b><small data-pc>${prayCount(p.praying)}</small></div><button class="btn sm${p.i_pray ? ' on' : ''}" data-act="pray">${p.i_pray ? 'Rezando 🙏' : 'Rezar'}</button></div>` : '';
    return `<article class="post" data-id="${p.id}">
      <a href="/perfil/${esc(p.username)}" aria-label="Perfil de ${esc(p.name)}">${av(p, 44)}</a>
      <div class="col">
        <div class="head"><a href="/perfil/${esc(p.username)}"><b>${esc(p.name)}</b>${p.verified ? verified : ''}</a><span>@${esc(p.username)} · ${ago(p.created_at)}</span></div>
        ${p.mine ? `<button class="more-btn" data-act="delete" aria-label="Apagar post">${icon('trash')}</button>` : ''}
        <div class="body">${linkify(p.body)}</div>
        ${p.has_image ? `<a class="img" href="/api/post-image/${p.id}" target="_blank" rel="noopener"><img src="/api/post-image/${p.id}" alt="Imagem do post" loading="lazy"></a>` : ''}
        ${prayer}
        <div class="actions">
          <a class="act" href="/post/${p.id}" aria-label="Comentar">${icon('comment')}<span>${fmt(p.comments)}</span></a>
          <button class="act rep${p.reposted ? ' on' : ''}" data-act="repost" aria-label="Republicar">${icon('repeat')}<span>${fmt(p.reposts)}</span></button>
          <button class="act like${p.liked ? ' on' : ''}" data-act="like" aria-label="Curtir">${icon('heart')}<span>${fmt(p.likes)}</span></button>
          <button class="act save${p.saved ? ' on' : ''}" data-act="save" aria-label="Salvar">${icon('bookmark')}</button>
          <button class="act" data-act="share" aria-label="Compartilhar">${icon('share')}</button>
        </div>
      </div></article>`;
  }
  const prayCount = (n) => (n === 1 ? '1 pessoa está rezando' : `${n} pessoas estão rezando`);

  // Cliques em curtir/republicar/salvar/rezar/apagar/compartilhar de qualquer lista de posts.
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    const art = b && b.closest('.post');
    if (!art) return;
    const id = art.dataset.id, act = b.dataset.act;
    try {
      if (act === 'share') {
        const url = location.origin + '/post/' + id;
        if (navigator.share) await navigator.share({ title: 'Alba', url }).catch(() => {}); else { await navigator.clipboard.writeText(url); toast('Link copiado'); }
      } else if (act === 'delete') {
        if (!(await confirmBox({ title: 'Apagar este post?', text: 'Essa ação não pode ser desfeita.', ok: 'Apagar', danger: true }))) return;
        await api('posts/' + id, 'DELETE'); art.remove(); toast('Post apagado');
      } else {
        const { on } = await api(`posts/${id}/${act}`, 'POST', {});
        if (act === 'pray') {
          const small = $('[data-pc]', art), n = parseInt(small.textContent, 10) || 0, m = on ? n + 1 : Math.max(0, n - 1);
          small.textContent = prayCount(m); b.classList.toggle('on', on); b.textContent = on ? 'Rezando 🙏' : 'Rezar';
        } else {
          b.classList.toggle('on', on);
          const s = $('span', b); if (s) { const n = (parseInt(s.textContent.replace(/\D/g, ''), 10) || 0) + (on ? 1 : -1); s.textContent = fmt(Math.max(0, n)); }
          if (act === 'save') toast(on ? 'Salvo' : 'Removido dos salvos');
        }
      }
    } catch (err) { toast(errText(err)); }
  });

  // Lista paginada: loader(before) -> { posts, more }
  function feed(el, loader, empty = { title: 'Nada por aqui ainda', text: '' }) {
    let last = 0, busy = false;
    const more = document.createElement('button'); more.className = 'more'; more.textContent = 'Carregar mais';
    async function load(reset) {
      if (busy) return; busy = true;
      if (reset) { el.innerHTML = '<div class="empty">Carregando…</div>'; last = 0; }
      try {
        const d = await loader(last);
        if (reset) el.innerHTML = '';
        more.remove();
        if (d.empty) el.innerHTML = d.empty;
        else if (reset && !d.posts.length) el.innerHTML = `<div class="empty"><b>${esc(empty.title)}</b>${esc(empty.text)}</div>`;
        el.insertAdjacentHTML('beforeend', d.posts.map((p) => postHTML(p)).join(''));
        if (d.posts.length) last = d.posts[d.posts.length - 1].id;
        if (d.more) el.append(more);
      } catch (e) { el.innerHTML = `<div class="empty"><b>Não foi possível carregar</b>${esc(errText(e))}</div>`; }
      busy = false;
    }
    more.onclick = () => load(false);
    load(true);
    return { reload: () => load(true), prepend: (p) => { const e0 = $('.empty', el); if (e0) e0.remove(); el.insertAdjacentHTML('afterbegin', postHTML(p)); } };
  }

  // Compositor (post comum ou pedido de oração, com foto opcional).
  function composer(me, { onPost, prayerOnly = false } = {}) {
    const el = document.createElement('div');
    el.className = 'composer' + (prayerOnly ? ' prayer' : '');
    el.innerHTML = `${av(me, 44, true)}<div class="box"><div class="mode">${icon('candle')} Pedido de oração — outras pessoas poderão rezar por você.</div>
      <textarea rows="1" maxlength="500" placeholder="${prayerOnly ? 'Qual é a sua intenção de oração?' : 'O que você quer compartilhar hoje?'}" aria-label="Novo post"></textarea>
      <div class="preview" hidden></div>
      <div class="bar"><label class="tool" title="Foto" tabindex="0">${icon('image')}<input type="file" accept="image/*" class="sr"></label>
      ${prayerOnly ? '' : `<button type="button" class="tool" data-mode title="Pedido de oração" aria-label="Pedido de oração">${icon('candle')}</button>`}
      <span class="count"></span><button class="btn sm" disabled>${prayerOnly ? 'Pedir oração' : 'Postar'}</button></div></div>`;
    const ta = $('textarea', el), btn = $('.btn', el), cnt = $('.count', el), prev = $('.preview', el), file = $('input', el);
    let image = null, prayer = prayerOnly;
    const max = () => (prayer ? 500 : 280);
    const upd = () => {
      ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
      const left = max() - ta.value.length; cnt.textContent = left < 60 ? left : ''; cnt.classList.toggle('warn', left < 0);
      btn.disabled = !ta.value.trim() || left < 0;
    };
    ta.addEventListener('input', upd);
    const modeBtn = $('[data-mode]', el);
    if (modeBtn) modeBtn.onclick = () => { prayer = !prayer; el.classList.toggle('prayer', prayer); modeBtn.classList.toggle('on', prayer); ta.placeholder = prayer ? 'Qual é a sua intenção de oração?' : 'O que você quer compartilhar hoje?'; upd(); };
    file.onchange = async () => {
      if (!file.files[0]) return;
      try { image = await compress(file.files[0], 1280, 0.8); prev.innerHTML = `<img src="${image}" alt="Prévia"><button type="button" aria-label="Remover foto">×</button>`; prev.hidden = false; }
      catch (e) { toast(errText(e)); }
      file.value = '';
    };
    prev.onclick = (e) => { if (e.target.closest('button')) { image = null; prev.hidden = true; prev.innerHTML = ''; } };
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        const { post } = await api('posts', 'POST', { body: ta.value, image, kind: prayer ? 'prayer' : 'post' });
        ta.value = ''; image = null; prev.hidden = true; prev.innerHTML = ''; upd(); onPost && onPost(post);
        toast(prayer ? 'Pedido de oração publicado 🙏' : 'Publicado');
      } catch (e) { toast(errText(e)); upd(); }
    };
    upd();
    return el;
  }

  /* ---------- estrutura do app ---------- */
  const NAV = [
    ['home', '/home', 'home', 'Início'], ['explorar', '/explorar', 'search', 'Explorar'], ['notificacao', '/notificacao', 'bell', 'Notificações'],
    ['mensagens', '/mensagens', 'mail', 'Mensagens'], ['oracoes', '/oracoes', 'candle', 'Orações'], ['paroquias', '/paroquias', 'church', 'Paróquias'], ['perfil', '/perfil', 'user', 'Perfil'],
  ];
  const VERSES = [
    ['Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.', 'Mt 11,28'],
    ['Pedi, e vos será dado; buscai, e achareis; batei, e abrir-se-vos-á.', 'Mt 7,7'],
    ['Eu sou o caminho, a verdade e a vida.', 'Jo 14,6'],
    ['Amai-vos uns aos outros como eu vos amei.', 'Jo 13,34'],
    ['Não tenhais medo: eu estou convosco todos os dias, até o fim dos tempos.', 'Mt 28,20'],
    ['Onde dois ou três estiverem reunidos em meu nome, ali estou eu no meio deles.', 'Mt 18,20'],
    ['Eu sou a luz do mundo; quem me segue não andará nas trevas.', 'Jo 8,12'],
  ];

  function shell(active, me, counts) {
    const nav = NAV.map(([k, href, ic, label]) => {
      const n = k === 'notificacao' ? counts.notifications : k === 'mensagens' ? counts.messages : 0;
      return `<a href="${href}" class="${k === active ? 'on' : ''}"${k === active ? ' aria-current="page"' : ''}>${icon(ic)}<span class="lbl">${label}</span>${k === 'notificacao' || k === 'mensagens' ? `<span class="pip" data-pip="${k}"${n ? '' : ' hidden'}>${n > 99 ? '99+' : n}</span>` : ''}</a>`;
    }).join('');
    const v = VERSES[Math.floor(Date.now() / 864e5) % VERSES.length];
    const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    document.body.dataset.app = '1';
    $('#root').innerHTML = `<div class="app-wrap">
      <aside class="side"><a class="logo" href="/home" aria-label="Alba"><img src="/logo.png" alt="Alba"></a>
        <nav class="nav">${nav}<button data-more aria-haspopup="true">${icon('dots')}<span class="lbl">Mais</span></button></nav>
        <a class="btn post-btn" href="/home#novo">Postar</a>
        <button class="me-card" data-me>${av(me, 44, true)}<span class="who"><b>${esc(me.name)}</b><small>@${esc(me.username)}</small></span>${icon('dots')}</button>
      </aside>
      <main id="main"></main>
      <aside class="rail">
        <form class="search" action="/explorar" role="search">${icon('search')}<input name="q" placeholder="Buscar na comunidade" aria-label="Buscar na comunidade"></form>
        <section class="card"><h2>Palavra de hoje</h2><div class="litur"><div class="date">${esc(date)}</div><q>${esc(v[0])}</q><div class="ref">${v[1]} · <a href="https://www.vaticannews.va/pt/evangelho-do-dia.html" target="_blank" rel="noopener">Ler o Evangelho do dia</a></div></div></section>
        <section class="card" id="sug" hidden><h2>Quem seguir</h2></section>
        <section class="card" id="trend" hidden><h2>Em alta na fé</h2></section>
        <div class="foot"><a href="/configuracoes">Segurança</a> · Privacidade · Ajuda<br>© ${new Date().getFullYear()} Alba</div>
      </aside></div>`;
    const openMenu = (btn) => {
      document.querySelectorAll('.menu').forEach((m) => m.remove());
      const m = document.createElement('div'); m.className = 'menu';
      m.innerHTML = `<a href="/perfil">${icon('user')}Meu perfil</a><a href="/salvos">${icon('bookmark')}Salvos</a><a href="/configuracoes">${icon('lock')}Conta e segurança</a><button data-logout>${icon('out')}Sair de @${esc(me.username)}</button>`;
      btn.parentElement.style.position = 'relative'; btn.insertAdjacentElement('afterend', m);
      m.style.bottom = btn.matches('[data-me]') ? 'calc(100% + 6px)' : 'auto';
      if (!btn.matches('[data-me]')) { m.style.position = 'fixed'; const r = btn.getBoundingClientRect(); m.style.left = Math.max(8, Math.min(r.left, innerWidth - 256)) + 'px'; m.style.bottom = innerWidth <= 860 ? '70px' : 'auto'; m.style.top = innerWidth <= 860 ? 'auto' : r.top - 120 + 'px'; }
      m.querySelector('[data-logout]').onclick = async () => { await api('auth/logout', 'POST', {}); location.href = '/'; };
      setTimeout(() => document.addEventListener('click', function f(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', f); } }), 0);
    };
    $('[data-more]').onclick = (e) => { e.stopPropagation(); openMenu(e.currentTarget); };
    $('[data-me]').onclick = (e) => { e.stopPropagation(); openMenu(e.currentTarget); };
    railData();
    return $('#main');
  }

  async function railData() {
    try {
      const [{ users }, { tags }] = await Promise.all([api('suggestions'), api('trending')]);
      if (users.length) {
        const s = $('#sug'); s.hidden = false;
        s.insertAdjacentHTML('beforeend', users.slice(0, 3).map((u) => `<div class="sug"><a href="/perfil/${esc(u.username)}">${av(u, 44)}</a><a class="info" href="/perfil/${esc(u.username)}"><b>${esc(u.name)}${u.verified ? verified : ''}</b><small>@${esc(u.username)}</small></a><button class="btn sm" data-follow="${esc(u.username)}">Seguir</button></div>`).join('') + '<a class="link" href="/explorar">Mostrar mais</a>');
        s.onclick = async (e) => { const b = e.target.closest('[data-follow]'); if (!b) return; try { const { on } = await api(`users/${b.dataset.follow}/follow`, 'POST', {}); b.textContent = on ? 'Seguindo' : 'Seguir'; b.classList.toggle('ghost', on); } catch (er) { toast(errText(er)); } };
      }
      if (tags.length) {
        const t = $('#trend'); t.hidden = false;
        t.insertAdjacentHTML('beforeend', tags.slice(0, 4).map((x) => `<a class="trend" href="/explorar?q=%23${encodeURIComponent(x.tag)}"><small>Tendência · esta semana</small><b>#${esc(x.tag)}</b><small>${x.n} ${x.n === 1 ? 'post' : 'posts'}</small></a>`).join(''));
      }
    } catch { /* coluna é opcional */ }
  }

  // Cada página do app chama: Alba.page('home', async (main, me) => { ... })
  async function page(active, fn) {
    let d;
    try { d = await api('me'); } catch { return; }
    const main = shell(active, d.user, d.counts);
    setInterval(async () => {
      try { const c = await api('counts'); for (const k of ['notificacao', 'mensagens']) { const n = c[k === 'notificacao' ? 'notifications' : 'messages']; const pip = $(`[data-pip="${k}"]`); if (pip) { pip.textContent = n; pip.hidden = !n; } } } catch { /* ignora */ }
    }, 45000);
    await fn(main, d.user);
  }

  window.Alba = { $, esc, api, errText, icon, av, ago, fmt, linkify, debounce, toast, confirmBox, compress, postHTML, feed, composer, page, verified };
})();
