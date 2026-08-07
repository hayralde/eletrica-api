require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// CORS: libera só o domínio do GitHub Pages (defina CORS_ORIGIN no Render).
// Em branco/ausente = libera geral (útil pra testar local antes de configurar).
const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});

const PONTOS = {
  concluidaNoPrazo: 10,
  concluidaAtrasada: 3,
  naoCumprida: -5
};

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/* =========================================================
   DADOS INICIAIS (mesmos que você enviou) — usados só se as
   tabelas ainda estiverem vazias na primeira vez que o servidor sobe.
========================================================= */
const USERS_SEED = [
  {matricula:"779", nome:"ADRIEL SODRE DOS SANTOS"},
  {matricula:"254", nome:"CARLOS JOSE BARBOSA DA SILVA"},
  {matricula:"848", nome:"DIONATAN GONCALVES DA SILVA"},
  {matricula:"88",  nome:"EDSON CARLOS SCATOLIN"},
  {matricula:"707", nome:"JADSON SAMPAIO DA SILVA"},
  {matricula:"888", nome:"LEANDRO SOUZA SARAIVA"},
  {matricula:"719", nome:"LUCAS SOARES DE OLIVEIRA DOS SANTOS"},
  {matricula:"229", nome:"MARCIO IDEIGLAN DA CONCEICAO SILVA"},
  {matricula:"884", nome:"NIBSON MACENA DA SILVA"},
  {matricula:"195", nome:"VALTER JOSE DA SILVA CANDIDO"},
  {matricula:"241", nome:"VANDERLEY DA GAMA FERREIRA"}
];

const FOLGA_DATA = {
"779":["","","","F","","","","","","F","","","","","","F","","","","","","F","","","","","","F","","",""],
"254":["","F","","","","","","F","","","","","","F","","","","","","F","","","","","","F","","","","",""],
"848":["F","","","","","","F","","","","","","F","","","","","","F","","","","","","F","","","","","","F"],
"88":["","","","F","","","","","","F","","","","","","F","","","","","","F","","","","","","F","","",""],
"707":["","F","","","","","","F","","","","","","F","","","","","","F","","","","","","F","","","","",""],
"888":["","","","","F","","","","","","F","","","","","","F","","","","","","F","","","","","","F","",""],
"719":["","","F","","","","","","F","","","","","","F","","","","","","F","","","","","","F","","","",""],
"229":["","","","","F","","","","","","F","","","","","","F","","","","","","F","","","","","","F","",""],
"884":["","","","","F","","","","","","F","","","","","","F","","","","","","F","","","","","","F","",""],
"195":["","","","","","F","","","","","","F","","","","","","F","","","","","","F","","","","","","F",""],
"241":["F","","","","","","F","","","","","","F","","","","","","F","","","","","","F","","","","","","F"]
};

