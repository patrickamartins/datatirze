import { applyPersistedOrder, ensureOptionOrders, type ShuffleableOption } from "@/lib/shuffle";
import type {
  OpcaoCatalogoE2,
  OpcaoE2,
  PesquisaConfigE2,
  PesquisaRespostasE2,
  SituacaoUsoE2,
  StepMetaE2,
} from "@/types/pesquisa-e2";

export const SESSION_KEY_E2 = "pesquisa_datatirze_e2_session";
export const EDICAO_E2 = 2;

export const STEP_E2 = {
  PERFIL: 1,
  EXPERIENCIA: 2,
  COMPRA: 3,
  SAUDE: 4,
  PEPTIDEOS: 5,
  MARKETING: 6,
  CONCLUSAO: 7,
} as const;

export const LAST_QUESTION_STEP_E2 = STEP_E2.MARKETING;
export const MAX_FATORES_COMPRA = 3;

const STEP_LABELS: Record<number, string> = {
  1: "Seu perfil",
  2: "Experiência",
  3: "Compra e farmácias",
  4: "Saúde e resultados",
  5: "Peptídeos",
  6: "Informação e conteúdo",
  7: "Conclusão",
};

/* ------------------------------------------------------------------ */
/* Etapas aplicáveis e progresso                                       */
/* ------------------------------------------------------------------ */

/** Etapas (sem a tela de agradecimento) aplicáveis para a situação de uso informada. */
export function getVisibleStepsE2(situacao?: SituacaoUsoE2): number[] {
  switch (situacao) {
    case "sem_interesse":
      return [STEP_E2.PERFIL, STEP_E2.EXPERIENCIA, STEP_E2.PEPTIDEOS, STEP_E2.MARKETING];
    case "interesse":
      return [STEP_E2.PERFIL, STEP_E2.EXPERIENCIA, STEP_E2.COMPRA, STEP_E2.PEPTIDEOS, STEP_E2.MARKETING];
    default:
      return [
        STEP_E2.PERFIL,
        STEP_E2.EXPERIENCIA,
        STEP_E2.COMPRA,
        STEP_E2.SAUDE,
        STEP_E2.PEPTIDEOS,
        STEP_E2.MARKETING,
      ];
  }
}

function resolveStepMeta(config: PesquisaConfigE2 | null | undefined, step: number): StepMetaE2 | undefined {
  const meta = config?.stepMeta;
  if (!meta) return undefined;
  if (Array.isArray(meta)) return meta[step - 1];
  return meta[String(step)];
}

export function getStepLabelE2(step: number, config?: PesquisaConfigE2 | null): string {
  const meta = resolveStepMeta(config, step);
  return meta?.label || meta?.titulo || STEP_LABELS[step] || `Etapa ${step}`;
}

export function getStepSubtitleE2(step: number, config?: PesquisaConfigE2 | null): string | undefined {
  return resolveStepMeta(config, step)?.subtitulo;
}

/** Percentual baseado na posição da etapa atual dentre as etapas aplicáveis. */
export function getProgressPercentE2(step: number, situacao?: SituacaoUsoE2, isCompleted = false): number {
  if (isCompleted || step >= STEP_E2.CONCLUSAO) return 100;
  const visibleSteps = getVisibleStepsE2(situacao);
  const index = Math.max(0, visibleSteps.indexOf(step));
  return Math.round((index / visibleSteps.length) * 100);
}

export function getProgressMessageE2(percent: number, config?: PesquisaConfigE2 | null, step?: number): string {
  const customMessage = step ? resolveStepMeta(config, step)?.mensagem : undefined;
  if (customMessage) return customMessage;
  if (percent >= 100) return "Pronto! Obrigado por participar.";
  if (percent >= 75) return "Falta muito pouco!";
  if (percent >= 50) return "Mais da metade, você está indo muito bem!";
  if (percent >= 25) return "Ótimo ritmo, continue assim!";
  return "Vamos começar, leva só alguns minutos.";
}

/* ------------------------------------------------------------------ */
/* Catálogos de opções                                                 */
/* ------------------------------------------------------------------ */

const EXCLUSIVE_IDS = new Set(["nunca", "nenhum", "nenhuma", "prefiro_nao", "nao_busco"]);
const PINNED_END_IDS = new Set(["nao_sei", "nao_lembro", "prefiro_nao"]);
const OTHER_ID_PATTERN = /^outr[oa]s?$/;
const BR_PHARMACY_PATTERN = /(^|[_\s-])br($|[_\s-])|brasil/i;

export function isOtherOptionId(id: string | undefined): boolean {
  return Boolean(id && OTHER_ID_PATTERN.test(id));
}

