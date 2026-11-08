Alba.page('paroquias', async (main, me) => {
  const { $, esc, api, icon, debounce, toast, errText } = Alba;
  main.innerHTML = `<div class="top"><h1>Paróquias</h1></div>
    <div class="pad" style="border-bottom:1px solid var(--line)"><form class="search" style="margin:0" onsubmit="return false">${icon('search')}<input id="q" placeholder="Buscar por nome ou cidade" aria-label="Buscar paróquia"></form></div>
    <section id="ag" class="section" hidden></section>
    <div id="list"></div>
    <details class="section"><summary style="cursor:pointer;font-weight:700;font-size:17px">Não encontrou? Cadastre sua paróquia</summary><form id="nf" style="margin-top:16px"><div class="msg" id="m"></div>
      <label class="field"><span>Nome</span><input class="input" name="name" maxlength="80" required placeholder="Paróquia São José"></label>
      <label class="field"><span>Cidade</span><input class="input" name="city" maxlength="60" placeholder="São Pedro, SP"></label>
      <label class="field"><span>Descrição</span><textarea class="input" name="description" maxlength="240" placeholder="Horários de missa, endereço, pastorais…"></textarea></label>
      <button class="btn">Cadastrar e entrar</button></form></details>`;
  async function loadAgenda() {
    const a = await api('agenda'), box = $('#ag');
    box.hidden = !a.parish; if (!a.parish) return;
    box.innerHTML = `<h2>Agenda · ${esc(a.parish.name)}</h2><p>Missas, terços, encontros e festas da sua comunidade.</p>` + (a.events.map((e) => Alba.eventRow(e, a.can_edit)).join('') || '<p style="margin:0">Nenhum evento marcado por enquanto.</p>') +
      (a.can_edit ? `<form id="ev" style="margin-top:18px"><div class="msg" id="evm"></div><label class="field"><span>Novo evento</span><input class="input" name="title" maxlength="80" required placeholder="Santa Missa, Terço dos Homens…"></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><label class="field"><span>Data e hora</span><input class="input" type="datetime-local" name="starts_at" required></label><label class="field"><span>Local</span><input class="input" name="place" maxlength="80" placeholder="Igreja Matriz"></label></div><button class="btn sm">Adicionar à agenda</button></form>` : '');
    box.onclick = async (e) => { const b = e.target.closest('[data-del-ev]'); if (!b) return; try { await api('agenda/' + b.closest('.ev').dataset.id, 'DELETE'); loadAgenda(); } catch (er) { toast(errText(er)); } };
    const f = $('#ev'); if (f) f.onsubmit = async (e) => { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); try { await api('agenda', 'POST', { ...d, starts_at: new Date(d.starts_at).toISOString() }); toast('Evento adicionado'); loadAgenda(); } catch (er) { const m = $('#evm'); m.className = 'msg err'; m.textContent = errText(er); } };
  }
  async function load() {
    loadAgenda().catch(() => {});
    const { parishes } = await api('parishes?q=' + encodeURIComponent($('#q').value));
    $('#list').innerHTML = parishes.map((p) => `<div class="row"><span class="tag" style="width:46px;height:46px">${icon('church')}</span><div class="info"><b>${esc(p.name)}</b><small>${esc([p.city, p.members + (p.members === 1 ? ' membro' : ' membros')].filter(Boolean).join(' · '))}</small>${p.description ? `<small>${esc(p.description)}</small>` : ''}</div>
      <button class="btn sm${p.mine ? ' ghost' : ''}" data-id="${p.id}" data-mine="${p.mine ? 1 : ''}">${p.mine ? 'Sair' : 'Entrar'}</button></div>`).join('') || '<div class="empty"><b>Nenhuma paróquia encontrada</b>Cadastre a sua logo abaixo.</div>';
  }
  $('#q').addEventListener('input', debounce(() => load().catch(() => {}), 300));
  $('#list').onclick = async (e) => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    try { await api(b.dataset.mine ? 'parishes/leave' : `parishes/${b.dataset.id}/join`, 'POST', {}); toast(b.dataset.mine ? 'Você saiu da paróquia' : 'Bem-vindo à paróquia!'); load(); } catch (er) { toast(errText(er)); }
  };
  $('#nf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target, m = $('#m');
    try { await api('parishes', 'POST', Object.fromEntries(new FormData(f))); f.reset(); f.closest('details').open = false; toast('Paróquia cadastrada'); load(); } catch (er) { m.className = 'msg err'; m.textContent = errText(er); }
  };
  load().catch((e) => { $('#list').innerHTML = `<div class="empty">${esc(errText(e))}</div>`; });
});
