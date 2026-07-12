const { MARCAS_LABELS } = require("./constants");

const CSV_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "session_token", label: "Sessão" },
  { key: "created_at", label: "Data" },
  { key: "email", label: "E-mail" },
  { key: "idade", label: "Idade" },
  { key: "genero", label: "Gênero" },
  { key: "estado", label: "Estado" },
  { key: "cidade", label: "Cidade" },
  { key: "escolaridade", label: "Escolaridade" },
  { key: "faixa_renda", label: "Faixa de Renda" },
  { key: "utilizou_tirzepatida", label: "Utilizou Tirzepatida" },
  { key: "pretende_utilizar", label: "Pretende Utilizar" },
  { key: "motivo_nao_utilizar", label: "Motivo Não Utilizar" },
  { key: "preco_justo_nao_usuario", label: "Preço Justo (Não Usuário)" },
  { key: "tempo_uso", label: "Tempo de Uso" },
  { key: "marca_atual", label: "Marca Atual" },
  { key: "marcas_utilizadas", label: "Marcas Utilizadas" },
  { key: "melhor_marca", label: "Melhor Marca" },
  { key: "melhor_custo_beneficio", label: "Melhor Custo-Benefício" },
  { key: "melhores_resultados", label: "Melhores Resultados" },
  { key: "menor_resultado", label: "Menor Resultado" },
  { key: "onde_compra", label: "Onde Compra" },
  { key: "como_conheceu", label: "Como Conheceu" },
  { key: "gasto_mensal", label: "Gasto Mensal" },
  { key: "preco_justo", label: "Preço Justo" },
  { key: "fatores_compra", label: "Fatores de Compra" },
  { key: "peso_inicial", label: "Peso Inicial" },
  { key: "peso_atual", label: "Peso Atual" },
  { key: "meta_peso", label: "Meta de Peso" },
  { key: "satisfacao", label: "Satisfação" },
  { key: "expectativa_atingida", label: "Expectativa Atingida" },
  { key: "acompanhamento_medico", label: "Acompanhamento Médico" },
  { key: "acompanhamento_nutricional", label: "Acompanhamento Nutricional" },
  { key: "atividade_fisica", label: "Atividade Física" },
  { key: "suplementacao", label: "Suplementação" },
  { key: "efeitos_colaterais", label: "Efeitos Colaterais" },
  { key: "efeito_mais_incomodo", label: "Efeito Mais Incômodo" },
  { key: "interrompeu_uso", label: "Interrompeu Uso" },
  { key: "efeito_interrupcao", label: "Efeito Interrupção" },
  { key: "fontes_informacao", label: "Fontes de Informação" },
  { key: "acompanha_influenciadores", label: "Acompanha Influenciadores" },
  { key: "influenciadores", label: "Influenciadores" },
  { key: "tipo_conteudo", label: "Tipo de Conteúdo" },
  { key: "falta_mercado", label: "O Que Falta no Mercado" },
];

function formatCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) {
    return value
      .map((v) => (MARCAS_LABELS[v] || v))
      .join("; ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return MARCAS_LABELS[value] || String(value);
}

function escapeCsv(value) {
  const str = formatCell(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows) {
  const header = CSV_COLUMNS.map((c) => c.label).join(",");
  const body = rows
    .map((row) => CSV_COLUMNS.map((c) => escapeCsv(row[c.key])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function rowsToExcelBuffer(rows) {
  let xlsx;
  try {
    xlsx = require("xlsx");
  } catch {
    throw new Error("Pacote xlsx não instalado. Execute: npm install xlsx");
  }

  const data = rows.map((row) => {
    const obj = {};
    CSV_COLUMNS.forEach((col) => {
      obj[col.label] = formatCell(row[col.key]);
    });
    return obj;
  });

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Pesquisa");
  return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
}

module.exports = { rowsToCsv, rowsToExcelBuffer, CSV_COLUMNS };
