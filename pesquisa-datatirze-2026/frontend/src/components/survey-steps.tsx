import { useState } from "react";
import type { PesquisaConfig, PesquisaRespostas } from "@/types/pesquisa";
import {
  CheckboxOption,
  OptionButton,
  OptionGroup,
  SelectInput,
  SliderInput,
  TextInput,
} from "@/components/form-fields";
import { buildProfileSummary } from "@/lib/utils";

interface StepProps {
  config: PesquisaConfig;
  respostas: PesquisaRespostas;
  onChange: (partial: PesquisaRespostas) => void;
  errors: Record<string, string>;
}

export function StepPerfil({ config, respostas, onChange, errors }: StepProps) {
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-brand-900">Seu perfil</h2>
      <p className="mb-6 text-sm text-slate-500">Leva cerca de 1 minuto. Todas as respostas são anônimas.</p>

      <OptionGroup label="Qual sua idade?" error={errors.idade}>
        {config.opcoes.idade.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.idade === opt}
            onClick={() => onChange({ idade: opt })}
          />
        ))}
      </OptionGroup>

      <OptionGroup label="Gênero" error={errors.genero}>
        {config.opcoes.genero.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.genero === opt}
            onClick={() => onChange({ genero: opt })}
          />
        ))}
      </OptionGroup>

      <SelectInput
        label="Estado"
        value={respostas.estado || ""}
        onChange={(v) => onChange({ estado: v })}
        options={config.estados}
        error={errors.estado}
        placeholder="Selecione seu estado (UF)"
      />

      <TextInput
        label="Cidade"
        value={respostas.cidade || ""}
        onChange={(v) => onChange({ cidade: v })}
        error={errors.cidade}
        placeholder="Sua cidade"
      />

      <OptionGroup label="Escolaridade" error={errors.escolaridade}>
        {config.opcoes.escolaridade.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.escolaridade === opt}
            onClick={() => onChange({ escolaridade: opt })}
          />
        ))}
      </OptionGroup>

      <OptionGroup label="Faixa de renda mensal familiar" error={errors.faixaRenda}>
        {config.opcoes.faixaRenda.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.faixaRenda === opt}
            onClick={() => onChange({ faixaRenda: opt })}
          />
        ))}
      </OptionGroup>
    </div>
  );
}

export function StepExperiencia({ config, respostas, onChange, errors }: StepProps) {
  const naoUtilizou = respostas.utilizouTirzepatida === false;

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-brand-900">Experiência com Tirzepatida</h2>
      <p className="mb-6 text-sm text-slate-500">Esta pergunta define o restante da sua jornada na pesquisa.</p>

      <OptionGroup label="Você já utilizou tirzepatida?" error={errors.utilizouTirzepatida}>
        <OptionButton
          label="Sim"
          selected={respostas.utilizouTirzepatida === true}
          onClick={() => onChange({ utilizouTirzepatida: true })}
        />
        <OptionButton
          label="Não"
          selected={respostas.utilizouTirzepatida === false}
          onClick={() => onChange({ utilizouTirzepatida: false })}
        />
      </OptionGroup>

      {naoUtilizou && (
        <>
          <OptionGroup label="Pretende utilizar?" error={errors.pretendeUtilizar}>
            {config.opcoes.pretendeUtilizar.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={respostas.pretendeUtilizar === opt}
                onClick={() => onChange({ pretendeUtilizar: opt })}
              />
            ))}
          </OptionGroup>

          <OptionGroup label="Principal motivo para não utilizar" error={errors.motivoNaoUtilizar}>
            {config.opcoes.motivoNaoUtilizar.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={respostas.motivoNaoUtilizar === opt}
                onClick={() => onChange({ motivoNaoUtilizar: opt })}
              />
            ))}
          </OptionGroup>

          <OptionGroup label="Quanto considera justo pagar por caixa?" error={errors.precoJustoNaoUsuario}>
            {config.opcoes.precoJusto.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={respostas.precoJustoNaoUsuario === opt}
                onClick={() => onChange({ precoJustoNaoUsuario: opt })}
              />
            ))}
          </OptionGroup>
        </>
      )}
    </div>
  );
}

