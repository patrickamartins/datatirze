require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { Pool } = require("pg");
const path = require("path");

// --- NOVAS IMPORTAÇÕES DE AUTENTICAÇÃO ---
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- CONFIGURAÇÃO DE SESSÃO E PASSPORT ---
app.use(session({
  secret: process.env.SESSION_SECRET || "datatirze_secret_key_2026",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: "lax",
  },
}));

app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated ? req.isAuthenticated() : false;
  res.locals.currentUser = req.user || null;
  next();
});

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não configurada no .env. Configure a conexão PostgreSQL para iniciar o sistema.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost") 
    ? false 
    : { rejectUnauthorized: false }
});

// --- SERIALIZAÇÃO DO USUÁRIO ---
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

// --- ESTRATÉGIA DO GOOGLE ---
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let result = await pool.query("SELECT * FROM users WHERE google_id = $1 OR email = $2", [profile.id, profile.emails[0].value]);
        let user = result.rows[0];

        if (user) {
          if (!user.google_id) {
            await pool.query("UPDATE users SET google_id = $1 WHERE id = $2", [profile.id, user.id]);
          }
          return done(null, user);
        } else {
          const insertResult = await pool.query(
            "INSERT INTO users (nome, email, google_id) VALUES ($1, $2, $3) RETURNING *",
            [profile.displayName, profile.emails[0].value, profile.id]
          );
          return done(null, insertResult.rows[0]);
        }
      } catch (err) {
        return done(err, null);
      }
    }
  ));
}

// --- CONSTANTES DO SISTEMA ORIGINAL ---
/** Relatos com qualquer sintoma além dos neutros contam como “com efeito adverso” no dashboard. */
const SINTOMAS_NEUTROS = new Set(["Nenhum sintoma", "Nenhum sintoma relevante"]);

const PRODUTOS_TIRZEPATIDA = ["Mounjaro", "Zepbound"];

const PRODUTOS_RETATRUTIDA = [
  "Synedica 40mg Caneta",
  "ZPHC 40mg Ampola",
  "ZPHC 60mg Ampola",
  "ZPHC 120mg Ampola",
  "ZPHC 30mg Caneta",
  "ZPHC 60mg Caneta",
  "Alluvi 40mg Caneta",
  "TNL 40mg Caneta",
];

const PRODUTOS_PEPTIDEOS = [
  "Semaglutida (Ozempic / Wegovy)",
  "Liraglutida (Saxenda / Victoza)",
  "BPC-157",
  "TB-500",
  "Ipamorelin + CJC-1295",
  "Outro peptídeo",
];

const PRODUTO_CATEGORIA = {};
PRODUTOS_TIRZEPATIDA.forEach((p) => {
  PRODUTO_CATEGORIA[p] = "tirzepatida";
});
PRODUTOS_RETATRUTIDA.forEach((p) => {
  PRODUTO_CATEGORIA[p] = "retatrutida";
});
PRODUTOS_PEPTIDEOS.forEach((p) => {
  PRODUTO_CATEGORIA[p] = "peptideos";
});

const PRODUTOS = [
  ...PRODUTOS_TIRZEPATIDA,
  ...PRODUTOS_RETATRUTIDA,
  ...PRODUTOS_PEPTIDEOS,
];

const SINTOMAS_POR_CATEGORIA = {
  tirzepatida: [
    "Náusea",
    "Diarreia",
    "Vômito",
    "Constipação",
    "Dor Abdominal",
    "Dispepsia (Indigestão)",
    "Refluxo Gastroesofágico",
    "Fadiga",
    "Redução acentuada do apetite",
    "Alopecia (Queda de cabelo)",
    "Nenhum sintoma",
  ],
  retatrutida: [
    "Aumento da Frequência Cardíaca",
    "Náusea severa",
    "Diarreia",
    "Vômitos cíclicos",
    "Constipação persistente",
    "Hiperestesia cutânea",
    "Tontura",
    "Saciação precoce",
    "Alteração no paladar",
    "Desconforto epigástrico",
    "Nenhum sintoma",
  ],
  peptideos: [
    "Reação no local da injeção",
    "Eritema ou induração no local",
    "Prurido (coceira)",
    "Náusea",
    "Cefaleia",
    "Fadiga",
    "Tontura",
    "Hipoglicemia sintomática",
    "Alteração do sono (insônia ou sonolência)",
    "Alteração do apetite",
    "Lipotrofia no local da aplicação",
    "Nenhum sintoma relevante",
  ],
};

