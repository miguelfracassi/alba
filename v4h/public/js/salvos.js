Alba.page('', async (main) => {
  main.innerHTML = '<div class="top"><h1>Salvos</h1></div><div id="list"></div>';
  Alba.feed(Alba.$('#list'), (b) => Alba.api('bookmarks?before=' + (b || '')), { title: 'Nada salvo ainda', text: 'Toque no marcador de um post para guardá-lo aqui.' });
});
