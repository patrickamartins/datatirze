export interface Marca {
  id: string;
  label: string;
  fabricante: string;
}

export interface PesquisaConfig {
  marcas: Marca[];
  doses: string[];
  estados: string[];
  opcoes: Record<string, string[]>;
  totalSteps: number;
}

export interface PesquisaRespostas {
  email?: string;
  idade?: string;
  genero?: string;
  estado?: string;
  cidade?: string;
  escolaridade?: string;
  faixaRenda?: string;
  utilizouTirzepatida?: boolean;
  pretendeUtilizar?: string;
  motivoNaoUtilizar?: string;
  precoJustoNaoUsuario?: string;
  tempoUso?: string;
  marcaAtual?: string;
  marcasUtilizadas?: string[];
  melhorMarca?: string;
  melhorCustoBeneficio?: string;
  melhoresResultados?: string;
  menorResultado?: string;
  ondeCompra?: string;
  comoConheceu?: string;
  gastoMensal?: string;
  precoJusto?: string;
  fatoresCompra?: string[];
  pesoInicial?: number;
  pesoAtual?: number;
  metaPeso?: number;
  satisfacao?: number;
  expectativaAtingida?: string;
  acompanhamentoMedico?: boolean;
  acompanhamentoNutricional?: boolean;
  atividadeFisica?: string;
  suplementacao?: string[];
  efeitosColaterais?: string[];
  efeitoOutro?: string;
  efeitoMaisIncomodo?: string;
  interrompeuUso?: boolean;
  efeitoInterrupcao?: string;
  fontesInformacao?: string[];
  acompanhaInfluenciadores?: boolean;
  influenciadores?: string;
  tipoConteudo?: string;
  faltaMercado?: string;
}

export interface SessaoResponse {
  sessionToken: string;
  currentStep: number;
  respostas: PesquisaRespostas;
  status: string;
}

export interface ChartItem {
  name: string;
  total: number;
}

export interface DashboardData {
  total: number;
  utilizadores: number;
  naoUtilizadoresTotal: number;
  resumo?: {
    respostasConcluidas: number;
    sessoesEmAndamento: number;
    filtradas: number;
  };
  demografia: {
    idade: ChartItem[];
    genero: ChartItem[];
    estado: ChartItem[];
    escolaridade: ChartItem[];
    faixaRenda: ChartItem[];
  };
  marcas: {
    atual: ChartItem[];
    utilizadas: ChartItem[];
    melhor: ChartItem[];
    custoBeneficio: ChartItem[];
    melhoresResultados: ChartItem[];
  };
  compra: {
    ondeCompra: ChartItem[];
    comoConheceu: ChartItem[];
    gastoMensal: ChartItem[];
    precoJusto: ChartItem[];
    precoJustoNaoUsuario: ChartItem[];
    fatoresCompra: Array<ChartItem & { media: number }>;
  };
  saude: {
    satisfacaoMedia: number;
    expectativa: ChartItem[];
    acompanhamentoMedico: { sim: number; nao: number };
    acompanhamentoNutricional: { sim: number; nao: number };
    atividadeFisica: ChartItem[];
    suplementacao: ChartItem[];
    pesoInicialMedio: number;
    pesoAtualMedio: number;
    metaPesoMedio: number;
  };
  efeitosColaterais: {
    lista: ChartItem[];
    maisIncomodo: ChartItem[];
    interrompeu: { sim: number; nao: number };
  };
  conteudo: {
    fontes: ChartItem[];
    tipoConteudo: ChartItem[];
    acompanhaInfluenciadores: { sim: number; nao: number };
  };
  naoUtilizadores: {
    pretendeUtilizar: ChartItem[];
    motivoNaoUtilizar: ChartItem[];
  };
  respostasAbertas: Array<{
    id: number;
    faltaMercado?: string;
    influenciadores?: string;
    efeitoInterrupcao?: string;
    efeitoOutro?: string;
    createdAt: string;
  }>;
  insights: string[];
  filtros: {
    estados: string[];
    marcas: Array<{ id: string; label: string }>;
  };
}
