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
| `/paroquias` | `paroquias.html` | Buscar, entrar, sair e cadastrar paróquia |
| `/perfil`, `/perfil/usuario` | `perfil.html` | Perfil com abas Posts, Orações, Republicados, Curtidas |
| `/configuracoes` | `configuracoes.html` | Foto, nome, bio, e-mail, **trocar senha**, sair de outros aparelhos, excluir conta |
| `/post/id`, `/salvos` | `post.html`, `salvos.html` | Post com comentários e posts salvos |

## Como colocar no ar

1. Suba a pasta para o GitHub e importe na Vercel.
2. Crie um banco Postgres (Neon, Supabase ou Vercel Postgres) e coloque a conexão em **`DATABASE_URL`**.
3. Crie **`JWT_SECRET`** (texto aleatório de 32+ caracteres). Veja `.env.example`.
4. Deploy. As tabelas são criadas sozinhas na primeira requisição.

Local: `npm install`, copie `.env.example` para `.env.local`, `npm i -g vercel` e `vercel dev`.
Teste da API: `DATABASE_URL=... JWT_SECRET=... node test/smoke.js`.

## Segurança já incluída

- Senhas com bcrypt; sessão em cookie HttpOnly + Secure + SameSite=Lax (JWT, 30 dias).
- Trocar a senha ou "sair dos outros aparelhos" invalida as sessões antigas.
- Limite de tentativas de login (8 por 15 min por IP + usuário).
- Escritas só aceitam JSON (proteção extra contra CSRF); todo texto é escapado no navegador; fotos validadas e reduzidas.

## Para evoluir

- "Palavra de hoje" usa versículos fixos em rotação (`VERSES` em `public/js/common.js`); o link leva ao Evangelho do dia no Vatican News. Para a liturgia real, ligue uma API ou um painel de admin.
- Stories, recuperação de senha por e-mail (precisa de um serviço de envio), moderação/denúncias e selo de verificado (`users.verified`).
