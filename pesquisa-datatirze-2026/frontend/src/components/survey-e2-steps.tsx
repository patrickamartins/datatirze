import { MultiChoiceE2, SingleChoiceE2 } from "@/components/option-fields-e2";
import { SelectInput, TextInput } from "@/components/form-fields";
import {
  getFieldVisibilityE2,
  getQuestionOptions,
  getStepLabelE2,
  getStepSubtitleE2,
  MAX_FATORES_COMPRA,
  STEP_E2,
} from "@/lib/survey-e2";
import type { PesquisaConfigE2, PesquisaRespostasE2 } from "@/types/pesquisa-e2";

interface StepE2Props {
  config: PesquisaConfigE2;
  respostas: PesquisaRespostasE2;
  onChange: (partial: PesquisaRespostasE2) => void;
  errors: Record<string, string>;
}

interface StepHeaderProps {
  step: number;
  config: PesquisaConfigE2;
  fallbackSubtitle: string;
}

function StepHeader({ step, config, fallbackSubtitle }: StepHeaderProps) {
  return (
    <header className="mb-6">
      <h2 className="text-xl font-bold text-brand-900">{getStepLabelE2(step, config)}</h2>
      <p className="mt-1 text-sm text-slate-500">{getStepSubtitleE2(step, config) ?? fallbackSubtitle}</p>
    </header>
  );
}

/* ------------------------------ 1. Perfil ------------------------------ */