export function normalizeOption(item: OpcaoCatalogoE2): OpcaoE2 {
  const base: OpcaoE2 = typeof item === "string" ? { id: item, label: item } : item;
  const isExclusive = Boolean(base.exclusive) || EXCLUSIVE_IDS.has(base.id);
  const isPinnedEnd =
    Boolean(base.pinnedEnd) || isExclusive || isOtherOptionId(base.id) || PINNED_END_IDS.has(base.id);
  return { ...base, exclusive: isExclusive, pinnedEnd: isPinnedEnd };
}

function options(...pairs: Array<[string, string]>): OpcaoE2[] {
  return pairs.map(([id, label]) => ({ id, label }));
}

/** Fallbacks usados somente se o backend não enviar a chave em `opcoesE2`. */
const DEFAULT_OPCOES: Record<string, OpcaoE2[]> = {
  idade: options(["18_24", "18 a 24 anos"], ["25_34", "25 a 34 anos"], ["35_44", "35 a 44 anos"], ["45_54", "45 a 54 anos"], ["55_mais", "55 anos ou mais"]),
  genero: options(["feminino", "Feminino"], ["masculino", "Masculino"], ["outro", "Outro"], ["prefiro_nao", "Prefiro não informar"]),
  faixaRenda: options(["ate_2", "Até 2 salários mínimos"], ["2_5", "De 2 a 5 salários mínimos"], ["5_10", "De 5 a 10 salários mínimos"], ["10_mais", "Mais de 10 salários mínimos"], ["prefiro_nao", "Prefiro não informar"]),
  situacaoUso: options(["atual", "Uso as Queridinhas atualmente"], ["ex", "Já usei, mas parei"], ["interesse", "Nunca usei, mas tenho interesse"], ["sem_interesse", "Nunca usei e não tenho interesse"]),
  mudouMarca: options(["sim", "Sim"], ["nao", "Não"]),
  motivoMudanca: options(["preco", "Preço"], ["resultado", "Resultado"], ["efeitos", "Efeitos colaterais"], ["disponibilidade", "Disponibilidade"], ["indicacao", "Indicação de alguém"], ["confianca", "Mais confiança na origem"], ["outro", "Outro"]),
  tipoFornecedor: options(["manipulada", "Farmácia de manipulação"], ["industrializada", "Produto industrializado"], ["importado", "Importado"], ["nao_sei", "Não sei informar"]),
  gastoMensal: options(["ate_300", "Até R$ 300"], ["300_600", "R$ 300 a R$ 600"], ["600_1000", "R$ 600 a R$ 1.000"], ["1000_mais", "Mais de R$ 1.000"], ["nao_sei", "Ainda não sei"]),
  precoJusto: options(["ate_300", "Até R$ 300"], ["300_600", "R$ 300 a R$ 600"], ["600_1000", "R$ 600 a R$ 1.000"], ["1000_mais", "Mais de R$ 1.000"]),
  fatoresCompra: options(["preco", "Preço"], ["confianca", "Confiança na origem"], ["resultado", "Resultado comprovado"], ["entrega", "Prazo de entrega"], ["indicacao", "Indicação"], ["atendimento", "Atendimento"], ["outro", "Outro"]),
  problemasCompra: options(["preco_alto", "Preço alto"], ["atraso", "Atraso na entrega"], ["falta_estoque", "Falta de estoque"], ["duvida_origem", "Dúvida sobre a origem"], ["atendimento", "Atendimento ruim"], ["nenhum", "Nenhum problema"], ["outro", "Outro"]),
  objetivo: options(["emagrecer", "Emagrecer"], ["manter", "Manter o peso"], ["saude", "Saúde metabólica"], ["estetica", "Estética"], ["outro", "Outro"]),
  expectativa: options(["superou", "Superou"], ["atendeu", "Atendeu"], ["abaixo", "Ficou abaixo"], ["cedo", "Ainda é cedo para dizer"]),
  efeitosColaterais: options(["nausea", "Náusea"], ["constipacao", "Constipação"], ["diarreia", "Diarreia"], ["fadiga", "Cansaço"], ["dor_cabeca", "Dor de cabeça"], ["nenhum", "Nenhum"], ["outro", "Outro"]),
  prescricaoMedica: options(["sim", "Sim"], ["nao", "Não"], ["prefiro_nao", "Prefiro não responder"]),
  acompanhamentoMedico: options(["sim", "Sim"], ["nao", "Não"], ["prefiro_nao", "Prefiro não responder"]),
  recuperouPeso: options(["sim", "Sim"], ["nao", "Não"], ["nao_se_aplica", "Não se aplica"], ["prefiro_nao", "Prefiro não responder"]),
  conheceRetatrutida: options(["conheco", "Conheço bem"], ["ouvi_pouco", "Ouvi falar um pouco"], ["nao_conheco", "Não conheço"]),
  usouRetatrutida: options(["atual", "Uso atualmente"], ["ja_usei", "Já usei"], ["nunca", "Nunca usei"], ["prefiro_nao", "Prefiro não responder"]),
  preocupacaoNovaSubstancia: options(["muito", "Muito preocupado(a)"], ["pouco", "Pouco preocupado(a)"], ["nada", "Nada preocupado(a)"], ["nao_sei", "Não sei opinar"]),
  fontesInformacao: options(["instagram", "Instagram"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["medico", "Médico(a)"], ["amigos", "Amigos e familiares"], ["grupos", "Grupos de mensagem"], ["nao_busco", "Não busco informações"], ["outro", "Outro"]),
  tipoConteudo: options(["video_curto", "Vídeos curtos"], ["video_longo", "Vídeos longos"], ["texto", "Textos e artigos"], ["depoimento", "Depoimentos de usuários"], ["cientifico", "Conteúdo científico"]),
  influenciaInfluenciador: options(["ja_comprei", "Já comprei por influência"], ["considerei", "Já considerei comprar"], ["nao", "Não influencia"], ["nao_sigo", "Não sigo influenciadores"]),
  participaGrupos: options(["sim", "Sim"], ["nao", "Não"], ["prefiro_nao", "Prefiro não responder"]),
};

export type CatalogKey = string;

const CONFIG_CATALOG_KEYS = {
  marcas: "marcasE2",
  farmacias: "farmacias",
  peptideos: "peptideos",
} as const;

export function getCatalogOptions(config: PesquisaConfigE2, catalogKey: CatalogKey): OpcaoE2[] {
  const fromConfig =
    catalogKey in CONFIG_CATALOG_KEYS
      ? config[CONFIG_CATALOG_KEYS[catalogKey as keyof typeof CONFIG_CATALOG_KEYS]]
      : config.opcoesE2?.[catalogKey];
  const source = fromConfig?.length ? fromConfig : (DEFAULT_OPCOES[catalogKey] ?? []);
  return source.map(normalizeOption);
}

/** Pergunta (questionKey) -> catálogo de origem. Somente listas nominais são embaralhadas. */
export const SHUFFLED_QUESTION_SOURCES: Record<string, CatalogKey> = {
  marcaAtual: "marcas",
  marcasUtilizadas: "marcas",
  marcaConfiavel: "marcas",
  marcaAnterior: "marcas",
  marcaNova: "marcas",
  motivoMudanca: "motivoMudanca",
  farmaciaConfianca: "farmacias",
  farmaciaUltima: "farmacias",
  fatoresCompra: "fatoresCompra",
  problemasCompra: "problemasCompra",
  efeitosColaterais: "efeitosColaterais",
  peptideosConheco: "peptideos",
  peptideosUtilizei: "peptideos",
  fontesInformacao: "fontesInformacao",
};

/** Opções de uma pergunta, já na ordem persistida em `respostas.optionOrder` quando aplicável. */
export function getQuestionOptions(
  config: PesquisaConfigE2,
  respostas: PesquisaRespostasE2,
  questionKey: string
): OpcaoE2[] {
  const catalogKey = SHUFFLED_QUESTION_SOURCES[questionKey] ?? questionKey;
  const catalog = getCatalogOptions(config, catalogKey);
  if (!(questionKey in SHUFFLED_QUESTION_SOURCES)) return catalog;
  return applyPersistedOrder(catalog, respostas.optionOrder?.[questionKey]);
}

/** Cria (uma única vez por sessão) a ordem embaralhada de todas as perguntas nominais. */
export function buildShuffleStateE2(
  config: PesquisaConfigE2,
  respostas: PesquisaRespostasE2
): Pick<PesquisaRespostasE2, "shuffleSeed" | "optionOrder"> | null {
  const catalogs: Record<string, ShuffleableOption[]> = {};
  for (const [questionKey, catalogKey] of Object.entries(SHUFFLED_QUESTION_SOURCES)) {
    catalogs[questionKey] = getCatalogOptions(config, catalogKey);
  }
  return ensureOptionOrders(respostas, catalogs);
}

/* ------------------------------------------------------------------ */
/* Seleção múltipla                                                    */
/* ------------------------------------------------------------------ */

export interface ToggleResult {
  values: string[];
  /** true quando a seleção foi recusada por atingir o limite máximo. */
  hitLimit: boolean;
}

/** Alterna uma opção respeitando opções exclusivas e limite máximo. */
export function toggleMultiValue(
  currentValues: readonly string[] | undefined,
  option: OpcaoE2,
  allOptions: readonly OpcaoE2[],
  maxSelections?: number
): ToggleResult {
  const current = currentValues ?? [];
  if (current.includes(option.id)) {
    return { values: current.filter((value) => value !== option.id), hitLimit: false };
  }
  if (option.exclusive) return { values: [option.id], hitLimit: false };

  const exclusiveIds = new Set(allOptions.filter((item) => item.exclusive).map((item) => item.id));
  const withoutExclusive = current.filter((value) => !exclusiveIds.has(value));
  if (maxSelections && withoutExclusive.length >= maxSelections) {
    return { values: withoutExclusive, hitLimit: true };
  }
  return { values: [...withoutExclusive, option.id], hitLimit: false };
}

/* ------------------------------------------------------------------ */
/* Lógica condicional                                                  */
/* ------------------------------------------------------------------ */

function isBrazilianPharmacy(config: PesquisaConfigE2, id: string | undefined): boolean {
  if (!id) return false;
  const option = getCatalogOptions(config, "farmacias").find((item) => item.id === id);
  return BR_PHARMACY_PATTERN.test(id) || Boolean(option && BR_PHARMACY_PATTERN.test(option.label));
}

/** Visibilidade de cada campo, única fonte de verdade para telas, validação e limpeza. */
export function getFieldVisibilityE2(
  respostas: PesquisaRespostasE2,
  config: PesquisaConfigE2
): Record<string, boolean> {
  const situacao = respostas.situacaoUso;
  const isCurrent = situacao === "atual";
  const isFormer = situacao === "ex";
  const isUser = isCurrent || isFormer;
  const isInterested = situacao === "interesse";
  const hasSituacao = Boolean(situacao);
  const changedBrand = isUser && respostas.mudouMarca === "sim";
  const retatrutidaKnown =
    respostas.conheceRetatrutida === "conheco" || respostas.conheceRetatrutida === "ouvi_pouco";

  return {
    idade: true,
    genero: true,
    estado: true,
    faixaRenda: true,
    privacyAccepted: true,
    situacaoUso: true,

    marcaAtual: isCurrent,
    marcasUtilizadas: isUser,
    marcaConfiavel: isUser || isInterested,
    mudouMarca: isUser,
    motivoMudanca: changedBrand,
    marcaAnterior: changedBrand,
    marcaNova: changedBrand,

    farmaciaConfianca: isUser || isInterested,
    farmaciaConfiancaOutro: (isUser || isInterested) && isOtherOptionId(respostas.farmaciaConfianca),
    tipoFornecedor: isUser || isInterested,
    farmaciaUltima: isUser,
    farmaciaUltimaOutro: isUser && isOtherOptionId(respostas.farmaciaUltima),
    farmaciaBrNome: isUser && isBrazilianPharmacy(config, respostas.farmaciaUltima),
    gastoMensal: isUser || isInterested,
    precoJusto: isUser || isInterested,
    fatoresCompra: isUser || isInterested,
    problemasCompra: isUser,
    problemaOutro: isUser && Boolean(respostas.problemasCompra?.some(isOtherOptionId)),

    objetivo: isUser,
    expectativa: isUser,
    efeitosColaterais: isUser,
    efeitoOutro: isUser && Boolean(respostas.efeitosColaterais?.some(isOtherOptionId)),
    prescricaoMedica: isUser,
    acompanhamentoMedico: isUser,
    recuperouPeso: isUser,

    conheceRetatrutida: hasSituacao,
    usouRetatrutida: hasSituacao && retatrutidaKnown,
    peptideosConheco: hasSituacao,
    peptideosUtilizei: hasSituacao,
    preocupacaoNovaSubstancia: hasSituacao,

    fontesInformacao: hasSituacao,
    tipoConteudo: hasSituacao,
    influenciaInfluenciador: hasSituacao,
    influenciadorNome:
      hasSituacao &&
      (respostas.influenciaInfluenciador === "ja_comprei" || respostas.influenciaInfluenciador === "considerei"),
    participaGrupos: hasSituacao,
  };
}

/** Remove respostas de perguntas que deixaram de ser aplicáveis (ex.: usuário voltou e mudou a situação). */
export function pruneInvisibleAnswersE2(
  respostas: PesquisaRespostasE2,
  config: PesquisaConfigE2
): PesquisaRespostasE2 {
  const visibility = getFieldVisibilityE2(respostas, config);
  const pruned: Record<string, unknown> = { ...respostas };
  for (const [field, isVisible] of Object.entries(visibility)) {
    if (!isVisible) delete pruned[field];
  }
  return pruned as PesquisaRespostasE2;
}