const TASKS_SEED = [
{os:2019,desc:"Instalar conector no Spray System (pegar material com Dimas)"},
{os:1779,desc:"Inspecionar e calibrar sensor de nível da Dorna 02"},
{os:1775,desc:"Passar cabo para chave boia da bomba Sampy, lado armazém liquefação — ligar na remota e informar canal para automação"},
{os:null,desc:"Limpeza das placas fotovoltaicas dos repetidores de sinal do alarme de incêndio"},
{os:1911,desc:"Instalar plug para máquina da Jacto na portaria de motoristas — alinhar com Suzamar (continuação)"},
{os:1902,desc:"Realizar limpeza das placas solares do sistema SDAI — todos os setores"},
{os:null,desc:"Verificar chegada de tensão na repetidora do SDAI (sistema de incêndio) — anotar endereço/tag"},
{os:null,desc:"Verificar operação da unidade de resfriamento de óleo dos secadores 1, 2, 3, 4 e 5"},
{os:2702,desc:"Extensões espalhadas pela fábrica"},
{os:null,desc:"Acompanhar startup da osmose nova"},
{os:null,desc:"Desmembrar circuito de tomadas das mesas do COI"},
{os:1918,desc:"Verificar o transmissor de vazão das bombas de fuligem da caldeira"},
{os:1911,desc:"Instalar plug para máquina da Jacto na portaria de motoristas — reprogramado"},
{os:null,desc:"Fazer ligação de lubrificador automático nas Decanter 01, 02 e 03 — alinhar com Sr. Daniel da preditiva"},
{os:null,desc:"Check-list CCM moagem: inversor da bomba CIP Soda instalado de forma inadequada — providenciar O.S. para compra do painel"},
{os:1955,desc:"Fechar tampa condulete próximo à Dorna 03"},
{os:1750,desc:"Adequação dos painéis de serviço (tomadas) — Moagem, Fermentação, Destilaria (limpeza, canaletas, ativar DR, garantir proteção)"},
{os:1919,desc:"Planejar e selecionar material para interligar gerador e CCM TGM (falar com Dimas)"},
{os:1924,desc:"Verificar operação da unidade de resfriamento de óleo dos secadores 1 a 5 — colocar setpoint em 60ºC"},
{os:1955,desc:"Fechar tampa condulete próximo à Dorna 03 (2ª ocorrência)"},
{os:1740,desc:"Testar via supervisório válvulas de saída do túnel do Silo 01 (REG-118, REG-119, REG-120) — apoio da automação"},
{os:2021,desc:"Verificar e ajustar funcionamento do medidor de vazão de xarope concentrado FIT-214 — secador/misturador de DDG"},
{os:2022,desc:"Realizar calibração do instrumento de vazão do hidratado FE.020.0901C — Tanque 01 (TK-13S-001)"},
{os:2023,desc:"Ajustar indicação de INPM — marcação atual muito fora (DIT-502, RF02)"},
{os:2024,desc:"Recolocar motor da M-138 no local — ETE"},
{os:2026,desc:"Esteira transportadora de lona 02 — Armazém 01"},
{os:2027,desc:"Desenvolver sistema de alarme em tela quando a vazão de mosto estiver abaixo de 80m³"},
{os:2028,desc:"Verificar o transmissor de pressão do tubulão da caldeira"},
{os:2029,desc:"Realizar substituição da válvula solenoide do Tricanter 02"},
{os:2030,desc:"Verificar Poço 3, que está entrando em falha"},
{os:2031,desc:"Adequação na linha de ar comprimido do reboiler — dúvidas com Dimas"},
{os:1999,desc:"Ligar motor do poço de fuligem (bomba autoescorvante)"},
{os:1808,desc:"Instalar motor de 10 CV na Destilaria — motor bomba refluxo BR-02 (B-15), retorno de conserto"},
{os:2046,desc:"Providenciar painel de transferência para carga prioritária — parada do dia 7 (CCM turbina TGM, motores torres/mancais, nobreak)"},
{os:null,desc:"Interligar válvulas XV's da saída de ureia e recirculação"},
{os:null,desc:"Acompanhar partida da peneira molecular para produção de anidro, junto à EXAL"},
{os:null,desc:"Acompanhar startup da osmose nova"},
{os:null,desc:"Checar funcionamento dos leitores faciais (CCM's Secagem, Destilaria, Fermentação e Torres, ETE)"}
];