export function StepPerfilE2({ config, respostas, onChange, errors }: StepE2Props) {
  const optionsFor = (key: string) => getQuestionOptions(config, respostas, key);

  return (
    <div>
      <StepHeader
        step={STEP_E2.PERFIL}
        config={config}
        fallbackSubtitle="Pesquisa anônima, sem e-mail, nome, telefone ou CPF."
      />

      <SingleChoiceE2
        label="Qual é a sua faixa etária?"
        options={optionsFor("idade")}
        value={respostas.idade}
        onChange={(idade) => onChange({ idade })}
        error={errors.idade}
      />

      <SingleChoiceE2
        label="Como você se identifica?"
        options={optionsFor("genero")}
        value={respostas.genero}
        onChange={(genero) => onChange({ genero })}
        error={errors.genero}
      />

      <SelectInput
        label="Em qual estado você mora?"
        value={respostas.estado || ""}
        onChange={(estado) => onChange({ estado })}
        options={config.estados}
        error={errors.estado}
        placeholder="Selecione seu estado (UF)"
      />

      <SingleChoiceE2
        label="Qual é a renda mensal da sua família?"
        options={optionsFor("faixaRenda")}
        value={respostas.faixaRenda}
        onChange={(faixaRenda) => onChange({ faixaRenda })}
        error={errors.faixaRenda}
      />

      <div className="rounded-2xl bg-slate-50 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={Boolean(respostas.privacyAccepted)}
            onChange={(event) => onChange({ privacyAccepted: event.target.checked })}
            className="mt-0.5 h-6 w-6 shrink-0 rounded-md border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            Entendo que minhas respostas são <strong>anônimas</strong>, usadas apenas em análises estatísticas
            agregadas e que posso parar a qualquer momento.
          </span>
        </label>
        {errors.privacyAccepted && (
          <p role="alert" className="field-error mt-2 text-sm">
            {errors.privacyAccepted}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- 2. Experiência --------------------------- */

export function StepExperienciaE2({ config, respostas, onChange, errors }: StepE2Props) {
  const visible = getFieldVisibilityE2(respostas, config);
  const optionsFor = (key: string) => getQuestionOptions(config, respostas, key);
  const isFormer = respostas.situacaoUso === "ex";
  const isInterested = respostas.situacaoUso === "interesse";

  return (
    <div>
      <StepHeader
        step={STEP_E2.EXPERIENCIA}
        config={config}
        fallbackSubtitle="Conte como é a sua relação com as Queridinhas."
      />

      <SingleChoiceE2
        label="Qual frase descreve melhor a sua situação?"
        options={optionsFor("situacaoUso")}
        value={respostas.situacaoUso}
        onChange={(situacaoUso) => onChange({ situacaoUso: situacaoUso as PesquisaRespostasE2["situacaoUso"] })}
        error={errors.situacaoUso}
      />

      {visible.marcaAtual && (
        <SingleChoiceE2
          label="Qual marca você usa hoje?"
          options={optionsFor("marcaAtual")}
          value={respostas.marcaAtual}
          onChange={(marcaAtual) => onChange({ marcaAtual })}
          error={errors.marcaAtual}
        />
      )}

      {visible.marcasUtilizadas && (
        <MultiChoiceE2
          label="Quais marcas você já utilizou?"
          options={optionsFor("marcasUtilizadas")}
          values={respostas.marcasUtilizadas}
          onChange={(marcasUtilizadas) => onChange({ marcasUtilizadas })}
          error={errors.marcasUtilizadas}
        />
      )}

      {visible.marcaConfiavel && (
        <SingleChoiceE2
          label={
            isInterested
              ? "Qual marca parece mais confiável para você?"
              : isFormer
                ? "Entre as que conhece, qual marca você considera a mais confiável?"
                : "Qual marca você considera a mais confiável?"
          }
          options={optionsFor("marcaConfiavel")}
          value={respostas.marcaConfiavel}
          onChange={(marcaConfiavel) => onChange({ marcaConfiavel })}
          error={errors.marcaConfiavel}
        />
      )}

      {visible.mudouMarca && (
        <SingleChoiceE2
          label="Você já trocou de marca?"
          options={optionsFor("mudouMarca")}
          value={respostas.mudouMarca}
          onChange={(mudouMarca) => onChange({ mudouMarca })}
          error={errors.mudouMarca}
        />
      )}

      {visible.motivoMudanca && (
        <SingleChoiceE2
          label="Qual foi o principal motivo da troca?"
          options={optionsFor("motivoMudanca")}
          value={respostas.motivoMudanca}
          onChange={(motivoMudanca) => onChange({ motivoMudanca })}
          error={errors.motivoMudanca}
        />
      )}

      {visible.marcaAnterior && (
        <SingleChoiceE2
          label="De qual marca você saiu?"
          options={optionsFor("marcaAnterior")}
          value={respostas.marcaAnterior}
          onChange={(marcaAnterior) => onChange({ marcaAnterior })}
          error={errors.marcaAnterior}
        />
      )}

      {visible.marcaNova && (
        <SingleChoiceE2
          label="Para qual marca você foi?"
          options={optionsFor("marcaNova")}
          value={respostas.marcaNova}
          onChange={(marcaNova) => onChange({ marcaNova })}
          error={errors.marcaNova}
        />
      )}
    </div>
  );
}

/* ------------------------------ 3. Compra ------------------------------ */

export function StepCompraE2({ config, respostas, onChange, errors }: StepE2Props) {
  const visible = getFieldVisibilityE2(respostas, config);
  const optionsFor = (key: string) => getQuestionOptions(config, respostas, key);
  const isInterested = respostas.situacaoUso === "interesse";

  return (
    <div>
      <StepHeader
        step={STEP_E2.COMPRA}
        config={config}
        fallbackSubtitle={
          isInterested
            ? "Mesmo sem ter usado, sua visão sobre onde comprar ajuda muito."
            : "Onde e como você compra as Queridinhas."
        }
      />

      <SingleChoiceE2
        label={isInterested ? "Em qual farmácia você confiaria mais?" : "Em qual farmácia você mais confia?"}
        options={optionsFor("farmaciaConfianca")}
        value={respostas.farmaciaConfianca}
        onChange={(farmaciaConfianca) => onChange({ farmaciaConfianca })}
        error={errors.farmaciaConfianca}
      />
      {visible.farmaciaConfiancaOutro && (
        <TextInput
          label="Qual farmácia?"
          value={respostas.farmaciaConfiancaOutro || ""}
          onChange={(farmaciaConfiancaOutro) => onChange({ farmaciaConfiancaOutro })}
          error={errors.farmaciaConfiancaOutro}
          placeholder="Nome da farmácia"
        />
      )}

      <SingleChoiceE2
        label={isInterested ? "De que tipo de fornecedor você compraria?" : "De que tipo de fornecedor você compra?"}
        options={optionsFor("tipoFornecedor")}
        value={respostas.tipoFornecedor}
        onChange={(tipoFornecedor) => onChange({ tipoFornecedor })}
        error={errors.tipoFornecedor}
      />

      {visible.farmaciaUltima && (
        <SingleChoiceE2
          label="Em qual farmácia foi a sua última compra?"
          options={optionsFor("farmaciaUltima")}
          value={respostas.farmaciaUltima}
          onChange={(farmaciaUltima) => onChange({ farmaciaUltima })}
          error={errors.farmaciaUltima}
        />
      )}
      {visible.farmaciaUltimaOutro && (
        <TextInput
          label="Qual farmácia?"
          value={respostas.farmaciaUltimaOutro || ""}
          onChange={(farmaciaUltimaOutro) => onChange({ farmaciaUltimaOutro })}
          error={errors.farmaciaUltimaOutro}
          placeholder="Nome da farmácia"
        />
      )}
      {visible.farmaciaBrNome && (
        <TextInput
          label="Qual o nome da farmácia? (opcional)"
          value={respostas.farmaciaBrNome || ""}
          onChange={(farmaciaBrNome) => onChange({ farmaciaBrNome })}
          placeholder="Nome ou cidade da farmácia"
        />
      )}

      <SingleChoiceE2
        label={isInterested ? "Quanto você pretende gastar por mês?" : "Quanto você gasta por mês?"}
        options={optionsFor("gastoMensal")}
        value={respostas.gastoMensal}
        onChange={(gastoMensal) => onChange({ gastoMensal })}
        error={errors.gastoMensal}
      />

      <SingleChoiceE2
        label="Que valor mensal você considera justo?"
        options={optionsFor("precoJusto")}
        value={respostas.precoJusto}
        onChange={(precoJusto) => onChange({ precoJusto })}
        error={errors.precoJusto}
      />

      <MultiChoiceE2
        label={isInterested ? "O que mais pesaria na sua decisão de compra?" : "O que mais pesa na sua decisão de compra?"}
        options={optionsFor("fatoresCompra")}
        values={respostas.fatoresCompra}
        maxSelections={MAX_FATORES_COMPRA}
        onChange={(fatoresCompra) => onChange({ fatoresCompra })}
        error={errors.fatoresCompra}
      />

      {visible.problemasCompra && (
        <MultiChoiceE2
          label="Já teve algum problema ao comprar?"
          options={optionsFor("problemasCompra")}
          values={respostas.problemasCompra}
          onChange={(problemasCompra) => onChange({ problemasCompra })}
          error={errors.problemasCompra}
        />
      )}
      {visible.problemaOutro && (
        <TextInput
          label="Qual foi o problema?"
          value={respostas.problemaOutro || ""}
          onChange={(problemaOutro) => onChange({ problemaOutro })}
          error={errors.problemaOutro}
        />
      )}
    </div>
  );
}

/* ------------------------------- 4. Saúde ------------------------------ */

export function StepSaudeE2({ config, respostas, onChange, errors }: StepE2Props) {
  const visible = getFieldVisibilityE2(respostas, config);
  const optionsFor = (key: string) => getQuestionOptions(config, respostas, key);

  return (
    <div>
      <StepHeader
        step={STEP_E2.SAUDE}
        config={config}
        fallbackSubtitle="Algumas perguntas são sensíveis, em todas você pode escolher “Prefiro não responder”."
      />

      <SingleChoiceE2
        label="Qual é o seu principal objetivo?"
        options={optionsFor("objetivo")}
        value={respostas.objetivo}
        onChange={(objetivo) => onChange({ objetivo })}
        error={errors.objetivo}
      />

      <SingleChoiceE2
        label="Os resultados corresponderam à sua expectativa?"
        options={optionsFor("expectativa")}
        value={respostas.expectativa}
        onChange={(expectativa) => onChange({ expectativa })}
        error={errors.expectativa}
      />

      <MultiChoiceE2
        label="Quais efeitos colaterais você sentiu?"
        options={optionsFor("efeitosColaterais")}
        values={respostas.efeitosColaterais}
        onChange={(efeitosColaterais) => onChange({ efeitosColaterais })}
        error={errors.efeitosColaterais}
      />
      {visible.efeitoOutro && (
        <TextInput
          label="Qual outro efeito?"
          value={respostas.efeitoOutro || ""}
          onChange={(efeitoOutro) => onChange({ efeitoOutro })}
          error={errors.efeitoOutro}
        />
      )}

      <SingleChoiceE2
        label="Você usa com prescrição médica?"
        options={optionsFor("prescricaoMedica")}
        value={respostas.prescricaoMedica}
        onChange={(prescricaoMedica) => onChange({ prescricaoMedica })}
        error={errors.prescricaoMedica}
      />

      <SingleChoiceE2
        label="Você faz acompanhamento médico?"
        options={optionsFor("acompanhamentoMedico")}
        value={respostas.acompanhamentoMedico}
        onChange={(acompanhamentoMedico) => onChange({ acompanhamentoMedico })}
        error={errors.acompanhamentoMedico}
      />

      <SingleChoiceE2
        label="Você recuperou o peso depois de parar ou reduzir a dose?"
        options={optionsFor("recuperouPeso")}
        value={respostas.recuperouPeso}
        onChange={(recuperouPeso) => onChange({ recuperouPeso })}
        error={errors.recuperouPeso}
      />
    </div>
  );
}

/* ----------------------------- 5. Peptídeos ---------------------------- */

export function StepPeptideosE2({ config, respostas, onChange, errors }: StepE2Props) {
  const visible = getFieldVisibilityE2(respostas, config);
  const optionsFor = (key: string) => getQuestionOptions(config, respostas, key);

  return (
    <div>
      <StepHeader
        step={STEP_E2.PEPTIDEOS}
        config={config}
        fallbackSubtitle="O que você sabe sobre outros peptídeos e novas substâncias."
      />

      <SingleChoiceE2
        label="Você conhece a retatrutida?"
        options={optionsFor("conheceRetatrutida")}
        value={respostas.conheceRetatrutida}
        onChange={(conheceRetatrutida) => onChange({ conheceRetatrutida })}
        error={errors.conheceRetatrutida}
      />

      {visible.usouRetatrutida && (
        <SingleChoiceE2
          label="Você já usou a retatrutida?"
          options={optionsFor("usouRetatrutida")}
          value={respostas.usouRetatrutida}
          onChange={(usouRetatrutida) => onChange({ usouRetatrutida })}
          error={errors.usouRetatrutida}
        />
      )}

      <MultiChoiceE2
        label="Quais destes peptídeos você conhece?"
        options={optionsFor("peptideosConheco")}
        values={respostas.peptideosConheco}
        onChange={(peptideosConheco) => onChange({ peptideosConheco })}
        error={errors.peptideosConheco}
      />

      <MultiChoiceE2
        label="Quais destes você já utilizou?"
        options={optionsFor("peptideosUtilizei")}
        values={respostas.peptideosUtilizei}
        onChange={(peptideosUtilizei) => onChange({ peptideosUtilizei })}
        error={errors.peptideosUtilizei}
      />

      <SingleChoiceE2
        label="Quanto você se preocupa com o uso de substâncias novas, ainda pouco estudadas?"
        options={optionsFor("preocupacaoNovaSubstancia")}
        value={respostas.preocupacaoNovaSubstancia}
        onChange={(preocupacaoNovaSubstancia) => onChange({ preocupacaoNovaSubstancia })}
        error={errors.preocupacaoNovaSubstancia}
      />
    </div>
  );
}

/* ----------------------------- 6. Marketing ---------------------------- */

export function StepMarketingE2({ config, respostas, onChange, errors }: StepE2Props) {
  const visible = getFieldVisibilityE2(respostas, config);
  const optionsFor = (key: string) => getQuestionOptions(config, respostas, key);

  return (
    <div>
      <StepHeader
        step={STEP_E2.MARKETING}
        config={config}
        fallbackSubtitle="Última etapa: como você se informa."
      />

      <MultiChoiceE2
        label="Onde você busca informações sobre as Queridinhas?"
        options={optionsFor("fontesInformacao")}
        values={respostas.fontesInformacao}
        onChange={(fontesInformacao) => onChange({ fontesInformacao })}
        error={errors.fontesInformacao}
      />

      <SingleChoiceE2
        label="Que tipo de conteúdo você mais gosta de consumir?"
        options={optionsFor("tipoConteudo")}
        value={respostas.tipoConteudo}
        onChange={(tipoConteudo) => onChange({ tipoConteudo })}
        error={errors.tipoConteudo}
      />

      <SingleChoiceE2
        label="Influenciadores já influenciaram a sua decisão de compra?"
        options={optionsFor("influenciaInfluenciador")}
        value={respostas.influenciaInfluenciador}
        onChange={(influenciaInfluenciador) => onChange({ influenciaInfluenciador })}
        error={errors.influenciaInfluenciador}
      />
      {visible.influenciadorNome && (
        <TextInput
          label="Qual influenciador? (opcional)"
          value={respostas.influenciadorNome || ""}
          onChange={(influenciadorNome) => onChange({ influenciadorNome })}
          placeholder="Nome ou perfil"
        />
      )}

      <SingleChoiceE2
        label="Você participa de grupos sobre o tema (WhatsApp, Telegram, Facebook)?"
        options={optionsFor("participaGrupos")}
        value={respostas.participaGrupos}
        onChange={(participaGrupos) => onChange({ participaGrupos })}
        error={errors.participaGrupos}
      />
    </div>
  );
}

/* ----------------------------- 7. Conclusão ---------------------------- */

export function StepConclusaoE2() {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-emerald-500 text-4xl text-white shadow-lg">
        ✓
      </div>
      <h2 className="mb-3 text-2xl font-bold text-brand-900">Obrigado por participar!</h2>
      <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-600">
        Suas respostas foram enviadas com sucesso e ajudam a mapear o mercado das Queridinhas no Brasil.
        Nenhum dado pessoal foi coletado.
      </p>
      <p className="mt-6 text-xs text-slate-400">DataTirze · Edição 2 · 2026</p>
    </div>
  );
}