function MarcaSelect({
  label,
  value,
  onChange,
  marcas,
  error,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  marcas: PesquisaConfig["marcas"];
  error?: string;
}) {
  return (
    <OptionGroup label={label} error={error}>
      {marcas.map((marca) => (
        <OptionButton
          key={marca.id}
          label={`${marca.label} — ${marca.fabricante}`}
          selected={value === marca.id}
          onClick={() => onChange(marca.id)}
        />
      ))}
    </OptionGroup>
  );
}

export function StepHistorico({ config, respostas, onChange, errors }: StepProps) {
  const toggleMarca = (id: string) => {
    const current = respostas.marcasUtilizadas || [];
    const next = current.includes(id) ? current.filter((m) => m !== id) : [...current, id];
    onChange({ marcasUtilizadas: next });
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-brand-900">Histórico de Uso</h2>
      <p className="mb-6 text-sm text-slate-500">Suas experiências com as marcas do mercado brasileiro.</p>

      <OptionGroup label="Há quanto tempo utiliza?" error={errors.tempoUso}>
        {config.opcoes.tempoUso.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.tempoUso === opt}
            onClick={() => onChange({ tempoUso: opt })}
          />
        ))}
      </OptionGroup>

      <MarcaSelect
        label="Atualmente utiliza qual marca?"
        value={respostas.marcaAtual}
        onChange={(v) => onChange({ marcaAtual: v })}
        marcas={config.marcas}
        error={errors.marcaAtual}
      />

      <OptionGroup label="Já utilizou quais marcas?" error={errors.marcasUtilizadas}>
        {config.marcas.map((marca) => (
          <CheckboxOption
            key={marca.id}
            label={`${marca.label} — ${marca.fabricante}`}
            checked={(respostas.marcasUtilizadas || []).includes(marca.id)}
            onChange={() => toggleMarca(marca.id)}
          />
        ))}
      </OptionGroup>

      <MarcaSelect
        label="Qual marca considera melhor?"
        value={respostas.melhorMarca}
        onChange={(v) => onChange({ melhorMarca: v })}
        marcas={config.marcas}
        error={errors.melhorMarca}
      />

      <MarcaSelect
        label="Qual marca considera melhor custo-benefício?"
        value={respostas.melhorCustoBeneficio}
        onChange={(v) => onChange({ melhorCustoBeneficio: v })}
        marcas={config.marcas}
        error={errors.melhorCustoBeneficio}
      />

      <MarcaSelect
        label="Qual marca gerou melhores resultados?"
        value={respostas.melhoresResultados}
        onChange={(v) => onChange({ melhoresResultados: v })}
        marcas={config.marcas}
        error={errors.melhoresResultados}
      />

      <MarcaSelect
        label="Qual marca usou e apresentou menos resultado?"
        value={respostas.menorResultado}
        onChange={(v) => onChange({ menorResultado: v })}
        marcas={config.marcas}
        error={errors.menorResultado}
      />
    </div>
  );
}

