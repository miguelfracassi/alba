Alba.page('oracoes', async (main, me) => {
  const { $, api, composer, feed } = Alba;
  main.innerHTML = `<div class="top"><h1>Orações</h1>${Alba.pillnav('oracoes')}<div class="tabs"><button class="on" data-s="all">Pedidos</button><button data-s="praying">Estou rezando</button><button data-s="mine">Meus pedidos</button></div></div><div id="comp"></div><div id="list"></div>`;
  let scope = 'all', f;
  const E = { all: ['Nenhum pedido por enquanto', 'Partilhe uma intenção e a comunidade reza com você.'], praying: ['Você ainda não está rezando por ninguém', 'Toque em “Rezar” num pedido para acompanhá-lo aqui.'], mine: ['Você ainda não fez pedidos', 'Use o campo acima para pedir orações.'] };
  const start = () => { f = feed($('#list'), (b) => api(`prayers?scope=${scope}&before=${b || ''}`), { title: E[scope][0], text: E[scope][1] }); };
  $('#comp').append(composer(me, { prayerOnly: true, onPost: (p) => { if (scope !== 'praying') f.prepend(p); } }));
  main.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { main.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b)); scope = b.dataset.s; start(); }));
  start();
});
