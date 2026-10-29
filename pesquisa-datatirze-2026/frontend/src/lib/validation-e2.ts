import { z } from "zod";
import { getFieldVisibilityE2, MAX_FATORES_COMPRA, STEP_E2 } from "@/lib/survey-e2";
import type { PesquisaConfigE2, PesquisaRespostasE2 } from "@/types/pesquisa-e2";

interface FieldRule {
  schema: z.ZodTypeAny;
  message: string;
}

const requiredText = z.string().trim().min(1);
const requiredList = z.array(z.string()).min(1);

function required(message: string): FieldRule {
  return { schema: requiredText, message };
}

function requiredMulti(message: string, max?: number): FieldRule {
  return {
    schema: max ? requiredList.max(max) : requiredList,
    message: max ? `${message} (máximo ${max})` : message,
  };
}

/** Campos obrigatórios por etapa. Só são cobrados quando visíveis (ver `getFieldVisibilityE2`). */
const STEP_RULES: Record<number, Record<string, FieldRule>> = {
  [STEP_E2.PERFIL]: {
    idade: required("Selecione sua faixa etária"),
    genero: required("Selecione uma opção"),
    estado: required("Selecione seu estado"),
    faixaRenda: required("Selecione sua faixa de renda"),
    privacyAccepted: { schema: z.literal(true), message: "Aceite o aviso de privacidade para continuar" },
  },
  [STEP_E2.EXPERIENCIA]: {
    situacaoUso: required("Selecione a opção que mais combina com você"),
    marcaAtual: required("Selecione a marca que você usa"),
    marcasUtilizadas: requiredMulti("Selecione ao menos uma marca"),
    marcaConfiavel: required("Selecione uma opção"),
    mudouMarca: required("Selecione uma opção"),
    motivoMudanca: required("Selecione o motivo"),
    marcaAnterior: required("Selecione a marca anterior"),
    marcaNova: required("Selecione a marca nova"),
  },
  [STEP_E2.COMPRA]: {
    farmaciaConfianca: required("Selecione uma opção"),
    farmaciaConfiancaOutro: required("Conte qual é"),
    tipoFornecedor: required("Selecione uma opção"),
    farmaciaUltima: required("Selecione uma opção"),
    farmaciaUltimaOutro: required("Conte qual é"),
    gastoMensal: required("Selecione uma faixa"),
    precoJusto: required("Selecione uma faixa"),
    fatoresCompra: requiredMulti("Escolha de 1 a 3 fatores", MAX_FATORES_COMPRA),
    problemasCompra: requiredMulti("Selecione ao menos uma opção"),
    problemaOutro: required("Conte qual foi o problema"),
  },
  [STEP_E2.SAUDE]: {
    objetivo: required("Selecione uma opção"),
    expectativa: required("Selecione uma opção"),
    efeitosColaterais: requiredMulti("Selecione ao menos uma opção"),
    efeitoOutro: required("Conte qual foi o efeito"),
    prescricaoMedica: required("Selecione uma opção"),
    acompanhamentoMedico: required("Selecione uma opção"),
    recuperouPeso: required("Selecione uma opção"),
  },
  [STEP_E2.PEPTIDEOS]: {
    conheceRetatrutida: required("Selecione uma opção"),
    usouRetatrutida: required("Selecione uma opção"),
    peptideosConheco: requiredMulti("Selecione ao menos uma opção"),
    peptideosUtilizei: requiredMulti("Selecione ao menos uma opção"),
    preocupacaoNovaSubstancia: required("Selecione uma opção"),
  },
  [STEP_E2.MARKETING]: {
    fontesInformacao: requiredMulti("Selecione ao menos uma opção"),
    tipoConteudo: required("Selecione uma opção"),
    influenciaInfluenciador: required("Selecione uma opção"),
    participaGrupos: required("Selecione uma opção"),
  },
};

/** Valida uma etapa e devolve `{ campo: mensagem }`. Mapa vazio = etapa válida. */
export function validateStepE2(
  step: number,
  respostas: PesquisaRespostasE2,
  config: PesquisaConfigE2
): Record<string, string> {
  const rules = STEP_RULES[step];
  if (!rules) return {};

  const visibility = getFieldVisibilityE2(respostas, config);
  const values = respostas as Record<string, unknown>;
  const errors: Record<string, string> = {};

  for (const [field, rule] of Object.entries(rules)) {
    if (!visibility[field]) continue;
    if (!rule.schema.safeParse(values[field]).success) errors[field] = rule.message;
  }

  return errors;
}

/** Valida todas as etapas aplicáveis; devolve a primeira etapa com erro (ou null). */
export function findFirstInvalidStepE2(
  steps: readonly number[],
  respostas: PesquisaRespostasE2,
  config: PesquisaConfigE2
): number | null {
  for (const step of steps) {
    if (Object.keys(validateStepE2(step, respostas, config)).length > 0) return step;
  }
  return null;
}
