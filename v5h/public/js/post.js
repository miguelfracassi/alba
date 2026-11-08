Alba.page('', async (main, me) => {
  const { $, esc, api, av, ago, verified, postHTML, errText, toast } = Alba;
  const id = location.pathname.split('/').pop();
  main.innerHTML = `<div class="top"><div class="head-row"><a class="back" href="/home" aria-label="Voltar">${Alba.icon('back')}</a><b>Post</b></div></div><div id="p"></div>
    <div class="composer"><div class="box"><textarea rows="1" maxlength="280" placeholder="Escreva um comentário" aria-label="Comentário"></textarea><div class="bar"><span class="count"></span><button class="btn sm" disabled>Comentar</button></div></div></div><div id="cs"></div>`;
  const ta = $('textarea'), btn = $('.composer .btn');
  ta.oninput = () => { btn.disabled = !ta.value.trim(); ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  async function load() {
    try {
      const [{ post }, { comments }] = await Promise.all([api('posts/' + id), api(`posts/${id}/comments`)]);
      $('#p').innerHTML = postHTML(post);
      $('#cs').innerHTML = comments.map((c) => `<div class="row" style="align-items:flex-start"><a href="/perfil/${esc(c.username)}">${av(c, 40)}</a><div class="info"><b style="display:inline">${esc(c.name)}${c.verified ? verified : ''}</b> <small style="display:inline">@${esc(c.username)} · ${ago(c.created_at)}</small><div style="white-space:pre-wrap;word-break:break-word;margin-top:2px">${esc(c.body)}</div></div></div>`).join('') || '<div class="empty">Seja o primeiro a comentar.</div>';
    } catch (e) { $('#p').innerHTML = `<div class="empty"><b>Post não encontrado</b>${esc(errText(e))}</div>`; }
  }
  btn.onclick = async () => { btn.disabled = true; try { await api(`posts/${id}/comments`, 'POST', { body: ta.value }); ta.value = ''; await load(); } catch (e) { toast(errText(e)); } };
  load();
});
