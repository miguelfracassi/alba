# Alba

Mais perto de Deus, mais perto uns dos outros. Rede social católica.

Mesma arquitetura do Bloxter: HTML/CSS/JS puro + uma função de API (`api/index.js`) + Postgres, pronto para a Vercel.

## Páginas

| URL | Arquivo | O que é |
| --- | --- | --- |
| `/` | `index.html` | Página inicial com a frase da Alba |
| `/signup`, `/login` | `signup.html`, `login.html` | Criar conta e entrar |
| `/home` | `home.html` | Feed: Para você · Seguindo · Minha paróquia, com compositor e pedido de oração |
| `/explorar` | `explorar.html` | Busca de pessoas, posts e #hashtags |
| `/notificacao` | `notificacao.html` | Curtidas, comentários, novos seguidores e quem está rezando por você |
| `/mensagens`, `/mensagens/usuario` | `mensagens.html` | Mensagens diretas |
| `/oracoes` | `oracoes.html` | Pedidos de oração (todos, estou rezando, meus) |
| `/terco` | `terco.html` | Terço guiado: mistérios do dia, contas, sequência de dias e quantos rezaram hoje |
| `/velas` | `velas.html` | Mural de velas (24 h acesas), com intenção, modo anônimo e "rezar junto" |
| `/paroquias` | `paroquias.html` | Buscar, entrar, sair, cadastrar paróquia e **agenda** (quem criou a paróquia cadastra missas e eventos) |
| `/perfil`, `/perfil/usuario` | `perfil.html` | Perfil com abas Posts, Orações, Republicados, Curtidas |
| `/configuracoes` | `configuracoes.html` | Foto, nome, bio, e-mail, **trocar senha**, sair de outros aparelhos, excluir conta |
| `/post/id`, `/salvos` | `post.html`, `salvos.html` | Post com comentários e posts salvos |

## Como colocar no ar

1. Suba a pasta para o GitHub e importe na Vercel.
2. Crie um banco Postgres (Neon, Supabase ou Vercel Postgres) e coloque a conexão em **`DATABASE_URL`**.
3. Crie **`JWT_SECRET`** (texto aleatório de 32+ caracteres). Veja `.env.example`.
4. Deploy. As tabelas são criadas sozinhas na primeira requisição.

Local (sem Vercel): `npm install`, copie `.env.example` para `.env.local`, preencha, rode `npm run dev` e abra http://localhost:3000. **Não abra os .html com dois cliques**: os caminhos (`/style.css`, `/api/...`) só funcionam com servidor.
Depois de editar `public/style.css`, rode `npm run css` (o CSS fica embutido em cada página).
Teste da API: `DATABASE_URL=... JWT_SECRET=... node test/smoke.js`.

## Painel /admin

Em `/admin` (só para administradores) dá para: ver o resumo da comunidade, **verificar / tirar o selo** de contas, **suspender e reativar** (a pessoa é desconectada e não consegue entrar), **promover ou remover administradores**, excluir contas, apagar posts e excluir paróquias.

Como virar o primeiro admin (escolha um):
- Na Vercel, crie a variável **`ADMIN_USERNAMES`** com seu usuário (vários separados por vírgula, ex.: `mariah,pe.marcelo`) e faça Redeploy. Quem estiver na lista é admin automaticamente.
- Ou rode no banco: `UPDATE users SET is_admin = true WHERE username = 'seuusuario';`

Depois disso, quem já é admin promove outros pelo próprio painel. O link "Administração" aparece no menu "Mais".

## Segurança já incluída

- Senhas com bcrypt; sessão em cookie HttpOnly + Secure + SameSite=Lax (JWT, 30 dias).
- Trocar a senha ou "sair dos outros aparelhos" invalida as sessões antigas.
- Limite de tentativas de login (8 por 15 min por IP + usuário).
- Escritas só aceitam JSON (proteção extra contra CSRF); todo texto é escapado no navegador; fotos validadas e reduzidas.

## Para evoluir

- "Palavra de hoje" usa versículos fixos em rotação (`VERSES` em `public/js/common.js`); o link leva ao Evangelho do dia no Vatican News. Para a liturgia real, ligue uma API ou um painel de admin.
- Stories, recuperação de senha por e-mail (precisa de um serviço de envio), moderação/denúncias e selo de verificado (`users.verified`).