const MES_ATIVO_SEED = '2026-08';
function isoDateSeed(mesAtivo, diaIndex) {
  const [ano, mes] = mesAtivo.split('-').map(Number);
  const dia = diaIndex + 1;
  return `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
}

/* =========================================================
   INICIALIZAÇÃO AUTOMÁTICA DO BANCO
   Roda toda vez que o servidor sobe. Cria o schema/tabelas se não
   existirem (CREATE ... IF NOT EXISTS) e só insere os dados de
   exemplo (colaboradores, folgas, tarefas) se ainda estiver tudo vazio.
   Ou seja: é seguro reiniciar o serviço quantas vezes quiser, nunca duplica nada.
========================================================= */
async function initDb() {
  const client = await pool.connect();
  try {
    console.log('[init] Criando schema/tabelas (se ainda não existirem)...');
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS eletrica;

      CREATE TABLE IF NOT EXISTS eletrica.config (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS eletrica.colaboradores (
        matricula   TEXT PRIMARY KEY,
        nome        TEXT NOT NULL,
        pontos      INTEGER NOT NULL DEFAULT 0,
        concluidas  INTEGER NOT NULL DEFAULT 0,
        atrasadas   INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS eletrica.folgas (
        id         SERIAL PRIMARY KEY,
        matricula  TEXT NOT NULL REFERENCES eletrica.colaboradores(matricula) ON DELETE CASCADE,
        data       DATE NOT NULL,
        UNIQUE(matricula, data)
      );
      CREATE INDEX IF NOT EXISTS idx_folgas_matricula_data ON eletrica.folgas(matricula, data);

      CREATE TABLE IF NOT EXISTS eletrica.tarefas (
        id               SERIAL PRIMARY KEY,
        os               INTEGER,
        descricao        TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','atribuida','concluida','atrasada')),
        matricula        TEXT REFERENCES eletrica.colaboradores(matricula),
        data_programada  DATE,
        prazo_final      DATE,
        data_conclusao   DATE,
        penalizada       BOOLEAN NOT NULL DEFAULT FALSE,
        criada_em        TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_tarefas_matricula ON eletrica.tarefas(matricula);
      CREATE INDEX IF NOT EXISTS idx_tarefas_status ON eletrica.tarefas(status);

      INSERT INTO eletrica.config (chave, valor) VALUES ('admin_password', 'admin123')
        ON CONFLICT (chave) DO NOTHING;
      INSERT INTO eletrica.config (chave, valor) VALUES ('titulo', 'Elétrica')
        ON CONFLICT (chave) DO NOTHING;
    `);

    console.log('[init] Verificando colaboradores...');
    for (const u of USERS_SEED) {
      await client.query(
        `INSERT INTO eletrica.colaboradores (matricula, nome) VALUES ($1,$2)
         ON CONFLICT (matricula) DO UPDATE SET nome = EXCLUDED.nome`,
        [u.matricula, u.nome]
      );
    }

    console.log('[init] Verificando escala de folga...');
    for (const matricula of Object.keys(FOLGA_DATA)) {
      const dias = FOLGA_DATA[matricula];
      for (let i = 0; i < dias.length; i++) {
        if (dias[i] === 'F') {
          const data = isoDateSeed(MES_ATIVO_SEED, i);
          await client.query(
            `INSERT INTO eletrica.folgas (matricula, data) VALUES ($1,$2)
             ON CONFLICT (matricula, data) DO NOTHING`,
            [matricula, data]
          );
        }
      }
    }

    console.log('[init] Verificando banco de tarefas...');
    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM eletrica.tarefas');
    if (rows[0].n === 0) {
      for (const t of TASKS_SEED) {
        await client.query(
          `INSERT INTO eletrica.tarefas (os, descricao, status) VALUES ($1,$2,'pendente')`,
          [t.os, t.desc]
        );
      }
      console.log(`[init] ${TASKS_SEED.length} tarefas inseridas.`);
    } else {
      console.log(`[init] Banco de tarefas já tem ${rows[0].n} registros — mantido como está.`);
    }

    console.log('[init] Banco pronto.');
  } finally {
    client.release();
  }
}

async function getAdminPassword() {
  const { rows } = await pool.query(`SELECT valor FROM eletrica.config WHERE chave = 'admin_password'`);
  return rows[0] ? rows[0].valor : null;
}

