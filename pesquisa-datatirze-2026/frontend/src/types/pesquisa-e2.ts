/**
 * Tipos da Edição 2 da pesquisa DataTirze.
 * Os catálogos podem chegar do backend como `string[]` ou como objetos `{ id, label, ... }`.
 */

export interface OpcaoE2 {
  id: string;
  label: string;
  descricao?: string;
  fabricante?: string;
  /** Mantém a opção sempre no fim da lista, mesmo com embaralhamento (ex.: "Outro"). */
  pinnedEnd?: boolean;
  /** Opção exclusiva em listas de múltipla escolha (ex.: "Nenhum"). */
  exclusive?: boolean;
}

export type OpcaoCatalogoE2 = string | OpcaoE2;

export interface StepMetaE2 {
  label?: string;
  titulo?: string;
  subtitulo?: string;
  mensagem?: string;
}

export interface PesquisaConfigE2 {
  edicao: number;
  marcasE2: OpcaoCatalogoE2[];
  farmacias: OpcaoCatalogoE2[];
  peptideos: OpcaoCatalogoE2[];
  opcoesE2: Record<string, OpcaoCatalogoE2[]>;
  stepMeta?: Record<string, StepMetaE2> | StepMetaE2[];
  estados: string[];
}

export type SituacaoUsoE2 = "atual" | "ex" | "interesse" | "sem_interesse";

export interface PesquisaRespostasE2 {
  idade?: string;
  genero?: string;
  estado?: string;
  faixaRenda?: string;

  situacaoUso?: SituacaoUsoE2;
  marcaAtual?: string;
  marcasUtilizadas?: string[];
  marcaConfiavel?: string;
  mudouMarca?: string;
  motivoMudanca?: string;
  marcaAnterior?: string;
  marcaNova?: string;

  farmaciaConfianca?: string;
  farmaciaConfiancaOutro?: string;
  tipoFornecedor?: string;
  farmaciaUltima?: string;
  farmaciaUltimaOutro?: string;
  farmaciaBrNome?: string;
  gastoMensal?: string;
  precoJusto?: string;
  fatoresCompra?: string[];
  problemasCompra?: string[];
  problemaOutro?: string;

  objetivo?: string;
  expectativa?: string;
  efeitosColaterais?: string[];
  efeitoOutro?: string;
  prescricaoMedica?: string;
  acompanhamentoMedico?: string;
  recuperouPeso?: string;

  conheceRetatrutida?: string;
  usouRetatrutida?: string;
  peptideosConheco?: string[];
  peptideosUtilizei?: string[];
  preocupacaoNovaSubstancia?: string;

  fontesInformacao?: string[];
  tipoConteudo?: string;
  influenciaInfluenciador?: string;
  influenciadorNome?: string;
  participaGrupos?: string;

  /** questionKey -> ids das opções na ordem exibida (persistência do embaralhamento). */
  optionOrder?: Record<string, string[]>;
  shuffleSeed?: string;
  privacyAccepted?: boolean;
}
