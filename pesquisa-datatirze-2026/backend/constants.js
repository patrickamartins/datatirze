const MARCAS = [
  { id: "tg", label: "TG", fabricante: "Indufar" },
  { id: "lipoless", label: "Lipoless", fabricante: "Éticos" },
  { id: "slimex", label: "Slimex", fabricante: "Éticos" },
  { id: "tirzec", label: "Tirzec", fabricante: "Quimfa" },
  { id: "lipoland", label: "Lipoland", fabricante: "Landerlan" },
  { id: "tirzedral", label: "Tirzedral", fabricante: "Catedral" },
  { id: "t36", label: "T36", fabricante: "Catedral" },
  { id: "gluconex", label: "Gluconex", fabricante: "Lasca" },
];

const DOSES = ["2,5mg", "5mg", "7,5mg", "10mg", "12,5mg", "15mg"];

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const OPCOES = {
  idade: ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
  genero: ["Masculino", "Feminino", "Outro", "Prefiro não informar"],
  escolaridade: ["Fundamental", "Médio", "Superior", "Pós-graduação", "Mestrado ou Doutorado"],
  faixaRenda: [
    "Até R$3.000",
    "R$3.001 a R$5.000",
    "R$5.001 a R$10.000",
    "R$10.001 a R$20.000",
    "R$20.001 a R$40.000",
    "Acima de R$40.000",
  ],
  pretendeUtilizar: ["Sim", "Não", "Talvez"],
  motivoNaoUtilizar: [
    "Preço",
    "Medo de efeitos colaterais",
    "Falta de confiança",
    "Falta de informação",
    "Indicação médica",
    "Outro",
  ],
  precoJusto: [
    "Até R$300",
    "R$300-R$500",
    "R$500-R$800",
    "R$800-R$1.200",
    "Acima de R$1.200",
  ],
  tempoUso: [
    "Menos de 1 mês",
    "1 a 3 meses",
    "3 a 6 meses",
    "6 a 12 meses",
    "Mais de 1 ano",
  ],
  ondeCompra: [
    "Farmácia paraguaia",
    "Revendedor",
    "Loja online",
    "Indicação de amigos",
    "Médico/Consultório",
    "Outro",
  ],
  comoConheceu: [
    "Instagram",
    "TikTok",
    "Google",
    "WhatsApp",
    "Telegram",
    "Indicação",
    "Outro",
  ],
  gastoMensal: [
    "Até R$300",
    "R$300-R$500",
    "R$500-R$800",
    "R$800-R$1.200",
    "R$1.200-R$2.000",
    "Acima de R$2.000",
  ],
  fatoresCompra: [
    "Preço",
    "Prazo de entrega",
    "Procedência",
    "Garantia",
    "Atendimento",
    "Resultados",
    "Reputação",
    "Facilidade de pagamento",
  ],
  expectativaAtingida: ["Sim", "Parcialmente", "Não"],
  atividadeFisica: ["Não", "1-2x semana", "3-4x semana", "5+ vezes"],
  suplementacao: [
    "Whey",
    "Creatina",
    "Multivitamínico",
    "Vitamina D",
    "Ômega 3",
    "Magnésio",
    "Outro",
    "Nenhum",
  ],
  efeitosColaterais: [
    "Náusea",
    "Azia",
    "Refluxo",
    "Constipação",
    "Diarreia",
    "Dor de cabeça",
    "Fadiga",
    "Tontura",
    "Perda excessiva de massa muscular",
    "Queda de cabelo",
    "Nenhum",
    "Outro",
  ],
  fontesInformacao: [
    "Instagram",
    "TikTok",
    "YouTube",
    "Google",
    "Facebook",
    "Telegram",
    "WhatsApp",
  ],
  tipoConteudo: [
    "Antes e depois",
    "Resultados reais",
    "Estudos científicos",
    "Comparativos de marcas",
    "Dicas de alimentação",
    "Treino",
    "Notícias",
    "Promoções",
  ],
};

const TOTAL_STEPS = 9;

const MARCAS_LABELS = Object.fromEntries(MARCAS.map((m) => [m.id, m.label]));

module.exports = {
  MARCAS,
  DOSES,
  ESTADOS_BR,
  OPCOES,
  TOTAL_STEPS,
  MARCAS_LABELS,
};
