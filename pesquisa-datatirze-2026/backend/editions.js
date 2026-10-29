/** Versionamento e catálogos da Pesquisa Nacional DataTirze */

const EDICAO_ATIVA = 2;

const EDICOES = [
  {
    id: 1,
    slug: "2026-queridinhas-v1",
    title: "1ª Pesquisa Nacional — Queridinhas",
    status: "closed",
    year: 2026,
  },
  {
    id: 2,
    slug: "2026-queridinhas-v2",
    title: "2ª Pesquisa Nacional — Queridinhas",
    status: "open",
    year: 2026,
  },
];

const MARCAS_E2 = [
  { id: "tg", label: "TG" },
  { id: "tirzec", label: "Tirzec" },
  { id: "lipoless", label: "Lipoless" },
  { id: "lipoland", label: "Lipoland" },
  { id: "tirzedral", label: "Tirzedral" },
  { id: "gluconex", label: "Gluconex" },
  { id: "mounjaro", label: "Mounjaro" },
  { id: "slimex", label: "Slimex" },
  { id: "tnl", label: "TNL" },
  { id: "t36", label: "T36" },
  { id: "manipulada", label: "Manipulada" },
  { id: "outra", label: "Outra" },
  { id: "nao_sei", label: "Não sei informar", pinnedEnd: true },
];

const FARMACIAS_E2 = [
  { id: "santa_rita_cde", label: "Santa Rita (Ciudad del Este)", pais: "PY", cidade: "Ciudad del Este" },
  { id: "santa_rita_salud_salto", label: "Santa Rita Salud (Salto del Guairá)", pais: "PY", cidade: "Salto del Guairá" },
  { id: "columbia", label: "Columbia", pais: "PY", cidade: null },
  { id: "el_killo", label: "El Killo", pais: "PY", cidade: null },
  { id: "farmacia_brasil", label: "Farmácia Brasil", pais: "PY", cidade: null },
  { id: "farmacia_sao_paulo", label: "Farmácia São Paulo", pais: "PY", cidade: null },
  { id: "farmacia_do_sul", label: "Farmácia do Sul", pais: "PY", cidade: null },
  { id: "next_farma", label: "Next Farma", pais: "PY", cidade: null },
  { id: "farma_10", label: "Farma 10", pais: "PY", cidade: null },
  { id: "cell_pharma", label: "Cell Pharma", pais: "PY", cidade: null },
  { id: "pink_pharma", label: "Pink Pharma", pais: "PY", cidade: null },
  { id: "toku_pharma", label: "Toku Pharma", pais: "PY", cidade: null },
  { id: "shopping_china_farma", label: "Shopping China Farma", pais: "PY", cidade: null },
  { id: "outros", label: "Outros", pinnedEnd: true },
  { id: "nao_conheco", label: "Não conheço nenhuma o suficiente para avaliar", pinnedEnd: true },
];

const PEPTIDEOS_E2 = [
  { id: "ghk_cu", label: "GHK-Cu" },
  { id: "bpc_157", label: "BPC-157" },
  { id: "tb_500", label: "TB-500" },
  { id: "tesamorelina", label: "Tesamorelina" },
  { id: "cjc_1295", label: "CJC-1295" },
  { id: "ipamorelina", label: "Ipamorelina" },
  { id: "aod_9604", label: "AOD-9604" },
  { id: "outros", label: "Outros", pinnedEnd: true },
  { id: "nenhum", label: "Nenhum", pinnedEnd: true, exclusive: true },
];

