const { MARCAS_LABELS } = require("./constants");

function countByField(rows, field) {
  const counts = {};
  for (const row of rows) {
    const value = row[field];
    if (!value) continue;
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function countArrayField(rows, field) {
  const counts = {};
  for (const row of rows) {
    const values = row[field];
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      if (!value) continue;
      counts[value] = (counts[value] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function averageField(rows, field) {
  const values = rows.map((r) => Number(r[field])).filter((v) => !Number.isNaN(v) && v > 0);
  if (!values.length) return 0;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
}

function marcaLabel(id) {
  return MARCAS_LABELS[id] || id || "Não informado";
}

function stripAccents(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeOpenText(value) {
  return stripAccents(String(value || "").toLowerCase())
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const FALTA_THEMES = [
  {
    id: "preco",
    label: "Preço mais acessível",
    keywords: ["preco", "barato", "barata", "custo", "caro", "acessivel", "valor", "desconto", "mais barato"],
  },
  {
    id: "disponibilidade",
    label: "Maior disponibilidade / estoque",
    keywords: ["disponib", "estoque", "falta na farmacia", "encontrar", "desabastec", "em falta", "conseguir comprar"],
  },
  {
    id: "qualidade",
    label: "Mais qualidade e procedência",
    keywords: ["qualidade", "procedencia", "confiavel", "pureza", "seguranca do produto", "certific"],
  },
  {
    id: "informacao",
    label: "Mais informação e orientação",
    keywords: ["informac", "orientac", "educac", "clareza", "conteudo", "duvida", "explic"],
  },
  {
    id: "regulamentacao",
    label: "Regulamentação / fiscalização",
    keywords: ["anvisa", "regulament", "fiscaliz", "legaliz", "legislac", "controle"],
  },
  {
    id: "manipulacao",
    label: "Melhor oferta de manipulados",
    keywords: ["manipul", "farmacia de manipulacao", "composto"],
  },
  {
    id: "acompanhamento",
    label: "Mais acompanhamento profissional",
    keywords: ["acompanhamento", "medico", "nutri", "profissional", "suporte clinico"],
  },
  {
    id: "efeitos",
    label: "Menos efeitos / suporte a efeitos",
    keywords: ["efeito colateral", "efeitos", "nausea", "vomito", "incomodo"],
  },
  {
    id: "opcoes",
    label: "Mais opções de marcas/doses",
    keywords: ["mais opcoes", "variedade", "mais marcas", "dose", "dosagem", "apresentacao"],
  },
  {
    id: "acesso",
    label: "Mais acesso (SUS/planos)",
    keywords: ["sus", "plano de saude", "convenio", "acesso", "cobertura"],
  },
];

function countFaltaMercadoThemes(rows, limit = 5) {
  const texts = rows
    .map((r) => r.falta_mercado)
    .filter((t) => typeof t === "string" && t.trim().length > 2);

  const counts = {};
  const examples = {};

  for (const raw of texts) {
    const normalized = normalizeOpenText(raw);
    if (!normalized) continue;

    for (const theme of FALTA_THEMES) {
      const matched = theme.keywords.some((keyword) => normalized.includes(keyword));
      if (!matched) continue;
      counts[theme.id] = (counts[theme.id] || 0) + 1;
      if (!examples[theme.id]) examples[theme.id] = raw.trim();
    }
  }

  const phraseCounts = {};
  for (const raw of texts) {
    const key = normalizeOpenText(raw).slice(0, 120);
    if (key.length < 8) continue;
    if (!phraseCounts[key]) phraseCounts[key] = { name: raw.trim().slice(0, 90), total: 0 };
    phraseCounts[key].total += 1;
  }

  const themeRanking = FALTA_THEMES.map((theme) => ({
    name: theme.label,
    total: counts[theme.id] || 0,
    exemplo: examples[theme.id] || null,
  }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const repeatedPhrases = Object.values(phraseCounts)
    .filter((item) => item.total >= 2)
    .sort((a, b) => b.total - a.total);

  const ranking = [...themeRanking];
  for (const phrase of repeatedPhrases) {
    if (ranking.length >= limit) break;
    const already = ranking.some(
      (item) => normalizeOpenText(item.name) === normalizeOpenText(phrase.name)
    );
    if (already) continue;
    ranking.push({
      name: phrase.name,
      total: phrase.total,
      exemplo: phrase.name,
    });
  }

  return {
    totalRespostas: texts.length,
    top: ranking.slice(0, limit),
  };
}

function extractInfluencerNames(raw) {
  if (!raw || typeof raw !== "string") return [];

  return raw
    .split(/[,;/|]+|\se\s+|\s&\s+|\n+/i)
    .map((part) =>
      part
        .replace(/@/g, "")
        .replace(/\b(dr\.?|dra\.?|doutor|doutora)\b/gi, "")
        .replace(/[()[\]{}]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((name) => {
      if (!name) return false;
      if (name.length < 2 || name.length > 60) return false;
      const normalized = normalizeOpenText(name);
      if (["nao", "nenhum", "nenhuma", "ns", "n/a", "na", "nao acompanho", "ninguem"].includes(normalized)) {
        return false;
      }
      if (name.split(" ").length > 6) return false;
      return /[a-zA-ZÀ-ÿ]/.test(name);
    });
}

function countTopInfluenciadores(rows, limit = 10) {
  const counts = {};
  const displayNames = {};

  for (const row of rows) {
    const names = extractInfluencerNames(row.influenciadores);
    const seenInRow = new Set();

    for (const name of names) {
      const key = normalizeOpenText(name);
      if (!key || seenInRow.has(key)) continue;
      seenInRow.add(key);
      counts[key] = (counts[key] || 0) + 1;
      if (!displayNames[key] || name.length < displayNames[key].length) {
        displayNames[key] = name;
      }
    }
  }

  const top = Object.entries(counts)
    .map(([key, total]) => ({
      name: displayNames[key],
      total,
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit);

  return {
    totalRespostas: rows.filter((r) => typeof r.influenciadores === "string" && r.influenciadores.trim()).length,
    top,
  };
}

function generateInsights(rows) {
  const insights = [];
  const total = rows.length;

  if (total === 0) {
    return ["Ainda não há respostas suficientes para gerar insights."];
  }

  const utilizaram = rows.filter((r) => r.utilizou_tirzepatida === true).length;
  const naoUtilizaram = rows.filter((r) => r.utilizou_tirzepatida === false).length;

  if (utilizaram > 0) {
    insights.push(
      `${((utilizaram / total) * 100).toFixed(1)}% dos respondentes já utilizaram tirzepatida (${utilizaram} de ${total}).`
    );
  }

  if (naoUtilizaram > 0) {
    const pretende = rows.filter((r) => r.pretende_utilizar === "Sim" || r.pretende_utilizar === "Talvez").length;
    if (pretende > 0) {
      insights.push(
        `Entre quem nunca usou, ${((pretende / naoUtilizaram) * 100).toFixed(1)}% pretende ou considera usar no futuro.`
      );
    }
  }

  const marcas = countByField(rows, "marca_atual");
  if (marcas.length > 0) {
    const top = marcas[0];
    insights.push(
      `Marca mais utilizada atualmente: ${marcaLabel(top.name)} (${top.total} respondentes, ${((top.total / utilizaram) * 100 || 0).toFixed(1)}% dos usuários).`
    );
  }

  const confianca = countByField(rows, "melhor_marca");
  if (confianca.length > 0) {
    insights.push(`Marca considerada melhor: ${marcaLabel(confianca[0].name)} (${confianca[0].total} menções).`);
  }

  const custoBeneficio = countByField(rows, "melhor_custo_beneficio");
  if (custoBeneficio.length > 0) {
    insights.push(
      `Melhor custo-benefício: ${marcaLabel(custoBeneficio[0].name)} (${custoBeneficio[0].total} menções).`
    );
  }

  const gastos = countByField(rows, "gasto_mensal");
  if (gastos.length > 0) {
    insights.push(`Faixa de gasto mensal mais comum: ${gastos[0].name} (${gastos[0].total} respondentes).`);
  }

  const precoJusto = countByField(rows, "preco_justo");
  if (precoJusto.length > 0) {
    insights.push(`Preço considerado justo por caixa: ${precoJusto[0].name} (${precoJusto[0].total} menções).`);
  }

  const satisfacao = averageField(rows, "satisfacao");
  if (satisfacao > 0) {
    insights.push(`Satisfação média com o tratamento: ${satisfacao}/10.`);
  }

  const pesoInicial = averageField(rows, "peso_inicial");
  const pesoAtual = averageField(rows, "peso_atual");
  if (pesoInicial > 0 && pesoAtual > 0) {
    const perda = pesoInicial - pesoAtual;
    insights.push(`Perda média de peso relatada: ${perda.toFixed(1)} kg (de ${pesoInicial} kg para ${pesoAtual} kg).`);
  }

  const efeitos = countArrayField(rows, "efeitos_colaterais");
  const efeitosSemNenhum = efeitos.filter((e) => e.name !== "Nenhum");
  if (efeitosSemNenhum.length > 0) {
    insights.push(`Efeito colateral mais frequente: ${efeitosSemNenhum[0].name} (${efeitosSemNenhum[0].total} relatos).`);
  }

  const acompMedico = rows.filter((r) => r.acompanhamento_medico === true).length;
  if (utilizaram > 0) {
    insights.push(`${((acompMedico / utilizaram) * 100).toFixed(1)}% dos usuários fazem acompanhamento médico.`);
  }

  const canais = countByField(rows, "onde_compra");
  if (canais.length > 0) {
    insights.push(`Principal canal de compra: ${canais[0].name} (${canais[0].total} respondentes).`);
  }

  const fontes = countArrayField(rows, "fontes_informacao");
  if (fontes.length > 0) {
    insights.push(`Principal fonte de informação: ${fontes[0].name} (${fontes[0].total} menções).`);
  }

  const estados = countByField(rows, "estado");
  if (estados.length > 0) {
    insights.push(`Estado com mais respostas: ${estados[0].name} (${estados[0].total} respondentes).`);
  }

  return insights.slice(0, 12);
}

function buildDashboardData(rows) {
  const utilizadores = rows.filter((r) => r.utilizou_tirzepatida === true);
  const naoUtilizadores = rows.filter((r) => r.utilizou_tirzepatida === false);

  const fatoresRanking = {};
  for (const row of utilizadores) {
    const fatores = row.fatores_compra;
    if (!Array.isArray(fatores)) continue;
    fatores.forEach((fator, index) => {
      if (!fator) return;
      if (!fatoresRanking[fator]) fatoresRanking[fator] = { name: fator, total: 0, score: 0 };
      fatoresRanking[fator].total += 1;
      fatoresRanking[fator].score += fatores.length - index;
    });
  }

  const fatoresCompra = Object.values(fatoresRanking)
    .map((f) => ({ ...f, media: Number((f.score / f.total).toFixed(2)) }))
    .sort((a, b) => b.media - a.media);

  return {
    total: rows.length,
    utilizadores: utilizadores.length,
    naoUtilizadoresTotal: naoUtilizadores.length,
    demografia: {
      idade: countByField(rows, "idade"),
      genero: countByField(rows, "genero"),
      estado: countByField(rows, "estado"),
      escolaridade: countByField(rows, "escolaridade"),
      faixaRenda: countByField(rows, "faixa_renda"),
    },
    marcas: {
      atual: countByField(utilizadores, "marca_atual").map((m) => ({ ...m, name: marcaLabel(m.name) })),
      utilizadas: countArrayField(utilizadores, "marcas_utilizadas").map((m) => ({ ...m, name: marcaLabel(m.name) })),
      melhor: countByField(utilizadores, "melhor_marca").map((m) => ({ ...m, name: marcaLabel(m.name) })),
      custoBeneficio: countByField(utilizadores, "melhor_custo_beneficio").map((m) => ({ ...m, name: marcaLabel(m.name) })),
      melhoresResultados: countByField(utilizadores, "melhores_resultados").map((m) => ({ ...m, name: marcaLabel(m.name) })),
    },
    compra: {
      ondeCompra: countByField(utilizadores, "onde_compra"),
      comoConheceu: countByField(utilizadores, "como_conheceu"),
      gastoMensal: countByField(utilizadores, "gasto_mensal"),
      precoJusto: countByField(rows, "preco_justo"),
      precoJustoNaoUsuario: countByField(naoUtilizadores, "preco_justo_nao_usuario"),
      fatoresCompra,
    },
    saude: {
      satisfacaoMedia: averageField(utilizadores, "satisfacao"),
      expectativa: countByField(utilizadores, "expectativa_atingida"),
      acompanhamentoMedico: {
        sim: utilizadores.filter((r) => r.acompanhamento_medico === true).length,
        nao: utilizadores.filter((r) => r.acompanhamento_medico === false).length,
      },
      acompanhamentoNutricional: {
        sim: utilizadores.filter((r) => r.acompanhamento_nutricional === true).length,
        nao: utilizadores.filter((r) => r.acompanhamento_nutricional === false).length,
      },
      atividadeFisica: countByField(utilizadores, "atividade_fisica"),
      suplementacao: countArrayField(utilizadores, "suplementacao"),
      pesoInicialMedio: averageField(utilizadores, "peso_inicial"),
      pesoAtualMedio: averageField(utilizadores, "peso_atual"),
      metaPesoMedio: averageField(utilizadores, "meta_peso"),
    },
    efeitosColaterais: {
      lista: countArrayField(utilizadores, "efeitos_colaterais"),
      maisIncomodo: countByField(utilizadores, "efeito_mais_incomodo"),
      interrompeu: {
        sim: utilizadores.filter((r) => r.interrompeu_uso === true).length,
        nao: utilizadores.filter((r) => r.interrompeu_uso === false).length,
      },
    },
    conteudo: {
      fontes: countArrayField(rows, "fontes_informacao"),
      tipoConteudo: countByField(rows, "tipo_conteudo"),
      acompanhaInfluenciadores: {
        sim: rows.filter((r) => r.acompanha_influenciadores === true).length,
        nao: rows.filter((r) => r.acompanha_influenciadores === false).length,
      },
    },
    naoUtilizadores: {
      pretendeUtilizar: countByField(naoUtilizadores, "pretende_utilizar"),
      motivoNaoUtilizar: countByField(naoUtilizadores, "motivo_nao_utilizar"),
    },
    topFaltaMercado: countFaltaMercadoThemes(rows, 5),
    topInfluenciadores: countTopInfluenciadores(rows, 10),
    respostasAbertas: rows
      .filter((r) => r.falta_mercado || r.influenciadores || r.efeito_interrupcao || r.efeito_outro)
      .map((r) => ({
        id: r.id,
        faltaMercado: r.falta_mercado,
        influenciadores: r.influenciadores,
        efeitoInterrupcao: r.efeito_interrupcao,
        efeitoOutro: r.efeito_outro,
        createdAt: r.created_at,
      }))
      .slice(0, 50),
    insights: generateInsights(rows),
    filtros: {
      estados: [...new Set(rows.map((r) => r.estado).filter(Boolean))].sort(),
      marcas: [...new Set(rows.map((r) => r.marca_atual).filter(Boolean))].map((m) => ({
        id: m,
        label: marcaLabel(m),
      })),
    },
  };
}

module.exports = { buildDashboardData, generateInsights, countByField, countArrayField };