// Marca como "atrasada" qualquer tarefa cujo prazo passou sem ser concluída,
// e aplica a penalidade de pontos uma única vez (campo "penalizada").
async function checkOverdue(client) {
  const today = todayISO();
  const { rows: vencidas } = await client.query(
    `UPDATE eletrica.tarefas
     SET status = 'atrasada', penalizada = true
     WHERE status = 'atribuida' AND prazo_final < $1 AND penalizada = false
     RETURNING matricula`,
    [today]
  );
  for (const row of vencidas) {
    if (row.matricula) {
      await client.query(
        `UPDATE eletrica.colaboradores SET pontos = pontos + $1, atrasadas = atrasadas + 1 WHERE matricula = $2`,
        [PONTOS.naoCumprida, row.matricula]
      );
    }
  }
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Estado completo do app: colaboradores, tarefas e escala de folga.
app.get('/api/state', async (req, res) => {
  const client = await pool.connect();
  try {
    await checkOverdue(client);

    const { rows: colaboradores } = await client.query(
      `SELECT matricula, nome, pontos, concluidas, atrasadas FROM eletrica.colaboradores ORDER BY nome`
    );
    const { rows: tarefas } = await client.query(
      `SELECT id, os, descricao, status, matricula,
              to_char(data_programada,'YYYY-MM-DD') AS "scheduledDate",
              to_char(prazo_final,'YYYY-MM-DD') AS "dueDate",
              to_char(data_conclusao,'YYYY-MM-DD') AS "completedDate"
       FROM eletrica.tarefas ORDER BY id`
    );
    const { rows: folgaRows } = await client.query(
      `SELECT matricula, to_char(data,'YYYY-MM-DD') AS data FROM eletrica.folgas ORDER BY data`
    );
    const folgas = {};
    for (const r of folgaRows) {
      if (!folgas[r.matricula]) folgas[r.matricula] = [];
      folgas[r.matricula].push(r.data);
    }
    const { rows: cfgRows } = await client.query(`SELECT chave, valor FROM eletrica.config`);
    const config = {};
    for (const c of cfgRows) if (c.chave !== 'admin_password') config[c.chave] = c.valor;

    res.json({ hoje: todayISO(), colaboradores, tarefas, folgas, config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dados.' });
  } finally {
    client.release();
  }
});

// Login do administrador
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body || {};
  const real = await getAdminPassword();
  if (real && password === real) return res.json({ ok: true });
  res.status(401).json({ ok: false, error: 'Senha incorreta.' });
});

// Atribuir uma tarefa a um colaborador (ação do admin)
app.post('/api/tasks/:id/assign', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { matricula, scheduledDate, dueDate, adminPassword } = req.body || {};

    const real = await getAdminPassword();
    if (!real || adminPassword !== real) {
      return res.status(401).json({ error: 'Senha de administrador inválida.' });
    }
    if (!matricula || !scheduledDate || !dueDate) {
      return res.status(400).json({ error: 'Dados incompletos.' });
    }
    if (dueDate < scheduledDate) {
      return res.status(400).json({ error: 'O prazo final não pode ser antes da data de programação.' });
    }

    const { rows: folgaCheck } = await client.query(
      `SELECT 1 FROM eletrica.folgas WHERE matricula = $1 AND data = $2`,
      [matricula, scheduledDate]
    );
    if (folgaCheck.length > 0) {
      return res.status(409).json({ error: 'Este colaborador está de folga nessa data.' });
    }

    const { rows: taskRows } = await client.query(`SELECT status FROM eletrica.tarefas WHERE id = $1`, [id]);
    if (taskRows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    if (taskRows[0].status !== 'pendente') {
      return res.status(409).json({ error: 'Essa tarefa já foi distribuída.' });
    }

    await client.query(
      `UPDATE eletrica.tarefas
       SET status = 'atribuida', matricula = $1, data_programada = $2, prazo_final = $3
       WHERE id = $4`,
      [matricula, scheduledDate, dueDate, id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atribuir tarefa.' });
  } finally {
    client.release();
  }
});

// Colaborador marca a própria tarefa como concluída
app.post('/api/tasks/:id/complete', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { matricula } = req.body || {};
    if (!matricula) return res.status(400).json({ error: 'Matrícula obrigatória.' });

    const { rows } = await client.query(`SELECT * FROM eletrica.tarefas WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const t = rows[0];
    if (t.matricula !== matricula) return res.status(403).json({ error: 'Esta tarefa não é sua.' });
    if (t.status === 'concluida') return res.status(409).json({ error: 'Tarefa já concluída.' });

    const today = todayISO();
    const dueDate = t.prazo_final ? t.prazo_final.toISOString().slice(0, 10) : today;
    const noPrazo = today <= dueDate;
    const pontosGanhos = noPrazo ? PONTOS.concluidaNoPrazo : PONTOS.concluidaAtrasada;

    await client.query(
      `UPDATE eletrica.tarefas SET status = 'concluida', data_conclusao = $1 WHERE id = $2`,
      [today, id]
    );
    await client.query(
      `UPDATE eletrica.colaboradores SET pontos = pontos + $1, concluidas = concluidas + 1 WHERE matricula = $2`,
      [pontosGanhos, matricula]
    );

    res.json({ ok: true, pontosGanhos, noPrazo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao concluir tarefa.' });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API do Portal Elétrica rodando na porta ${PORT}`));
  })
  .catch(err => {
    console.error('[init] Falha ao preparar o banco de dados:', err);
    process.exit(1);
  });
