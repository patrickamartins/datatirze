import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SESSION_KEY = "pesquisa_datatirze_session";

export function getVisibleSteps(utilizou?: boolean): number[] {
  // Etapa 9 é só a tela de agradecimento — não entra na navegação
  if (utilizou === false) return [1, 2];
  if (utilizou === true) return [1, 2, 3, 4, 5, 6, 7, 8];
  return [1, 2];
}

export function getStepLabel(step: number): string {
  const labels: Record<number, string> = {
    1: "Perfil",
    2: "Experiência",
    3: "Histórico de Uso",
    4: "Compra",
    5: "Resultados",
    6: "Saúde",
    7: "Efeitos Colaterais",
    8: "Conteúdo",
    9: "Conclusão",
  };
  return labels[step] || `Etapa ${step}`;
}

export function getMarcaLabel(marcas: Array<{ id: string; label: string }>, id?: string): string {
  if (!id) return "—";
  return marcas.find((m) => m.id === id)?.label || id;
}

export function buildProfileSummary(
  respostas: Record<string, unknown>,
  marcas: Array<{ id: string; label: string }>
): string[] {
  const lines: string[] = [];

  if (respostas.genero) lines.push(String(respostas.genero));
  if (respostas.idade) lines.push(`${respostas.idade} anos`);
  if (respostas.faixaRenda) lines.push(`Renda: ${respostas.faixaRenda}`);

  if (respostas.utilizouTirzepatida === false) {
    lines.push("Ainda não utiliza tirzepatida");
    if (respostas.pretendeUtilizar) lines.push(`Pretende utilizar: ${respostas.pretendeUtilizar}`);
  } else {
    lines.push("Objetivo: emagrecimento");
    if (respostas.ondeCompra) lines.push(`Compra via ${String(respostas.ondeCompra).toLowerCase()}`);
    if (Array.isArray(respostas.fatoresCompra) && respostas.fatoresCompra[0]) {
      lines.push(`Prioridade: ${String(respostas.fatoresCompra[0]).toLowerCase()}`);
    }
    if (respostas.marcaAtual) {
      lines.push(`Marca atual: ${getMarcaLabel(marcas, String(respostas.marcaAtual))}`);
    }
  }

  return lines;
}
