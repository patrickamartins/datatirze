require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

const PRODUTOS = [
  "Gluconex 15mg 4 Ampolas",
  "Lipoland 10mg 4 Ampolas",
  "Lipoland 15mg 4 Ampolas",
  "Lipoland MD 15mg",
  "Lipoless 2,5mg 4 Ampolas",
  "Lipoless 5mg 4 Ampolas",
  "Lipoless 7,5mg 4 Ampolas",
  "Lipoless 10mg 4 Ampolas",
  "Lipoless 12,5mg 4 Ampolas",
  "Lipoless 15mg 4 Ampolas",
  "Lipoless MD 15mg",
  "Mounjaro 2,5mg Caneta",
  "Mounjaro 5mg Caneta",
  "Mounjaro 7,5mg Caneta",
  "Mounjaro 10mg Caneta",
  "Mounjaro 12,5mg Caneta",
  "Mounjaro 15mg Caneta",
  "Synedica Labs 240mg 4 Ampolas",
  "TG 2,5mg 4 Ampolas",
  "TG 5mg 4 Ampolas",
  "TG 7,5mg 4 Ampolas",
  "TG 10mg 4 Ampolas",
  "TG 12,5mg 4 Ampolas",
  "TG 15mg 4 Ampolas",
  "Tirzec MD 2,5mg",
  "Tirzec MD 5mg",
  "Tirzec MD 7,5mg",
  "Tirzec MD 10mg",
  "Tirzec MD 12,5mg",
  "Tirzec MD 15mg",
  "Tirzec Pen 15mg"
];

const SINTOMAS = [
  "Náusea",
  "Dor de cabeça",
  "Tontura",
  "Sonolência",
  "Irritação na pele",
  "Insônia",
  "Boca seca",
  "Perda da fome",
  "Perda de medidas",
  "Perda de peso",
  "Perda de massa magra",
  "Ganho de peso",
  "Aumento da fome",
  "Compulsão alimentar",
  "Melhora na disposição",
  "Sem sintomas colaterais",
  "Outro"
];

const SINTOMAS_NEGATIVOS = [
  "Náusea",
  "Dor de cabeça",
  "Tontura",
  "Sonolência",
  "Irritação na pele",
  "Insônia",
  "Boca seca",
  "Perda de massa magra",
  "Ganho de peso",
  "Aumento da fome",
  "Compulsão alimentar"
];

const DOSES = [
  "1,0mg",
  "1,5mg",
  "2,0mg",
  "2,5mg",
  "3,0mg",
  "3,5mg",
  "4,0mg",
  "4,5mg",
  "5,0mg",
  "5,5mg",
  "6,0mg",
  "6,5mg",
  "7,0mg",
  "7,5mg",
  "8,0mg",
  "8,5mg",
  "9,0mg",
  "9,5mg",
  "10,0mg",
  "10,5mg",
  "11,0mg",
  "11,5mg",
  "12,0mg",
  "12,5mg",
  "13,0mg",
  "13,5mg",
  "14,0mg",
  "14,5mg",
  "15,0mg"
];

const LOCAIS_COMPRA = [
  "Farmácia",
  "Outros"
];

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL nao foi definida.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

