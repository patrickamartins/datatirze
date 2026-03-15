require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

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
  "Compulsão alimentar",
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
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

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
  return sintomasArray.some((s) => SINTOMAS_NEGATIVOS.includes(s));
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

app.get("/", (req, res) => {
  res.render("form", {
    produtos: PRODUTOS,
    sintomas: SINTOMAS,
    doses: DOSES,
    success: null,
    error: null,
    formData: {}
  });
});

app.post("/submit", async (req, res) => {
  const {
    nome,
    email,
    telefone,
    sexo,
    idade,
    produto,
    lote,
    dose,
    observacoes
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
    observacoes,
    sintomas: sintomasArray
  };

  if (!nome || !email || !telefone || !sexo || !idade || !produto || !lote) {
    return res.status(400).render("form", {
      produtos: PRODUTOS,
      sintomas: SINTOMAS,
      doses: DOSES,
      success: null,
      error: "Preencha todos os campos obrigatórios.",
      formData
    });
  }

  try {
    const yearMonth = getYearMonth();

    const sqlCheck = `
      SELECT id, created_at
      FROM reports
      WHERE email = $1
        AND telefone = $2
        AND produto = $3
        AND TO_CHAR(created_at, 'YYYY-MM') = $4
      LIMIT 1
    `;

    const checkResult = await pool.query(sqlCheck, [
      email,
      telefone,
      produto,
      yearMonth
    ]);

    if (checkResult.rows.length > 0) {
      return res.status(400).render("form", {
        produtos: PRODUTOS,
        sintomas: SINTOMAS,
        doses: DOSES,
        success: null,
        error: `Você já registrou um relato para o produto "${produto}" neste mês.`,
        formData
      });
    }

    const sqlInsert = `
      INSERT INTO reports
      (nome, email, telefone, sexo, idade, produto, lote, dose, sintomas, observacoes, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `;

    await pool.query(sqlInsert, [
      nome,
      email,
      telefone,
      sexo,
      parseInt(idade, 10),
      produto,
      parseInt(lote, 10),
      dose || null,
      JSON.stringify(sintomasArray),
      observacoes || ""
    ]);

    return res.render("form", {
      produtos: PRODUTOS,
      sintomas: SINTOMAS,
      doses: DOSES,
      success: "Relato enviado com sucesso.",
      error: null,
      formData: {}
    });
  } catch (err) {
    console.error("Erro no submit:", err);
    return res.status(500).render("form", {
      produtos: PRODUTOS,
      sintomas: SINTOMAS,
      doses: DOSES,
      success: null,
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
        item.total > 0 ? Number(((item.semNegativo / item.total) * 100).toFixed(2)) : 0
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

    const dosesDisponiveis = [...new Set(
      rows
        .map((r) => r.dose)
        .filter((d) => d !== null && d !== undefined && d !== "")
    )].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

    const sexosDisponiveis = [...new Set(
      rows
        .map((r) => r.sexo)
        .filter(Boolean)
    )].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

    const tabela = reports.map((r) => ({
      id: r.id,
      sexo: r.sexo,
      idade: r.idade,
      faixaEtaria: r.faixaEtaria,
      produto: r.produto,
      lote: r.lote,
      dose: r.dose,
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