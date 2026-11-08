Alba.page('oracoes', async (main) => {
  const { $, esc, api, toast, errText, icon } = Alba;
  const P = {
    sinal: 'Pelo sinal da santa cruz, livrai-nos Deus, nosso Senhor, dos nossos inimigos.\nEm nome do Pai, e do Filho, e do Espírito Santo. Amém.',
    credo: 'Creio em Deus Pai todo-poderoso, criador do céu e da terra; e em Jesus Cristo, seu único Filho, nosso Senhor, que foi concebido pelo poder do Espírito Santo, nasceu da Virgem Maria, padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado; desceu à mansão dos mortos; ressuscitou ao terceiro dia; subiu aos céus, está sentado à direita de Deus Pai todo-poderoso, donde há de vir a julgar os vivos e os mortos.\nCreio no Espírito Santo, na santa Igreja Católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne, na vida eterna. Amém.',
    pai: 'Pai nosso, que estais nos céus, santificado seja o vosso nome; venha a nós o vosso reino; seja feita a vossa vontade assim na terra como no céu.\nO pão nosso de cada dia nos dai hoje; perdoai-nos as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido; e não nos deixeis cair em tentação, mas livrai-nos do mal. Amém.',
    ave: 'Ave Maria, cheia de graça, o Senhor é convosco; bendita sois vós entre as mulheres e bendito é o fruto do vosso ventre, Jesus.\nSanta Maria, Mãe de Deus, rogai por nós, pecadores, agora e na hora da nossa morte. Amém.',
    gloria: 'Glória ao Pai, ao Filho e ao Espírito Santo.\nComo era no princípio, agora e sempre. Amém.',
    jesus: 'Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno, levai as almas todas para o céu e socorrei principalmente as que mais precisarem.',
    salve: 'Salve, Rainha, Mãe de misericórdia, vida, doçura e esperança nossa, salve!\nA vós bradamos, os degredados filhos de Eva; a vós suspiramos, gemendo e chorando neste vale de lágrimas.\nEia, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei; e depois deste desterro mostrai-nos Jesus, bendito fruto do vosso ventre, ó clemente, ó piedosa, ó doce sempre Virgem Maria.\nRogai por nós, santa Mãe de Deus, para que sejamos dignos das promessas de Cristo. Amém.',
  };
  const SETS = {
    gozosos: ['Mistérios Gozosos', ['A Anunciação do Anjo a Maria', 'A Visitação de Maria a Isabel', 'O Nascimento de Jesus em Belém', 'A Apresentação de Jesus no Templo', 'O Encontro do Menino Jesus no Templo']],
    luminosos: ['Mistérios Luminosos', ['O Batismo de Jesus no Jordão', 'As Bodas de Caná', 'O Anúncio do Reino de Deus', 'A Transfiguração do Senhor', 'A Instituição da Eucaristia']],
    dolorosos: ['Mistérios Dolorosos', ['A Agonia de Jesus no Horto', 'A Flagelação do Senhor', 'A Coroação de Espinhos', 'Jesus carrega a Cruz a caminho do Calvário', 'A Crucificação e Morte de Jesus']],
    gloriosos: ['Mistérios Gloriosos', ['A Ressurreição de Jesus', 'A Ascensão de Jesus ao Céu', 'A Vinda do Espírito Santo', 'A Assunção de Maria ao Céu', 'A Coroação de Maria como Rainha do Céu e da Terra']],
  };
  const today = ['gloriosos', 'gozosos', 'dolorosos', 'gloriosos', 'luminosos', 'dolorosos', 'gozosos'][new Date().getDay()];
  const weekday = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  let set = today, step = -1, steps = [], stats = { streak: 0, total: 0, community_today: 0 }, lock = null;

  main.innerHTML = `<div class="top"><h1>Terço</h1>${Alba.pillnav('terco')}</div><div id="r" class="rosary"></div>`;
  const R = $('#r');
  api('terco/stats').then((s) => { stats = s; if (step < 0) render(); }).catch(() => {});

  function build() {
    steps = [];
    const add = (o) => steps.push(o), list = SETS[set][1];
    add({ kicker: 'Início', title: 'Sinal da Cruz', text: P.sinal });
    add({ kicker: 'Início', title: 'Credo', text: P.credo });
    add({ kicker: 'Início · conta grande', title: 'Pai-Nosso', text: P.pai });
    ['pela fé', 'pela esperança', 'pela caridade'].forEach((w, i) => add({ kicker: `Início · ${w}`, title: 'Ave-Maria', text: P.ave, beads: [i + 1, 3] }));
    add({ kicker: 'Início', title: 'Glória', text: P.gloria });
    list.forEach((m, i) => {
      const k = `${i + 1}º mistério`;
      add({ kicker: k, title: m, text: 'Contemple este mistério em silêncio e ofereça-o por suas intenções.', announce: true });
      add({ kicker: k, title: 'Pai-Nosso', text: P.pai });
      for (let n = 1; n <= 10; n++) add({ kicker: `${k} · ${m}`, title: 'Ave-Maria', text: P.ave, beads: [n, 10] });
      add({ kicker: k, title: 'Glória', text: P.gloria });
      add({ kicker: k, title: 'Ó meu Jesus', text: P.jesus });
    });
    add({ kicker: 'Final', title: 'Salve Rainha', text: P.salve });
  }
  const statsHTML = () => `<div class="r-stats"><div><b>${stats.streak || 0}</b><span>${stats.streak === 1 ? 'dia seguido' : 'dias seguidos'}</span></div><div><b>${stats.total || 0}</b><span>${stats.total === 1 ? 'terço rezado' : 'terços rezados'}</span></div><div><b>${stats.community_today || 0}</b><span>rezaram hoje</span></div></div>`;
  const beads = (n, t) => `<div class="beads" aria-label="Conta ${n} de ${t}">${Array.from({ length: t }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;

  function render() {
    if (step < 0) {
      R.innerHTML = statsHTML() + `<div class="r-intro"><p class="mut">Hoje é ${esc(weekday)}. Segundo a tradição, rezamos os <b>${esc(SETS[today][0])}</b>.</p>
        <div class="chips">${Object.entries(SETS).map(([k, v]) => `<button class="chip-b${k === set ? ' on' : ''}" data-set="${k}">${esc(v[0].replace('Mistérios ', ''))}</button>`).join('')}</div>
        <ol class="myst">${SETS[set][1].map((m) => `<li>${esc(m)}</li>`).join('')}</ol>
        <button class="btn" id="go" style="min-height:52px;width:100%;font-size:17px">Começar o terço</button><p class="mut" style="text-align:center;margin-top:10px;font-size:14px">Toque em “Próxima” a cada oração. Dura cerca de 20 minutos.</p></div>`;
      R.querySelectorAll('[data-set]').forEach((b) => (b.onclick = () => { set = b.dataset.set; render(); }));
      $('#go').onclick = start; return;
    }
    if (step >= steps.length) {
      R.innerHTML = `<div class="r-done"><div class="flame-big" aria-hidden="true"></div><h2>Terço concluído</h2><p>Que o Senhor receba a sua oração. Amém.</p>${statsHTML()}<div class="btns"><a class="btn" href="/velas">Acender uma vela</a><button class="btn ghost" id="again">Voltar</button></div></div>`;
      $('#again').onclick = () => { step = -1; render(); }; return;
    }
    const s = steps[step], last = step === steps.length - 1;
    R.innerHTML = `<div class="r-prog"><span>${esc(SETS[set][0])}</span><span>${step + 1} / ${steps.length}</span></div><div class="r-bar"><i style="width:${((step + 1) / steps.length) * 100}%"></i></div>
      <article class="r-card${s.announce ? ' announce' : ''}"><small>${esc(s.kicker)}</small><h2>${esc(s.title)}</h2><p>${esc(s.text).replace(/\n/g, '<br>')}</p>${s.beads ? beads(s.beads[0], s.beads[1]) : ''}</article>
      <div class="r-nav"><button class="btn ghost" id="prev"${step === 0 ? ' disabled' : ''}>Voltar</button><button class="btn" id="next">${last ? 'Concluir' : 'Próxima'}</button></div><button class="more" id="quit" style="font-size:14px;color:var(--muted)">Sair do terço</button>`;
    $('#prev').onclick = () => go(-1); $('#next').onclick = () => go(1);
    $('#quit').onclick = () => { stop(); step = -1; render(); };
    window.scrollTo({ top: 0 });
  }
  async function start() { build(); step = 0; render(); try { lock = await navigator.wakeLock?.request('screen'); } catch { /* sem wake lock */ } }
  function stop() { try { lock && lock.release(); } catch { /* ok */ } lock = null; }
  async function go(d) {
    if (step < 0 || step >= steps.length) return;
    step += d;
    if (step >= steps.length) {
      stop();
      try { stats = await api('terco/complete', 'POST', { mystery: set }); } catch (e) { toast(errText(e)); }
    }
    render();
  }
  document.addEventListener('keydown', (e) => {
    if (step < 0 || step >= steps.length || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') go(-1);
  });
  render();
});
