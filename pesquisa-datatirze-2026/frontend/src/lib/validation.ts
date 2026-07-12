import type { PesquisaRespostas } from "@/types/pesquisa";

export function validateStep(step: number, respostas: PesquisaRespostas): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 1) {
    if (!respostas.idade) errors.idade = "Selecione sua faixa etária";
    if (!respostas.genero) errors.genero = "Selecione seu gênero";
    if (!respostas.estado) errors.estado = "Selecione seu estado";
    if (!respostas.cidade?.trim()) errors.cidade = "Informe sua cidade";
    if (!respostas.escolaridade) errors.escolaridade = "Selecione sua escolaridade";
    if (!respostas.faixaRenda) errors.faixaRenda = "Selecione sua faixa de renda";
  }

  if (step === 2) {
    if (respostas.utilizouTirzepatida === undefined) {
      errors.utilizouTirzepatida = "Responda se já utilizou tirzepatida";
    }
    if (respostas.utilizouTirzepatida === false) {
      if (!respostas.pretendeUtilizar) errors.pretendeUtilizar = "Selecione uma opção";
      if (!respostas.motivoNaoUtilizar) errors.motivoNaoUtilizar = "Selecione o motivo";
      if (!respostas.precoJustoNaoUsuario) errors.precoJustoNaoUsuario = "Selecione um valor";
    }
  }

  if (step === 3 && respostas.utilizouTirzepatida === true) {
    if (!respostas.tempoUso) errors.tempoUso = "Selecione o tempo de uso";
    if (!respostas.marcaAtual) errors.marcaAtual = "Selecione a marca atual";
    if (!respostas.marcasUtilizadas?.length) errors.marcasUtilizadas = "Selecione ao menos uma marca";
    if (!respostas.melhorMarca) errors.melhorMarca = "Selecione uma marca";
    if (!respostas.melhorCustoBeneficio) errors.melhorCustoBeneficio = "Selecione uma marca";
    if (!respostas.melhoresResultados) errors.melhoresResultados = "Selecione uma marca";
    if (!respostas.menorResultado) errors.menorResultado = "Selecione uma marca";
  }

  if (step === 4 && respostas.utilizouTirzepatida === true) {
    if (!respostas.ondeCompra) errors.ondeCompra = "Selecione onde compra";
    if (!respostas.comoConheceu) errors.comoConheceu = "Selecione como conheceu";
    if (!respostas.gastoMensal) errors.gastoMensal = "Selecione o gasto mensal";
    if (!respostas.precoJusto) errors.precoJusto = "Selecione o preço justo";
    if (!respostas.fatoresCompra?.length) errors.fatoresCompra = "Ordene os fatores de compra";
  }

  if (step === 5 && respostas.utilizouTirzepatida === true) {
    if (!respostas.pesoInicial || respostas.pesoInicial <= 0) errors.pesoInicial = "Informe o peso inicial";
    if (!respostas.pesoAtual || respostas.pesoAtual <= 0) errors.pesoAtual = "Informe o peso atual";
    if (!respostas.metaPeso || respostas.metaPeso <= 0) errors.metaPeso = "Informe a meta de peso";
    if (respostas.satisfacao === undefined) errors.satisfacao = "Informe sua satisfação";
    if (!respostas.expectativaAtingida) errors.expectativaAtingida = "Selecione uma opção";
  }

  if (step === 6 && respostas.utilizouTirzepatida === true) {
    if (respostas.acompanhamentoMedico === undefined) errors.acompanhamentoMedico = "Selecione uma opção";
    if (respostas.acompanhamentoNutricional === undefined) errors.acompanhamentoNutricional = "Selecione uma opção";
    if (!respostas.atividadeFisica) errors.atividadeFisica = "Selecione uma opção";
    if (!respostas.suplementacao?.length) errors.suplementacao = "Selecione ao menos uma opção";
  }

  if (step === 7 && respostas.utilizouTirzepatida === true) {
    if (!respostas.efeitosColaterais?.length) errors.efeitosColaterais = "Selecione ao menos um efeito";
    if ((respostas.efeitosColaterais || []).includes("Outro") && !respostas.efeitoOutro?.trim()) {
      errors.efeitoOutro = "Descreva o outro efeito";
    }
    const efeitosAtivos = (respostas.efeitosColaterais || []).filter((e) => e !== "Nenhum");
    if (efeitosAtivos.length > 0 && !respostas.efeitoMaisIncomodo) {
      errors.efeitoMaisIncomodo = "Selecione o efeito mais incômodo";
    }
    if (respostas.interrompeuUso === undefined) errors.interrompeuUso = "Selecione uma opção";
    if (respostas.interrompeuUso === true && !respostas.efeitoInterrupcao?.trim()) {
      errors.efeitoInterrupcao = "Descreva qual efeito causou a interrupção";
    }
  }

  if (step === 8 && respostas.utilizouTirzepatida === true) {
    if (!respostas.fontesInformacao?.length) errors.fontesInformacao = "Selecione ao menos uma fonte";
    if (respostas.acompanhaInfluenciadores === undefined) errors.acompanhaInfluenciadores = "Selecione uma opção";
    if (respostas.acompanhaInfluenciadores === true && !respostas.influenciadores?.trim()) {
      errors.influenciadores = "Informe os influenciadores";
    }
    if (!respostas.tipoConteudo) errors.tipoConteudo = "Selecione o tipo de conteúdo";
    if (!respostas.faltaMercado?.trim()) errors.faltaMercado = "Compartilhe sua opinião";
  }

  return errors;
}