async function ensureColumnExists(columnName, definition) {
  const existsResult = await pool.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reports'
      AND column_name = $1
    `,
    [columnName]
  );

  if (existsResult.rows.length === 0) {
    await pool.query(`ALTER TABLE reports ADD COLUMN ${columnName} ${definition}`);
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

  await ensureColumnExists("local_compra", "TEXT");
  await ensureColumnExists("foto_lote", "BYTEA");
  await ensureColumnExists("foto_lote_nome", "TEXT");
  await ensureColumnExists("foto_lote_tipo", "TEXT");
  await ensureColumnExists("aceite_termos", "BOOLEAN DEFAULT FALSE");
  await ensureColumnExists("aceite_privacidade", "BOOLEAN DEFAULT FALSE");
  await ensureColumnExists("aceite_termos_em", "TIMESTAMP");
  await ensureColumnExists("aceite_privacidade_em", "TIMESTAMP");
}

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
  return sintomasArray.some((sintoma) => SINTOMAS_NEGATIVOS.includes(sintoma));
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
    produtos: PRODUTOS,
    sintomas: SINTOMAS,
    doses: DOSES,
    locaisCompra: LOCAIS_COMPRA,
    success: null,
    error: null,
    formData: {},
    ...overrides
  });
}

app.get("/", (req, res) => {
  renderForm(res);
});

app.get("/termos", (req, res) => {
  res.render("termos");
});

app.get("/privacidade", (req, res) => {
  res.render("privacidade");
});

app.post("/submit", upload.single("foto_lote"), async (req, res) => {
  const {
    nome,
    email,
    telefone,
    sexo,
    idade,
    produto,
    lote,
    dose,
    local_compra,
    observacoes,
    aceite_termos,
    aceite_privacidade
  } = req.body;

  const sintomasArray = parseSintomas(req.body.sintomas);

  const formData = {
    nome,
    email,
    telefone,
    sexo,
    idade,
    produto,
    lote,
    dose,
    local_compra,
    observacoes,
    aceite_termos,
    aceite_privacidade,
    sintomas: sintomasArray
  };

  if (!nome || !email || !telefone || !sexo || !idade || !produto || !lote || !local_compra) {
    return renderForm(res.status(400), {
      error: "Preencha todos os campos obrigatórios.",
      formData
    });
  }

  if (!req.file) {
    return renderForm(res.status(400), {
      error: "A foto do lote da ampola é obrigatória.",
      formData
    });
  }

  if (!req.file.mimetype || !req.file.mimetype.startsWith("image/")) {
    return renderForm(res.status(400), {
      error: "Envie uma imagem válida para a foto do lote.",
      formData
    });
  }

  if (!aceite_termos || !aceite_privacidade) {
    return renderForm(res.status(400), {
      error: "É obrigatório aceitar os Termos e Condições e a Política de Privacidade.",
      formData
    });
  }

  try {
    const yearMonth = getYearMonth();

    const checkResult = await pool.query(
      `
      SELECT id
      FROM reports
      WHERE email = $1
        AND telefone = $2
        AND produto = $3
        AND TO_CHAR(created_at, 'YYYY-MM') = $4
      LIMIT 1
      `,
      [email, telefone, produto, yearMonth]
    );

    if (checkResult.rows.length > 0) {
      return renderForm(res.status(400), {
        error: `Você já registrou um relato para o produto "${produto}" neste mês.`,
        formData
      });
    }

    await pool.query(
      `
      INSERT INTO reports
      (
        nome,
        email,
        telefone,
        sexo,
        idade,
        produto,
        lote,
        dose,
        local_compra,
        sintomas,
        observacoes,
        foto_lote,
        foto_lote_nome,
        foto_lote_tipo,
        aceite_termos,
        aceite_privacidade,
        aceite_termos_em,
        aceite_privacidade_em,
        created_at
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW(), NOW())
      `,
      [
        nome,
        email,
        telefone,
        sexo,
        parseInt(idade, 10),
        produto,
        parseInt(lote, 10),
        dose || null,
        local_compra,
        JSON.stringify(sintomasArray),
        observacoes || "",
        req.file.buffer,
        req.file.originalname || null,
        req.file.mimetype || null,
        true,
        true
      ]
    );

    return renderForm(res, {
      success: "Relato enviado com sucesso.",
      formData: {}
    });
  } catch (err) {
    console.error("Erro no submit:", err);
    return renderForm(res.status(500), {
      error: "Erro ao salvar o formulário.",
      formData
    });
  }
});

app.get("/dashboard", (req, res) => {
  res.render("dashboard", {
    produtos: PRODUTOS
  });
});

app.get("/api/dashboard", async (req, res) => {
  const { produto, dose, sexo } = req.query;

  try {
    const result = await pool.query(`
      SELECT *
      FROM reports
      ORDER BY created_at DESC
    `);

    const rows = result.rows;

    let reports = rows.map((row) => {
      let sintomas = [];
      try {
        sintomas = JSON.parse(row.sintomas || "[]");
      } catch (e) {
        sintomas = [];
      }

      return {
        ...row,
        sintomas,
        negativo: isNegativeReport(sintomas),
        faixaEtaria: getFaixaEtaria(row.idade)
      };
    });

    if (produto) {
      reports = reports.filter((r) => r.produto === produto);
    }

    if (sexo) {
      reports = reports.filter((r) => r.sexo === sexo);
    }

    if (dose) {
      reports = reports.filter((r) => r.dose === dose);
    }

    const acceptanceMap = {};
    for (const report of reports) {
      const key = `${report.produto}__${report.sexo}`;
      if (!acceptanceMap[key]) {
        acceptanceMap[key] = {
          produto: report.produto,
          sexo: report.sexo,
          total: 0,
          semNegativo: 0
        };
      }
      acceptanceMap[key].total += 1;
      if (!report.negativo) {
        acceptanceMap[key].semNegativo += 1;
      }
    }

    const acceptance = Object.values(acceptanceMap).map((item) => ({
      produto: item.produto,
      sexo: item.sexo,
      total: item.total,
      semNegativo: item.semNegativo,
      aceitacaoPercentual:
        item.total > 0
          ? Number(((item.semNegativo / item.total) * 100).toFixed(2))
          : 0
    }));

    const symptomCount = {};
    for (const report of reports) {
      for (const sintoma of report.sintomas) {
        symptomCount[sintoma] = (symptomCount[sintoma] || 0) + 1;
      }
    }

    const sintomasComuns = Object.entries(symptomCount)
      .map(([sintoma, total]) => ({ sintoma, total }))
      .sort((a, b) => b.total - a.total);

    const lotesNegativosMap = {};
    for (const report of reports) {
      if (report.negativo) {
        const key = `${report.produto}__${report.lote}`;
        if (!lotesNegativosMap[key]) {
          lotesNegativosMap[key] = {
            produto: report.produto,
            lote: report.lote,
            totalNegativos: 0
          };
        }
        lotesNegativosMap[key].totalNegativos += 1;
      }
    }

    const lotesNegativos = Object.values(lotesNegativosMap).sort(
      (a, b) => b.totalNegativos - a.totalNegativos
    );

    const ordemFaixas = [
      "14 a 18",
      "19 a 24",
      "25 a 30",
      "31 a 40",
      "41 a 55",
      "56 a 65",
      "65+"
    ];

    const faixaMap = {};
    ordemFaixas.forEach((faixa) => {
      faixaMap[faixa] = 0;
    });

    for (const report of reports) {
      if (faixaMap[report.faixaEtaria] !== undefined) {
        faixaMap[report.faixaEtaria] += 1;
      }
    }

    const faixasEtarias = ordemFaixas.map((faixa) => ({
      faixa,
      total: faixaMap[faixa]
    }));

    const dosesDisponiveis = [
      ...new Set(
        rows
          .map((r) => r.dose)
          .filter((d) => d !== null && d !== undefined && d !== "")
      )
    ].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

    const sexosDisponiveis = [
      ...new Set(rows.map((r) => r.sexo).filter(Boolean))
    ].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

    const tabela = reports.map((r) => ({
      sexo: r.sexo,
      idade: r.idade,
      faixaEtaria: r.faixaEtaria,
      produto: r.produto,
      lote: r.lote,
      dose: r.dose,
      local_compra: r.local_compra,
      sintomas: r.sintomas.join(", "),
      observacoes: r.observacoes,
      created_at: r.created_at
    }));

    res.json({
      acceptance,
      sintomasComuns,
      lotesNegativos,
      faixasEtarias,
      tabela,
      filtros: {
        produtos: PRODUTOS,
        doses: dosesDisponiveis,
        sexos: sexosDisponiveis
      }
    });
  } catch (err) {
    console.error("Erro no dashboard:", err);
    res.status(500).json({ error: "Erro ao buscar dados." });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao iniciar banco:", err);
    process.exit(1);
  });