const DOSES = ["10mg", "20mg", "30mg", "Outra"];
const LOCAIS_COMPRA = ["Farmácia", "Internet", "Clínica", "Outro"];

const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- INICIALIZAÇÃO DO BANCO DE DADOS ---
async function ensureColumnExists(columnName, columnType) {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='reports' AND column_name=$1
    `, [columnName]);
    
    if (res.rows.length === 0) {
      await pool.query(`ALTER TABLE reports ADD COLUMN ${columnName} ${columnType}`);
      console.log(`Coluna ${columnName} adicionada com sucesso.`);
    }
  } catch (err) {
    console.error(`Erro ao verificar/adicionar coluna ${columnName}:`, err);
  }
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      telefone TEXT NOT NULL,
      sexo TEXT NOT NULL,
      idade INTEGER,
      produto TEXT NOT NULL,
      lote INTEGER NOT NULL,
      dose TEXT,
      sintomas TEXT,
      observacoes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // Tabela de usuários (NOVA)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT,
      google_id TEXT UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await ensureColumnExists("local_compra", "TEXT");
  await ensureColumnExists("foto_lote", "BYTEA");
  await ensureColumnExists("foto_lote_nome", "TEXT");
  await ensureColumnExists("foto_lote_tipo", "TEXT");
  await ensureColumnExists("aceite_termos", "BOOLEAN DEFAULT FALSE");
  await ensureColumnExists("aceite_privacidade", "BOOLEAN DEFAULT FALSE");
  await ensureColumnExists("aceite_termos_em", "TIMESTAMP");
  await ensureColumnExists("aceite_privacidade_em", "TIMESTAMP");
}

// --- FUNÇÕES AUXILIARES ---
function getYearMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseSintomas(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return [input];
}

function isNegativeReport(sintomasArray) {
  if (!sintomasArray || sintomasArray.length === 0) return false;
  return sintomasArray.some((sintoma) => !SINTOMAS_NEUTROS.has(sintoma));
}

function getFaixaEtaria(idade) {
  const n = Number(idade);
  if (!n || n < 14) return "Abaixo de 14";
  if (n >= 14 && n <= 18) return "14 a 18";
  if (n >= 19 && n <= 24) return "19 a 24";
  if (n >= 25 && n <= 30) return "25 a 30";
  if (n >= 31 && n <= 40) return "31 a 40";
  if (n >= 41 && n <= 55) return "41 a 55";
  if (n >= 56 && n <= 65) return "56 a 65";
  return "65+";
}

function renderForm(res, overrides = {}) {
  return res.render("form", {
    produtosGrupos: [
      { label: "Tirzepatida (Mounjaro / Zepbound) — agonista GIP/GLP-1", itens: PRODUTOS_TIRZEPATIDA },
      { label: "Retatrutida — agonista GIP/GLP-1/Glucagon", itens: PRODUTOS_RETATRUTIDA },
      { label: "Outros peptídeos", itens: PRODUTOS_PEPTIDEOS },
    ],
    sintomasPorCategoriaJson: JSON.stringify(SINTOMAS_POR_CATEGORIA),
    produtoCategoriaJson: JSON.stringify(PRODUTO_CATEGORIA),
    doses: DOSES,
    locaisCompra: LOCAIS_COMPRA,
    success: null,
    error: null,
    formData: {},
    ...overrides
  });
}

// Middleware de Proteção
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// --- ROTAS PÚBLICAS ---
app.get("/", (req, res) => {
  res.render("home-landing", { hideHeaderActions: true });
});

// Página de manutenção (opcional)
app.get("/manutencao", (req, res) => {
  res.render("home");
});

// Alias da landing (mesma home que /)
app.get("/preview-home", (req, res) => {
  res.render("home-landing", { hideHeaderActions: true });
});

app.get("/reportar", (req, res) => {
  renderForm(res); // O form antigo agora fica aqui
});

app.get("/termos", (req, res) => res.render("termos"));
app.get("/privacidade", (req, res) => res.render("privacidade"));

// --- ROTAS DE AUTENTICAÇÃO ---
app.get("/login", (req, res) => res.render("login", { error: null }));
app.get("/register", (req, res) => res.render("register", { error: null }));

app.post("/register", async (req, res) => {
  const { nome, email, senha, confirmarSenha, aceite_termos } = req.body;
  if (senha !== confirmarSenha) return res.render("register", { error: "As senhas não conferem." });
  if (!aceite_termos) return res.render("register", { error: "Você deve aceitar os termos." });

  try {
    const hash = await bcrypt.hash(senha, 10);
    await pool.query("INSERT INTO users (nome, email, senha) VALUES ($1, $2, $3)", [nome, email, hash]);
    res.redirect("/login");
  } catch (err) {
    res.render("register", { error: "Erro ao cadastrar. Email pode já estar em uso." });
  }
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (user && user.senha && await bcrypt.compare(senha, user.senha)) {
      req.login(user, (err) => {
        if (err) throw err;
        return res.redirect("/dashboard");
      });
    } else {
      res.render("login", { error: "Email ou senha inválidos." });
    }
  } catch (err) {
    res.render("login", { error: "Erro ao processar login." });
  }
});

app.get("/logout", (req, res) => {
  req.logout(() => res.redirect("/"));
});

// Autenticação Google
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/dashboard")
);

// --- ROTA DE SUBMIT DO FORMULÁRIO (ORIGINAL) ---
app.post("/submit", upload.single("foto_lote"), async (req, res) => {
  const { nome, email, telefone, sexo, idade, produto, lote, dose, local_compra, observacoes, aceite_termos, aceite_privacidade } = req.body;
  const sintomasArray = parseSintomas(req.body.sintomas);

  const formData = { nome, email, telefone, sexo, idade, produto, lote, dose, local_compra, observacoes, aceite_termos, aceite_privacidade, sintomas: sintomasArray };

  if (!nome || !email || !telefone || !sexo || !idade || !produto || !lote || !local_compra) {
    return renderForm(res.status(400), { error: "Preencha todos os campos obrigatórios.", formData });
  }

  if (!req.file || !req.file.mimetype || !req.file.mimetype.startsWith("image/")) {
    return renderForm(res.status(400), { error: "Envie uma imagem válida para a foto do lote.", formData });
  }

  if (!aceite_termos || !aceite_privacidade) {
    return renderForm(res.status(400), { error: "É obrigatório aceitar os Termos e Condições e a Política de Privacidade.", formData });
  }

  try {
    const yearMonth = getYearMonth();
    const checkResult = await pool.query(
      `SELECT id FROM reports WHERE email = $1 AND telefone = $2 AND produto = $3 AND TO_CHAR(created_at, 'YYYY-MM') = $4 LIMIT 1`,
      [email, telefone, produto, yearMonth]
    );

    if (checkResult.rows.length > 0) {
      return renderForm(res.status(400), { error: `Você já registrou um relato para o produto "${produto}" neste mês.`, formData });
    }

    await pool.query(
      `INSERT INTO reports (nome, email, telefone, sexo, idade, produto, lote, dose, local_compra, sintomas, observacoes, foto_lote, foto_lote_nome, foto_lote_tipo, aceite_termos, aceite_privacidade, aceite_termos_em, aceite_privacidade_em, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW(), NOW())`,
      [nome, email, telefone, sexo, parseInt(idade, 10), produto, parseInt(lote, 10), dose || null, local_compra, JSON.stringify(sintomasArray), observacoes || "", req.file.buffer, req.file.originalname || null, req.file.mimetype || null, true, true]
    );

    return renderForm(res, { success: "Relato enviado com sucesso.", formData: {} });
  } catch (err) {
    console.error("Erro no submit:", err);
    return renderForm(res.status(500), { error: "Erro ao salvar o formulário.", formData });
  }
});

// --- ROTAS PROTEGIDAS (DASHBOARD) ---
app.get("/dashboard", requireAuth, (req, res) => {
  res.render("dashboard", { produtos: PRODUTOS, user: req.user });
});

app.get("/api/dashboard", requireAuth, async (req, res) => {
  const { produto, dose, sexo } = req.query;

  try {
    const result = await pool.query(`SELECT * FROM reports ORDER BY created_at DESC`);
    const rows = result.rows;

    let reports = rows.map((row) => {
      let sintomas = [];
      try { sintomas = JSON.parse(row.sintomas || "[]"); } catch { sintomas = []; }
      return { ...row, sintomas, negativo: isNegativeReport(sintomas), faixaEtaria: getFaixaEtaria(row.idade) };
    });

    if (produto) reports = reports.filter((r) => r.produto === produto);
    if (sexo) reports = reports.filter((r) => r.sexo === sexo);
    if (dose) reports = reports.filter((r) => r.dose === dose);

    const acceptanceMap = {};
    for (const report of reports) {
      const key = `${report.produto}__${report.sexo}`;
      if (!acceptanceMap[key]) {
        acceptanceMap[key] = { produto: report.produto, sexo: report.sexo, total: 0, semNegativo: 0 };
      }
      acceptanceMap[key].total += 1;
      if (!report.negativo) acceptanceMap[key].semNegativo += 1;
    }

    const acceptance = Object.values(acceptanceMap).map((item) => ({
      produto: item.produto, sexo: item.sexo, total: item.total, semNegativo: item.semNegativo,
      aceitacaoPercentual: item.total > 0 ? Number(((item.semNegativo / item.total) * 100).toFixed(2)) : 0
    }));

    const symptomCount = {};
    for (const report of reports) {
      for (const sintoma of report.sintomas) {
        symptomCount[sintoma] = (symptomCount[sintoma] || 0) + 1;
      }
    }

    const sintomasComuns = Object.entries(symptomCount).map(([sintoma, total]) => ({ sintoma, total })).sort((a, b) => b.total - a.total);

    const lotesNegativosMap = {};
    for (const report of reports) {
      if (report.negativo) {
        const key = `${report.produto}__${report.lote}`;
        if (!lotesNegativosMap[key]) {
          lotesNegativosMap[key] = { produto: report.produto, lote: report.lote, totalNegativos: 0 };
        }
        lotesNegativosMap[key].totalNegativos += 1;
      }
    }

    const lotesNegativos = Object.values(lotesNegativosMap).sort((a, b) => b.totalNegativos - a.totalNegativos);

    const ordemFaixas = ["14 a 18", "19 a 24", "25 a 30", "31 a 40", "41 a 55", "56 a 65", "65+"];
    const faixaMap = {};
    ordemFaixas.forEach((faixa) => { faixaMap[faixa] = 0; });

    for (const report of reports) {
      if (faixaMap[report.faixaEtaria] !== undefined) {
        faixaMap[report.faixaEtaria] += 1;
      }
    }

    const faixasEtarias = ordemFaixas.map((faixa) => ({ faixa, total: faixaMap[faixa] }));
    const dosesDisponiveis = [...new Set(rows.map((r) => r.dose).filter((d) => d))].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
    const sexosDisponiveis = [...new Set(rows.map((r) => r.sexo).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

    const tabela = reports.map((r) => ({
      sexo: r.sexo, idade: r.idade, faixaEtaria: r.faixaEtaria, produto: r.produto, lote: r.lote,
      dose: r.dose, local_compra: r.local_compra, sintomas: r.sintomas.join(", "), observacoes: r.observacoes, created_at: r.created_at
    }));

    res.json({
      acceptance, sintomasComuns, lotesNegativos, faixasEtarias, tabela,
      filtros: { produtos: PRODUTOS, doses: dosesDisponiveis, sexos: sexosDisponiveis }
    });
  } catch (err) {
    console.error("Erro na API do dashboard:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// --- INICIAR SERVIDOR ---
initDb().then(() => {
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
}).catch((err) => {
  console.error("Erro ao inicializar o banco de dados:", err);
  process.exit(1);
});
