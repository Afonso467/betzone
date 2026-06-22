# NovaCrates — Gaming Platform

Plataforma gaming premium com minigames, skin market, giveaways e sistema de apostas.
**Versão sem autenticação** — todos usam o mesmo perfil de demonstração (`GamerPro`), pensada para teste/demo rápido.

## Stack

**Frontend:** React 18 + Vite + Tailwind CSS + React Router + Framer Motion + Lucide React
**Backend:** Node.js + Express
**Base de dados:** MySQL 8

## Estrutura

```
novacrates/
├── package.json       # scripts raiz — corre tudo com "npm run dev"
├── backend/            # API Express
│   └── src/
│       ├── controllers/   # gameController, marketController
│       ├── routes/        # games, skins, giveaways, leaderboard, store
│       ├── middleware/    # errorHandler, rateLimiter
│       ├── models/        # userModel, gameModel, index (Skin/Case/Giveaway/Leaderboard)
│       ├── config/        # database.js
│       └── utils/         # rng.js — RNG seguro do servidor
└── frontend/           # React + Vite
    └── src/
        ├── components/
        │   ├── ui/        # Button, Card, Badge, Input, Modal, Spinner…
        │   ├── layout/    # Sidebar, Navbar, Layout
        │   └── games/     # Mines, Coinflip, Crash, Blackjack, Cases
        ├── pages/         # Uma página por rota
        ├── context/       # GameContext — substitui o login por um estado global simples
        ├── hooks/         # useApi
        └── utils/         # api.js, constants.js
```

## ⚡ Início rápido (um único comando)

### 1. Instalar tudo

```bash
npm run install:all
```

Isto instala as dependências da raiz, do `backend/` e do `frontend/` automaticamente.

### 2. Configurar a base de dados

```bash
cd backend
cp .env.example .env
```

Edita o `.env` com os dados do teu MySQL local:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=a_tua_password
DB_NAME=novacrates
```

### 3. Criar tabelas + dados de demonstração

Na raiz do projeto:
```bash
npm run migrate
npm run seed
```

### 4. Correr o projeto completo

Na raiz do projeto:
```bash
npm run dev
```

Isto arranca **backend (porta 3001) e frontend (porta 5173) ao mesmo tempo**, num único terminal, com logs identificados por cor (`API` em amarelo, `WEB` em azul).

Abre o browser em **http://localhost:5173** — pronto, sem necessidade de login.

---

## Setup tudo-em-um (alternativa)

Se preferires fazer tudo de uma vez (instalar + migrar + seed):

```bash
npm run setup
npm run dev
```

---

## Scripts disponíveis (raiz)

| Comando | Descrição |
|---|---|
| `npm run dev` | Corre backend + frontend em simultâneo |
| `npm run install:all` | Instala dependências de ambos os projetos |
| `npm run migrate` | Cria as tabelas MySQL |
| `npm run seed` | Insere dados de demonstração |
| `npm run setup` | install:all + migrate + seed (tudo de uma vez) |
| `npm run build` | Build de produção do frontend |

## Variáveis de ambiente

### Backend (`backend/.env`)
```
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=novacrates
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### Frontend (`frontend/.env`) — opcional
```
VITE_API_URL=http://localhost:3001/api
```

## Sobre a economia de pontos (moeda única)

A plataforma usa **apenas pontos** como moeda — não existe saldo monetário (€) nem qualquer sistema de pagamento. Todas as apostas, caixas e compras no Skin Market são feitas e pagas em pontos.

O utilizador de demonstração começa com 18.900 pontos (definidos no seed). Ganha mais pontos jogando (Mines, Coinflip, Crash, Blackjack) ou abrindo caixas no Case Opening — onde o item recebido é puramente visual/cosmético (vai para o inventário), mas o valor real ganho são os pontos associados a esse item (`points_value`).

## Sobre a remoção de autenticação

Esta versão **não tem login, registo nem JWT**. Todas as ações (apostar, jogar, comprar skins, etc.) são feitas em nome de um utilizador de demonstração fixo (`id = 1`, username `GamerPro`), criado automaticamente pelo `npm run seed`.

Isto é ideal para:
- Demonstrações e testes rápidos
- Portfólio / apresentação visual
- Desenvolvimento local sem complexidade de sessões