export function StepCompra({ config, respostas, onChange, errors }: StepProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fatores = respostas.fatoresCompra || [...config.opcoes.fatoresCompra];

  function moveItem(from: number, to: number) {
    const items = [...fatores];
    const [removed] = items.splice(from, 1);
    items.splice(to, 0, removed);
    onChange({ fatoresCompra: items });
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-brand-900">Comportamento de Compra</h2>
      <p className="mb-6 text-sm text-slate-500">Como e onde você adquire o produto.</p>

      <OptionGroup label="Onde costuma comprar?" error={errors.ondeCompra}>
        {config.opcoes.ondeCompra.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.ondeCompra === opt}
            onClick={() => onChange({ ondeCompra: opt })}
          />
        ))}
      </OptionGroup>

      <OptionGroup label="Como conheceu seu fornecedor atual?" error={errors.comoConheceu}>
        {config.opcoes.comoConheceu.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.comoConheceu === opt}
            onClick={() => onChange({ comoConheceu: opt })}
          />
        ))}
      </OptionGroup>

      <OptionGroup label="Quanto gasta por mês?" error={errors.gastoMensal}>
        {config.opcoes.gastoMensal.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.gastoMensal === opt}
            onClick={() => onChange({ gastoMensal: opt })}
          />
        ))}
      </OptionGroup>

      <OptionGroup label="Qual valor considera justo por caixa?" error={errors.precoJusto}>
        {config.opcoes.precoJusto.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.precoJusto === opt}
            onClick={() => onChange({ precoJusto: opt })}
          />
        ))}
      </OptionGroup>

      <div className="mb-5">
        <p className="field-label">O que mais influencia sua compra? (ordene por prioridade)</p>
        <p className="mb-3 text-xs text-slate-500">Arraste para reordenar — o primeiro é o mais importante.</p>
        <div className="space-y-2">
          {fatores.map((fator, index) => (
            <div
              key={fator}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index) moveItem(dragIndex, index);
                setDragIndex(null);
              }}
              className="flex cursor-grab items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm active:cursor-grabbing"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {index + 1}
              </span>
              <span className="flex-1">{fator}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveItem(index, index - 1)}
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === fatores.length - 1}
                  onClick={() => moveItem(index, index + 1)}
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
        {errors.fatoresCompra && <p className="field-error">{errors.fatoresCompra}</p>}
      </div>
    </div>
  );
}

export function StepResultados({ respostas, onChange, errors }: Omit<StepProps, "config">) {
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-brand-900">Resultados</h2>
      <p className="mb-6 text-sm text-slate-500">Seus resultados com o tratamento.</p>

      <TextInput
        label="Qual era seu peso inicial? (kg)"
        type="number"
        value={respostas.pesoInicial?.toString() || ""}
        onChange={(v) => onChange({ pesoInicial: v ? Number(v) : undefined })}
        error={errors.pesoInicial}
        placeholder="Ex: 95"
      />

      <TextInput
        label="Peso atual? (kg)"
        type="number"
        value={respostas.pesoAtual?.toString() || ""}
        onChange={(v) => onChange({ pesoAtual: v ? Number(v) : undefined })}
        error={errors.pesoAtual}
        placeholder="Ex: 82"
      />

      <TextInput
        label="Meta de peso? (kg)"
        type="number"
        value={respostas.metaPeso?.toString() || ""}
        onChange={(v) => onChange({ metaPeso: v ? Number(v) : undefined })}
        error={errors.metaPeso}
        placeholder="Ex: 75"
      />

      <SliderInput
        label="Em uma escala de 0 a 10, qual sua satisfação?"
        value={respostas.satisfacao ?? 5}
        onChange={(v) => onChange({ satisfacao: v })}
      />

      <OptionGroup label="Sua expectativa foi atingida?" error={errors.expectativaAtingida}>
        {["Sim", "Parcialmente", "Não"].map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.expectativaAtingida === opt}
            onClick={() => onChange({ expectativaAtingida: opt })}
          />
        ))}
      </OptionGroup>
    </div>
  );
}

