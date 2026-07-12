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