Se mais tarde quiseres reativar autenticação (JWT + bcrypt + rotas protegidas), a arquitetura modular do projeto torna fácil voltar a adicionar essa camada sem reescrever os jogos ou o frontend.

## API Endpoints

### Jogos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | /api/games/state           | Saldo, XP, histórico do utilizador demo |
| POST | /api/games/mines/start     | Iniciar partida Mines |
| POST | /api/games/mines/reveal    | Revelar célula |
| POST | /api/games/mines/cashout   | Cashout |
| POST | /api/games/coinflip        | Jogar Coinflip |
| POST | /api/games/crash/join      | Entrar no Crash |
| POST | /api/games/crash/cashout   | Cashout no Crash |
| POST | /api/games/blackjack/deal  | Distribuir cartas |
| POST | /api/games/blackjack/action| Hit / Stand / Double |
| POST | /api/games/cases/open      | Abrir caixa |

### Market & Loja
| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | /api/skins             | Listar skins |
| POST | /api/skins/:id/buy     | Comprar skin |
| POST | /api/skins/sell        | Vender skin do inventário |
| GET  | /api/store             | Pacotes da loja |
| GET  | /api/store/inventory   | Inventário do utilizador |

### Giveaways & Leaderboard
| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | /api/giveaways         | Listar giveaways ativos |
| POST | /api/giveaways/:id/enter | Participar |
| GET  | /api/leaderboard       | Classificação global |

### Apostas Esportivas (jogos criados manualmente pelo admin)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | /api/sports/fixtures              | Listar jogos disponíveis para apostar (público) |
| POST | /api/bets/place                   | Colocar aposta (simples ou múltipla) |
| GET  | /api/bets/mine                    | Histórico de apostas do utilizador |

### Painel de Administração (protegido por password)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | /api/admin/fixtures               | Listar todos os jogos |
| POST   | /api/admin/fixtures               | Criar jogo (equipas, logos, odds, data/hora) |
| PUT    | /api/admin/fixtures/:id           | Editar jogo (antes de terminado) |
| DELETE | /api/admin/fixtures/:id           | Remover jogo |
| POST   | /api/admin/fixtures/:id/status    | Marcar como "live" ou "cancelled" (cancelar devolve as apostas) |
| POST   | /api/admin/fixtures/:id/result    | Definir resultado final — resolve automaticamente todas as apostas pendentes |

Todas as rotas `/api/admin/*` exigem o header `x-admin-password` com o valor definido em `ADMIN_PASSWORD` no `.env`. O frontend faz isto automaticamente depois do login no painel `/admin`.

## Sistema de Apostas — jogos manuais (sem API externa)

Em vez de depender de uma API de desporto externa (com limitações de plano gratuito, cobertura de ligas e custos), a NovaCrates usa um **painel de administração simples** onde o admin cria os jogos manualmente:

1. Acede a `/admin` no frontend (link discreto no fundo da sidebar)
2. Introduz a password definida em `ADMIN_PASSWORD` no `backend/.env`
3. Cria um jogo: competição, equipas/seleções, **URL da imagem da bandeira/badge** de cada lado, data/hora e as 3 odds (casa/empate/fora)
4. O jogo aparece imediatamente na página pública de Apostas, com contagem decrescente até ao início
5. Quando o jogo terminar, volta ao painel e define o resultado (golos de cada equipa) — **todas as apostas pendentes sobre esse jogo são resolvidas automaticamente**: ganhas pagam o potencial em pontos, perdidas são fechadas, e apostas múltiplas só pagam se todas as seleções ganharem

### Sugestões de fontes de imagens para bandeiras/badges
- Bandeiras de países: `https://flagcdn.com/w160/{código-iso}.png` (ex: `es` para Espanha, `sa` para Arábia Saudita)
- Badges de clubes: `https://crests.football-data.org/{id}.png` ou qualquer URL de imagem pública

## Segurança e Jogo Justo

- RNG criptograficamente seguro (`crypto.randomBytes`) no servidor para todos os jogos
- House edge configurável e transparente (Mines, Coinflip, Crash)
- Rate limiting nas rotas de jogo (anti-abuse)
- Todas as transações financeiras são auditadas na tabela `transactions`
- Painel de admin protegido por password fixa (`ADMIN_PASSWORD`), nunca exposta no frontend
- Resolução de apostas é atómica e determinística — cada seleção só é avaliada uma vez (estado `pending` → `won`/`lost`/`void`)