export function StepSaude({ config, respostas, onChange, errors }: StepProps) {
  const toggleSup = (item: string) => {
    const current = respostas.suplementacao || [];
    if (item === "Nenhum") {
      onChange({ suplementacao: current.includes("Nenhum") ? [] : ["Nenhum"] });
      return;
    }
    const withoutNenhum = current.filter((s) => s !== "Nenhum");
    const next = withoutNenhum.includes(item)
      ? withoutNenhum.filter((s) => s !== item)
      : [...withoutNenhum, item];
    onChange({ suplementacao: next });
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-brand-900">Saúde e Acompanhamento</h2>
      <p className="mb-6 text-sm text-slate-500">Seu acompanhamento profissional e hábitos.</p>

      <OptionGroup label="Faz acompanhamento médico?" error={errors.acompanhamentoMedico}>
        <OptionButton
          label="Sim"
          selected={respostas.acompanhamentoMedico === true}
          onClick={() => onChange({ acompanhamentoMedico: true })}
        />
        <OptionButton
          label="Não"
          selected={respostas.acompanhamentoMedico === false}
          onClick={() => onChange({ acompanhamentoMedico: false })}
        />
      </OptionGroup>

      <OptionGroup label="Faz acompanhamento nutricional?" error={errors.acompanhamentoNutricional}>
        <OptionButton
          label="Sim"
          selected={respostas.acompanhamentoNutricional === true}
          onClick={() => onChange({ acompanhamentoNutricional: true })}
        />
        <OptionButton
          label="Não"
          selected={respostas.acompanhamentoNutricional === false}
          onClick={() => onChange({ acompanhamentoNutricional: false })}
        />
      </OptionGroup>

      <OptionGroup label="Pratica atividade física?" error={errors.atividadeFisica}>
        {config.opcoes.atividadeFisica.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.atividadeFisica === opt}
            onClick={() => onChange({ atividadeFisica: opt })}
          />
        ))}
      </OptionGroup>

      <OptionGroup label="Utiliza suplementação?" error={errors.suplementacao}>
        {config.opcoes.suplementacao.map((opt) => (
          <CheckboxOption
            key={opt}
            label={opt}
            checked={(respostas.suplementacao || []).includes(opt)}
            onChange={() => toggleSup(opt)}
          />
        ))}
      </OptionGroup>
    </div>
  );
}

export function StepEfeitos({ config, respostas, onChange, errors }: StepProps) {
  const toggleEfeito = (item: string) => {
    const current = respostas.efeitosColaterais || [];
    if (item === "Nenhum") {
      onChange({ efeitosColaterais: current.includes("Nenhum") ? [] : ["Nenhum"], efeitoOutro: "" });
      return;
    }
    const withoutNenhum = current.filter((s) => s !== "Nenhum");
    const next = withoutNenhum.includes(item)
      ? withoutNenhum.filter((s) => s !== item)
      : [...withoutNenhum, item];
    onChange({ efeitosColaterais: next });
  };

  const efeitosAtivos = (respostas.efeitosColaterais || []).filter((e) => e !== "Nenhum");

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-brand-900">Efeitos Colaterais</h2>
      <p className="mb-6 text-sm text-slate-500">Quais efeitos você sentiu durante o uso?</p>

      <OptionGroup label="Quais efeitos sentiu?" error={errors.efeitosColaterais}>
        {config.opcoes.efeitosColaterais.map((opt) => (
          <CheckboxOption
            key={opt}
            label={opt}
            checked={(respostas.efeitosColaterais || []).includes(opt)}
            onChange={() => toggleEfeito(opt)}
          />
        ))}
      </OptionGroup>

      {(respostas.efeitosColaterais || []).includes("Outro") && (
        <TextInput
          label="Descreva o outro efeito"
          value={respostas.efeitoOutro || ""}
          onChange={(v) => onChange({ efeitoOutro: v })}
          error={errors.efeitoOutro}
        />
      )}

      {efeitosAtivos.length > 0 && (
        <OptionGroup label="Qual foi o mais incômodo?" error={errors.efeitoMaisIncomodo}>
          {efeitosAtivos.map((opt) => (
            <OptionButton
              key={opt}
              label={opt}
              selected={respostas.efeitoMaisIncomodo === opt}
              onClick={() => onChange({ efeitoMaisIncomodo: opt })}
            />
          ))}
          {(respostas.efeitosColaterais || []).includes("Outro") && respostas.efeitoOutro && (
            <OptionButton
              label={respostas.efeitoOutro}
              selected={respostas.efeitoMaisIncomodo === respostas.efeitoOutro}
              onClick={() => onChange({ efeitoMaisIncomodo: respostas.efeitoOutro })}
            />
          )}
        </OptionGroup>
      )}

      <OptionGroup label="Algum efeito fez você interromper o uso?" error={errors.interrompeuUso}>
        <OptionButton
          label="Sim"
          selected={respostas.interrompeuUso === true}
          onClick={() => onChange({ interrompeuUso: true })}
        />
        <OptionButton
          label="Não"
          selected={respostas.interrompeuUso === false}
          onClick={() => onChange({ interrompeuUso: false, efeitoInterrupcao: "" })}
        />
      </OptionGroup>

      {respostas.interrompeuUso === true && (
        <TextInput
          label="Qual efeito causou a interrupção?"
          value={respostas.efeitoInterrupcao || ""}
          onChange={(v) => onChange({ efeitoInterrupcao: v })}
          error={errors.efeitoInterrupcao}
        />
      )}
    </div>
  );
}

