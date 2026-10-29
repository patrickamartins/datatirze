const { MARCAS_E2, FARMACIAS_E2, OPCOES_E2, PEPTIDEOS_E2 } = require("./editions");

function labelOf(list, id) {
  if (!id) return "Não informado";
  const found = list.find((item) => item.id === id);
  return found ? found.label : String(id);
}

function countBy(rows, getter) {
  const counts = {};
  for (const row of rows) {
    const value = getter(row);
    if (value == null || value === "") continue;
    const key = String(value);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function countArray(rows, getter) {
  const counts = {};
  for (const row of rows) {
    const values = getter(row);
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      if (value == null || value === "") continue;
      const key = String(value);
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function answers(row) {
  const raw = row.respostas_completas;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

function buildEdition2Dashboard(rows) {
  const total = rows.length;
  const bySituacao = countBy(rows, (r) => r.situacao_uso || answers(r).situacaoUso);

  const farmaciaConfianca = countBy(rows, (r) => r.farmacia_confianca || answers(r).farmaciaConfianca)
    .map((item) => ({ ...item, name: labelOf(FARMACIAS_E2, item.name) }))
    .slice(0, 15);

  const farmaciaUltima = countBy(rows, (r) => r.farmacia_ultima || answers(r).farmaciaUltima)
    .map((item) => ({ ...item, name: labelOf(FARMACIAS_E2, item.name) }))
    .slice(0, 15);

  const peptideosConheco = countArray(rows, (r) => answers(r).peptideosConheco).map((item) => ({
    ...item,
    name: labelOf(PEPTIDEOS_E2, item.name),
  }));
  const peptideosUtilizei = countArray(rows, (r) => answers(r).peptideosUtilizei).map((item) => ({
    ...item,
    name: labelOf(PEPTIDEOS_E2, item.name),
  }));

  const influenciadores = {};
  for (const row of rows) {
    const name = String(answers(row).influenciadorNome || "").trim();
    if (!name || name.length < 2) continue;
    const key = name.toLowerCase();
    if (!influenciadores[key]) influenciadores[key] = { name, total: 0 };
    influenciadores[key].total += 1;
  }

  return {
    edition: 2,
    total,
    situacaoUso: bySituacao.map((item) => ({
      ...item,
      name: labelOf(OPCOES_E2.situacaoUso, item.name),
    })),
    demografia: {
      idade: countBy(rows, (r) => r.idade).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.idade, item.name),
      })),
      genero: countBy(rows, (r) => r.genero).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.genero, item.name),
      })),
      estado: countBy(rows, (r) => r.estado),
      faixaRenda: countBy(rows, (r) => r.faixa_renda).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.faixaRenda, item.name),
      })),
    },
    marcas: {
      atual: countBy(rows, (r) => r.marca_atual).map((item) => ({
        ...item,
        name: labelOf(MARCAS_E2, item.name),
      })),
      utilizadas: countArray(rows, (r) => {
        const a = answers(r).marcasUtilizadas;
        return Array.isArray(a) ? a : r.marcas_utilizadas;
      }).map((item) => ({ ...item, name: labelOf(MARCAS_E2, item.name) })),
      confiavel: countBy(rows, (r) => answers(r).marcaConfiavel).map((item) => ({
        ...item,
        name: labelOf([...MARCAS_E2, ...OPCOES_E2.confiancaMarcaExtra], item.name),
      })),
      mudou: countBy(rows, (r) => answers(r).mudouMarca).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.mudouMarca, item.name),
      })),
      motivoMudanca: countBy(rows, (r) => answers(r).motivoMudanca).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.motivoMudanca, item.name),
      })),
    },
    farmacias: {
      confianca: farmaciaConfianca,
      ultimaCompra: farmaciaUltima,
      tipoFornecedor: countBy(rows, (r) => r.tipo_fornecedor || answers(r).tipoFornecedor).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.tipoFornecedor, item.name),
      })),
      problemas: countArray(rows, (r) => answers(r).problemasCompra).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.problemasCompra, item.name),
      })),
    },
    compra: {
      gastoMensal: countBy(rows, (r) => r.gasto_mensal).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.gastoMensal, item.name),
      })),
      precoJusto: countBy(rows, (r) => r.preco_justo).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.gastoMensal, item.name),
      })),
      fatores: countArray(rows, (r) => {
        const a = answers(r).fatoresCompra;
        return Array.isArray(a) ? a : null;
      }).map((item) => ({ ...item, name: labelOf(OPCOES_E2.fatoresCompra, item.name) })),
    },
    saude: {
      objetivo: countBy(rows, (r) => answers(r).objetivo).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.objetivo, item.name),
      })),
      expectativa: countBy(rows, (r) => r.expectativa_atingida || answers(r).expectativa).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.expectativa, item.name),
      })),
      efeitos: countArray(rows, (r) => {
        const a = answers(r).efeitosColaterais;
        return Array.isArray(a) ? a : r.efeitos_colaterais;
      }).map((item) => ({ ...item, name: labelOf(OPCOES_E2.efeitos, item.name) })),
      prescricao: countBy(rows, (r) => answers(r).prescricaoMedica).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.simNaoPrefiro, item.name),
      })),
      acompanhamento: countBy(rows, (r) => answers(r).acompanhamentoMedico).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.simNaoPrefiro, item.name),
      })),
      recuperouPeso: countBy(rows, (r) => answers(r).recuperouPeso).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.recuperouPeso, item.name),
      })),
    },
    peptideos: {
      conheceRetatrutida: countBy(rows, (r) => answers(r).conheceRetatrutida).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.conheceRetatrutida, item.name),
      })),
      usouRetatrutida: countBy(rows, (r) => answers(r).usouRetatrutida).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.usouRetatrutida, item.name),
      })),
      conheco: peptideosConheco,
      utilizei: peptideosUtilizei,
      preocupacao: countBy(rows, (r) => answers(r).preocupacaoNovaSubstancia).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.preocupacao, item.name),
      })),
    },
    marketing: {
      fontes: countArray(rows, (r) => {
        const a = answers(r).fontesInformacao;
        return Array.isArray(a) ? a : r.fontes_informacao;
      }).map((item) => ({ ...item, name: labelOf(OPCOES_E2.fontes, item.name) })),
      tipoConteudo: countBy(rows, (r) => r.tipo_conteudo || answers(r).tipoConteudo).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.tipoConteudo, item.name),
      })),
      influencia: countBy(rows, (r) => answers(r).influenciaInfluenciador).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.influenciaCompra, item.name),
      })),
      influenciadores: Object.values(influenciadores)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
      grupos: countBy(rows, (r) => answers(r).participaGrupos).map((item) => ({
        ...item,
        name: labelOf(OPCOES_E2.grupos, item.name),
      })),
    },
  };
}

