Alba.page('home', async (main, me) => {
  const { $, api, composer, feed } = Alba;
  main.innerHTML = `<div class="top"><div class="tabs" role="tablist"><button class="on" data-t="foryou">Para você</button><button data-t="following">Seguindo</button><button data-t="parish">Minha paróquia</button></div></div><div class="mob-verse"><q>${Alba.esc(Alba.verse()[0])}</q><small>${Alba.esc(Alba.verse()[1])}</small><div class="mob-links"><a href="/terco">Rezar o terço</a><a href="/velas">Acender vela</a></div></div><div id="comp"></div><div id="list"></div>`;
  let tab = 'foryou';
  const empties = {
    foryou: { title: 'Ainda não há partilhas', text: 'Seja o primeiro a partilhar uma reflexão, uma graça alcançada ou um pedido.' },
    following: { title: 'Seu feed ainda está em silêncio', text: 'Siga irmãos e irmãs da comunidade para acompanhar o que eles partilham.' },
    parish: { title: 'Sua paróquia ainda não partilhou nada', text: 'Quando alguém da comunidade postar, aparece aqui.' },
  };
  let f;
  const start = () => { f = feed($('#list'), (before) => api(`feed?tab=${tab}&before=${before || ''}`).then((d) => d.needParish ? { posts: [], empty: '<div class="empty"><b>Você ainda não tem paróquia</b><a class="btn sm" href="/paroquias" style="margin-top:12px">Encontrar minha paróquia</a></div>' } : d), empties[tab]); };
  $('#comp').append(composer(me, { onPost: (p) => { if (tab !== 'parish') f.prepend(p); } }));
  main.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => {
    main.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
    tab = b.dataset.t; start();
  }));
  start();
  if (location.hash === '#novo') $('#comp textarea').focus();
});