const OPCOES_E2 = {
  idade: [
    { id: "18-24", label: "18 a 24 anos" },
    { id: "25-34", label: "25 a 34 anos" },
    { id: "35-44", label: "35 a 44 anos" },
    { id: "45-54", label: "45 a 54 anos" },
    { id: "55-64", label: "55 a 64 anos" },
    { id: "65+", label: "65 anos ou mais" },
  ],
  genero: [
    { id: "feminino", label: "Feminino" },
    { id: "masculino", label: "Masculino" },
    { id: "outro", label: "Outro" },
    { id: "prefiro_nao", label: "Prefiro não informar", pinnedEnd: true },
  ],
  faixaRenda: [
    { id: "ate_3000", label: "Até R$ 3.000" },
    { id: "3001_5000", label: "R$ 3.001 a R$ 5.000" },
    { id: "5001_10000", label: "R$ 5.001 a R$ 10.000" },
    { id: "10001_20000", label: "R$ 10.001 a R$ 20.000" },
    { id: "20001_40000", label: "R$ 20.001 a R$ 40.000" },
    { id: "acima_40000", label: "Acima de R$ 40.000" },
    { id: "prefiro_nao", label: "Prefiro não informar", pinnedEnd: true },
  ],
  situacaoUso: [
    { id: "atual", label: "Utilizo atualmente" },
    { id: "ex", label: "Já utilizei, mas interrompi" },
    { id: "interesse", label: "Nunca utilizei, mas tenho interesse" },
    { id: "sem_interesse", label: "Nunca utilizei e não tenho interesse" },
  ],
  confiancaMarcaExtra: [
    { id: "nenhuma", label: "Nenhuma", pinnedEnd: true },
    { id: "nao_conheco", label: "Não conheço o suficiente para avaliar", pinnedEnd: true },
  ],
  mudouMarca: [
    { id: "sim", label: "Sim" },
    { id: "nao", label: "Não" },
    { id: "nao_utilizava", label: "Não utilizava nesse período" },
  ],
  motivoMudanca: [
    { id: "preco", label: "Preço" },
    { id: "resultados", label: "Resultados percebidos" },
    { id: "efeitos", label: "Efeitos colaterais" },
    { id: "confianca", label: "Confiança na marca" },
    { id: "disponibilidade", label: "Disponibilidade" },
    { id: "recomendacao_medica", label: "Recomendação médica" },
    { id: "outro", label: "Outro", pinnedEnd: true },
  ],
  tipoFornecedor: [
    { id: "farmacia_py", label: "Farmácia paraguaia" },
    { id: "farmacia_br", label: "Farmácia brasileira" },
    { id: "revendedor", label: "Revendedor independente" },
    { id: "loja_online", label: "Loja online" },
    { id: "outro", label: "Outro", pinnedEnd: true },
    { id: "nao_sei", label: "Não sei informar", pinnedEnd: true },
  ],
  gastoMensal: [
    { id: "ate_300", label: "Até R$ 300" },
    { id: "301_500", label: "R$ 301 a R$ 500" },
    { id: "501_800", label: "R$ 501 a R$ 800" },
    { id: "801_1200", label: "R$ 801 a R$ 1.200" },
    { id: "1201_2000", label: "R$ 1.201 a R$ 2.000" },
    { id: "acima_2000", label: "Acima de R$ 2.000" },
    { id: "prefiro_nao", label: "Prefiro não informar", pinnedEnd: true },
  ],
  fatoresCompra: [
    { id: "preco", label: "Preço" },
    { id: "procedencia", label: "Procedência e autenticidade" },
    { id: "prazo", label: "Prazo de entrega" },
    { id: "garantia", label: "Garantia e suporte" },
    { id: "reputacao", label: "Reputação do fornecedor" },
    { id: "atendimento", label: "Atendimento" },
    { id: "resultados", label: "Resultados percebidos" },
    { id: "pagamento", label: "Facilidade de pagamento" },
  ],
  problemasCompra: [
    { id: "nunca", label: "Nunca tive problemas", exclusive: true, pinnedEnd: false },
    { id: "atraso", label: "Atraso na entrega" },
    { id: "nao_entregue", label: "Produto não entregue" },
    { id: "falsificacao", label: "Suspeita de falsificação" },
    { id: "conservacao", label: "Conservação ou embalagem inadequada" },
    { id: "atendimento", label: "Atendimento insatisfatório" },
    { id: "outro", label: "Outro", pinnedEnd: true },
  ],
  objetivo: [
    { id: "emagrecimento", label: "Emagrecimento" },
    { id: "manutencao", label: "Manutenção do peso" },
    { id: "metabolico", label: "Controle metabólico" },
    { id: "outro", label: "Outro", pinnedEnd: true },
    { id: "prefiro_nao", label: "Prefiro não informar", pinnedEnd: true },
  ],
  expectativa: [
    { id: "sim", label: "Sim" },
    { id: "parcialmente", label: "Parcialmente" },
    { id: "nao", label: "Não" },
    { id: "cedo", label: "Ainda é cedo para avaliar" },
  ],
  efeitos: [
    { id: "constipacao", label: "Constipação" },
    { id: "queda_cabelo", label: "Queda de cabelo" },
    { id: "nausea", label: "Náusea" },
    { id: "dor_cabeca", label: "Dor de cabeça" },
    { id: "azia", label: "Azia" },
    { id: "diarreia", label: "Diarreia" },
    { id: "refluxo", label: "Refluxo" },
    { id: "fadiga", label: "Fadiga" },
    { id: "tontura", label: "Tontura" },
    { id: "nenhum", label: "Nenhum", exclusive: true, pinnedEnd: true },
    { id: "outro", label: "Outro", pinnedEnd: true },
    { id: "prefiro_nao", label: "Prefiro não informar", exclusive: true, pinnedEnd: true },
  ],
  simNaoPrefiro: [
    { id: "sim", label: "Sim" },
    { id: "nao", label: "Não" },
    { id: "prefiro_nao", label: "Prefiro não informar", pinnedEnd: true },
  ],
  recuperouPeso: [
    { id: "sim", label: "Sim" },
    { id: "nao", label: "Não" },
    { id: "nunca_interrompeu", label: "Nunca interrompi" },
    { id: "nao_sei", label: "Não sei informar" },
    { id: "prefiro_nao", label: "Prefiro não informar", pinnedEnd: true },
  ],
  conheceRetatrutida: [
    { id: "conheco", label: "Conheço" },
    { id: "ouvi_pouco", label: "Já ouvi falar, mas conheço pouco" },
    { id: "nunca", label: "Nunca ouvi falar" },
  ],
  usouRetatrutida: [
    { id: "atual", label: "Utilizo atualmente" },
    { id: "ja_usei", label: "Já utilizei" },
    { id: "nunca", label: "Nunca utilizei" },
    { id: "prefiro_nao", label: "Prefiro não informar", pinnedEnd: true },
  ],
  preocupacao: [
    { id: "seguranca", label: "Segurança" },
    { id: "aprovacao", label: "Aprovação regulatória" },
    { id: "longo_prazo", label: "Efeitos de longo prazo" },
    { id: "procedencia", label: "Procedência" },
    { id: "estudos", label: "Falta de estudos" },
    { id: "preco", label: "Preço" },
    { id: "sem_opiniao", label: "Não tenho opinião formada", pinnedEnd: true },
  ],
  fontes: [
    { id: "tiktok", label: "TikTok" },
    { id: "instagram", label: "Instagram" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "google", label: "Google" },
    { id: "youtube", label: "YouTube" },
    { id: "facebook", label: "Facebook" },
    { id: "telegram", label: "Telegram" },
    { id: "profissionais", label: "Profissionais de saúde" },
    { id: "outros", label: "Outros", pinnedEnd: true },
    { id: "nao_busco", label: "Não busco informações", exclusive: true, pinnedEnd: true },
  ],
  tipoConteudo: [
    { id: "resultados", label: "Resultados reais" },
    { id: "estudos", label: "Estudos científicos" },
    { id: "comparativos", label: "Comparativos de marcas" },
    { id: "promocoes", label: "Promoções e preços" },
    { id: "alimentacao", label: "Alimentação e hábitos" },
    { id: "noticias", label: "Notícias do mercado" },
    { id: "treinos", label: "Treinos e atividade física" },
    { id: "seguranca", label: "Segurança e efeitos colaterais" },
  ],
  influenciaCompra: [
    { id: "ja_comprei", label: "Sim, já comprei" },
    { id: "considerei", label: "Já considerei comprar" },
    { id: "nao", label: "Não" },
  ],
  grupos: [
    { id: "whatsapp", label: "WhatsApp" },
    { id: "telegram", label: "Telegram" },
    { id: "ambos", label: "Ambos" },
    { id: "nenhum", label: "Nenhum" },
  ],
};

