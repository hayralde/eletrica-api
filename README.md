# Portal Elétrica — API

Backend do portal de tarefas da equipe Elétrica. Node.js + Express + PostgreSQL.

## Deploy

Feito como Web Service no Render, ligado ao banco Postgres já existente.
Variáveis de ambiente necessárias no Render (Settings → Environment):

- `DATABASE_URL` — Internal Database URL do banco Postgres no Render
- `CORS_ORIGIN` — `https://hayralde.github.io`