export function StepConteudo({ config, respostas, onChange, errors }: StepProps) {
  const toggleFonte = (item: string) => {
    const current = respostas.fontesInformacao || [];
    const next = current.includes(item) ? current.filter((s) => s !== item) : [...current, item];
    onChange({ fontesInformacao: next });
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-brand-900">Consumo de Conteúdo</h2>
      <p className="mb-6 text-sm text-slate-500">Onde você busca informações sobre tirzepatida?</p>

      <OptionGroup label="Onde busca informações?" error={errors.fontesInformacao}>
        {config.opcoes.fontesInformacao.map((opt) => (
          <CheckboxOption
            key={opt}
            label={opt}
            checked={(respostas.fontesInformacao || []).includes(opt)}
            onChange={() => toggleFonte(opt)}
          />
        ))}
      </OptionGroup>

      <OptionGroup label="Acompanha influenciadores?" error={errors.acompanhaInfluenciadores}>
        <OptionButton
          label="Sim"
          selected={respostas.acompanhaInfluenciadores === true}
          onClick={() => onChange({ acompanhaInfluenciadores: true })}
        />
        <OptionButton
          label="Não"
          selected={respostas.acompanhaInfluenciadores === false}
          onClick={() => onChange({ acompanhaInfluenciadores: false, influenciadores: "" })}
        />
      </OptionGroup>

      {respostas.acompanhaInfluenciadores === true && (
        <TextInput
          label="Quais influenciadores você acompanha?"
          value={respostas.influenciadores || ""}
          onChange={(v) => onChange({ influenciadores: v })}
          error={errors.influenciadores}
          placeholder="Nomes ou perfis que você segue"
        />
      )}

      <OptionGroup label="Que tipo de conteúdo prefere?" error={errors.tipoConteudo}>
        {config.opcoes.tipoConteudo.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={respostas.tipoConteudo === opt}
            onClick={() => onChange({ tipoConteudo: opt })}
          />
        ))}
      </OptionGroup>

      <TextInput
        label="O que falta hoje nesse mercado?"
        value={respostas.faltaMercado || ""}
        onChange={(v) => onChange({ faltaMercado: v })}
        error={errors.faltaMercado}
        placeholder="Sua opinião sobre o que o mercado precisa"
      />
    </div>
  );
}

export function StepConclusao({ config, respostas }: Pick<StepProps, "config" | "respostas">) {
  const lines = buildProfileSummary(respostas as Record<string, unknown>, config.marcas);

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
        ✓
      </div>
      <h2 className="mb-2 text-2xl font-bold text-brand-900">Obrigado por participar!</h2>
      <p className="mb-8 text-sm text-slate-600">
        Obrigado por participar da Pesquisa Nacional sobre o Uso de Tirzepatida no Brasil.
      </p>

      <div className="survey-card mx-auto max-w-md text-left">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Seu Perfil</h3>
        <ul className="space-y-2">
          {lines.map((line) => (
            <li key={line} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