const STEP_META_E2 = [
  { step: 1, key: "perfil", label: "Perfil" },
  { step: 2, key: "experiencia", label: "Experiência e marcas" },
  { step: 3, key: "farmacias", label: "Farmácias e compras" },
  { step: 4, key: "saude", label: "Saúde e resultados" },
  { step: 5, key: "peptideos", label: "Retatrutida e peptídeos" },
  { step: 6, key: "marketing", label: "Marketing e comunidade" },
  { step: 7, key: "conclusao", label: "Conclusão" },
];

function hasUsedQueridinhas(situacao) {
  return situacao === "atual" || situacao === "ex";
}

function getVisibleStepsE2(situacao) {
  const steps = [1, 2];
  if (situacao === "atual" || situacao === "ex" || situacao === "interesse") {
    steps.push(3);
  }
  if (hasUsedQueridinhas(situacao)) {
    steps.push(4);
  }
  if (situacao) {
    steps.push(5, 6);
  }
  return steps;
}

function progressMessage(percent) {
  if (percent >= 100) return "Pesquisa concluída! Obrigado por participar.";
  if (percent >= 95) return "Estamos quase terminando!";
  if (percent >= 75) return "Falta pouco!";
  if (percent >= 50) return "Já passamos da metade!";
  if (percent >= 25) return "Você está indo muito bem!";
  return "Vamos começar!";
}

/** Mapeamento de campos comparáveis entre edições (labels normalizados). */
const COMPARABLE_FIELDS = {
  idade: { e1: "idade", e2: "idade" },
  genero: { e1: "genero", e2: "genero" },
  estado: { e1: "estado", e2: "estado" },
  faixaRenda: { e1: "faixa_renda", e2: "faixa_renda" },
  marcaAtual: { e1: "marca_atual", e2: "marca_atual" },
  gastoMensal: { e1: "gasto_mensal", e2: "gasto_mensal" },
  precoJusto: { e1: "preco_justo", e2: "preco_justo" },
  tipoConteudo: { e1: "tipo_conteudo", e2: "tipo_conteudo" },
};

module.exports = {
  EDICAO_ATIVA,
  EDICOES,
  MARCAS_E2,
  FARMACIAS_E2,
  PEPTIDEOS_E2,
  OPCOES_E2,
  STEP_META_E2,
  hasUsedQueridinhas,
  getVisibleStepsE2,
  progressMessage,
  COMPARABLE_FIELDS,
};
