Alba.page('oracoes', async (main) => {
  const { $, esc, api, ago, toast, errText } = Alba;
  main.innerHTML = `<div class="top"><h1>Velas</h1>${Alba.pillnav('velas')}</div>
    <div class="sky"><p class="sky-t">Acenda uma vela por uma intenção. Ela fica acesa por 24 horas e outras pessoas podem rezar junto.</p>
    <form id="lf" class="light"><input class="input" name="intention" maxlength="140" placeholder="Por quem ou pelo que você acende esta vela?" aria-label="Intenção"><label class="chk"><input type="checkbox" name="anonymous"> Anônima</label><button class="btn">Acender vela</button></form>
    <div id="wall" class="wall" aria-live="polite"></div></div>`;
  let candles = [];
  const draw = () => {
    $('#wall').innerHTML = candles.map((c, i) => {
      const f = Math.min(1, (Date.now() - new Date(c.created_at)) / 864e5);
      return `<button class="candle${c.mine ? ' mine' : ''}" data-i="${i}" style="--w:${Math.round(84 - f * 52)}px;--o:${(1 - f * 0.45).toFixed(2)};--d:${(i % 7) * 0.31}s" aria-label="Vela de ${esc(c.name || 'alguém')}"><span class="flame"></span><span class="wick"></span><span class="wax"></span><small>${esc(c.name ? c.name.split(' ')[0] : 'Anônima')}</small>${c.joins ? `<em>${c.joins}</em>` : ''}</button>`;
    }).join('') || '<div class="empty" style="color:#aab1cb"><b style="color:#fff">O mural está escuro</b>Seja o primeiro a acender uma vela hoje.</div>';
  };
  const load = async () => { try { candles = (await api('candles')).candles; draw(); } catch (e) { $('#wall').innerHTML = `<div class="empty">${esc(errText(e))}</div>`; } };
  $('#lf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target, b = $('.btn', f); b.disabled = true;
    try { await api('candles', 'POST', { intention: f.intention.value, anonymous: f.anonymous.checked }); f.reset(); toast('Sua vela foi acesa'); await load(); } catch (er) { toast(errText(er)); }
    b.disabled = false;
  };
  $('#wall').onclick = (e) => {
    const b = e.target.closest('.candle'); if (!b) return;
    const c = candles[+b.dataset.i], m = document.createElement('div'); m.className = 'modal';
    const who = c.username ? `<a href="/perfil/${esc(c.username)}" style="color:var(--navy);font-weight:600">${esc(c.name)}</a>` : 'Alguém, em anonimato';
    m.innerHTML = `<div class="box" role="dialog" aria-modal="true"><h3>${c.intention ? '“' + esc(c.intention) + '”' : 'Acesa em silêncio'}</h3><p>${who} · ${ago(c.created_at)} · ${c.joins} ${c.joins === 1 ? 'pessoa rezando junto' : 'pessoas rezando junto'}</p>
      <div class="btns">${c.mine ? '<button class="btn ghost sm" data-x="del">Apagar</button>' : ''}<button class="btn ghost sm" data-x="close">Fechar</button>${c.mine ? '' : `<button class="btn sm" data-x="join">${c.joined ? 'Rezando junto' : 'Rezar junto'}</button>`}</div></div>`;
    m.onclick = async (ev) => {
      const x = ev.target.closest('[data-x]');
      if (ev.target === m || (x && x.dataset.x === 'close')) return m.remove();
      if (!x) return;
      try { await api(x.dataset.x === 'del' ? 'candles/' + c.id : `candles/${c.id}/join`, x.dataset.x === 'del' ? 'DELETE' : 'POST', x.dataset.x === 'del' ? undefined : {}); m.remove(); load(); } catch (er) { toast(errText(er)); }
    };
    document.body.append(m);
  };
  load();
});