function buildEditionComparison(rowsE1, rowsE2) {
  function dist(rows, field) {
    const counts = countBy(rows, (r) => r[field]);
    const total = rows.length || 1;
    return counts.map((item) => ({
      name: item.name,
      e1: 0,
      e2: 0,
      total: item.total,
      percent: Math.round((item.total / total) * 1000) / 10,
    }));
  }

  function mergeField(field) {
    const map = {};
    const t1 = rowsE1.length || 1;
    const t2 = rowsE2.length || 1;
    for (const item of countBy(rowsE1, (r) => r[field])) {
      map[item.name] = { name: item.name, e1: item.total, e2: 0 };
    }
    for (const item of countBy(rowsE2, (r) => r[field])) {
      if (!map[item.name]) map[item.name] = { name: item.name, e1: 0, e2: 0 };
      map[item.name].e2 = item.total;
    }
    return Object.values(map)
      .map((item) => {
        const p1 = Math.round((item.e1 / t1) * 1000) / 10;
        const p2 = Math.round((item.e2 / t2) * 1000) / 10;
        return {
          name: item.name,
          e1: item.e1,
          e2: item.e2,
          p1,
          p2,
          deltaPp: Math.round((p2 - p1) * 10) / 10,
        };
      })
      .sort((a, b) => b.e2 + b.e1 - (a.e2 + a.e1));
  }

  return {
    edition: "compare",
    totais: { e1: rowsE1.length, e2: rowsE2.length },
    idade: mergeField("idade"),
    genero: mergeField("genero"),
    estado: mergeField("estado").slice(0, 15),
    faixaRenda: mergeField("faixa_renda"),
    marcaAtual: mergeField("marca_atual"),
    gastoMensal: mergeField("gasto_mensal"),
    precoJusto: mergeField("preco_justo"),
    tipoConteudo: mergeField("tipo_conteudo"),
    _distHelper: dist,
  };
}

module.exports = { buildEdition2Dashboard, buildEditionComparison, answers };
