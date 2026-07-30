/** Minutos sem atividade a partir dos quais a sessão deixa de ser considerada ativa. */
const ACTIVE_WINDOW_MINUTES = 15;

/** O repair é caro: nunca roda mais de uma vez neste intervalo. */
const REPAIR_MIN_INTERVAL_MS = 5 * 60 * 1000;

/** Teto de sessões avaliadas por execução, para não varrer a tabela inteira. */
const REPAIR_BATCH_LIMIT = 200;

let lastRepairAt = 0;
let repairInFlight = null;

function looksComplete(respostas = {}) {
  if (!respostas.email) return false;

  const utilizou = respostas.utilizouTirzepatida;
  const utilizouBool =
    utilizou === true || utilizou === "true" ? true : utilizou === false || utilizou === "false" ? false : null;

  // Quem não utiliza encerra na etapa 2: estes campos já são o fim do questionário.
  if (utilizouBool === false) {
    return Boolean(
      respostas.pretendeUtilizar &&
        respostas.motivoNaoUtilizar &&
        respostas.precoJustoNaoUsuario &&
        respostas.idade &&
        respostas.genero &&
        respostas.estado
    );
  }

  // Quem utiliza só termina na etapa 8; exigir os campos dessa etapa evita
  // marcar como concluída a sessão de alguém que ainda está respondendo.
  if (utilizouBool === true) {
    return Boolean(
      respostas.idade &&
        respostas.marcaAtual &&
        respostas.tipoConteudo &&
        respostas.faltaMercado &&
        Array.isArray(respostas.fontesInformacao) &&
        respostas.fontesInformacao.length > 0
    );
  }

  return false;
}

/** node-pg serializa Array JS como array Postgres; JSONB precisa de string JSON. */
function toJsonb(value) {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

/**
 * Repara sessões que chegaram ao fim (ex.: etapa 9) mas ficaram como in_progress
 * por bug antigo de não chamar /concluir.
 *
 * Só considera sessões paradas há mais de ACTIVE_WINDOW_MINUTES: uma sessão ainda
 * ativa não pode ser fechada por baixo de quem está respondendo, senão os
 * salvamentos seguintes passam a falhar com "pesquisa já concluída".
 */
async function runRepair(pool) {
  const sessoes = await pool.query(
    `SELECT id, session_token, current_step, status, respostas
     FROM pesquisa_sessoes
     WHERE status <> 'completed'
       AND NULLIF(respostas->>'email', '') IS NOT NULL
       AND updated_at < NOW() - ($1 * INTERVAL '1 minute')
       AND (current_step >= 8 OR respostas->>'utilizouTirzepatida' = 'false')
     ORDER BY updated_at DESC
     LIMIT $2`,
    [ACTIVE_WINDOW_MINUTES, REPAIR_BATCH_LIMIT]
  );

  let repaired = 0;

  for (const sessao of sessoes.rows) {
    try {
      const respostas = sessao.respostas || {};
      const shouldComplete = sessao.current_step >= 9 || looksComplete(respostas);

      if (!shouldComplete) continue;

      const email = typeof respostas.email === "string" ? respostas.email.trim().toLowerCase() : null;
      if (!email) continue;

      const conflito = await pool.query(
        `SELECT id FROM pesquisa_respostas
         WHERE lower(email) = $1
           AND session_token::text <> $2
           AND concluida = TRUE
         LIMIT 1`,
        [email, sessao.session_token]
      );
      if (conflito.rows.length) continue;

      await pool.query(
        `UPDATE pesquisa_sessoes
         SET status = 'completed',
             current_step = GREATEST(current_step, 9),
             completed_at = COALESCE(completed_at, NOW()),
             updated_at = NOW()
         WHERE id = $1`,
        [sessao.id]
      );

      const existing = await pool.query(
        "SELECT id FROM pesquisa_respostas WHERE session_token = $1",
        [sessao.session_token]
      );

      const r = respostas;
      const payload = {
        session_id: sessao.id,
        session_token: sessao.session_token,
        email,
        concluida: true,
        idade: r.idade || null,
        genero: r.genero || null,
        estado: r.estado || null,
        cidade: r.cidade || null,
        escolaridade: r.escolaridade || null,
        faixa_renda: r.faixaRenda || null,
        utilizou_tirzepatida:
          r.utilizouTirzepatida === true ? true : r.utilizouTirzepatida === false ? false : null,
        pretende_utilizar: r.pretendeUtilizar || null,
        motivo_nao_utilizar: r.motivoNaoUtilizar || null,
        preco_justo_nao_usuario: r.precoJustoNaoUsuario || null,
        tempo_uso: r.tempoUso || null,
        marca_atual: r.marcaAtual || null,
        marcas_utilizadas: Array.isArray(r.marcasUtilizadas) ? r.marcasUtilizadas : null,
        melhor_marca: r.melhorMarca || null,
        melhor_custo_beneficio: r.melhorCustoBeneficio || null,
        melhores_resultados: r.melhoresResultados || null,
        menor_resultado: r.menorResultado || null,
        onde_compra: r.ondeCompra || null,
        como_conheceu: r.comoConheceu || null,
        gasto_mensal: r.gastoMensal || null,
        preco_justo: r.precoJusto || null,
        fatores_compra: Array.isArray(r.fatoresCompra) ? toJsonb(r.fatoresCompra) : null,
        peso_inicial: r.pesoInicial != null && r.pesoInicial !== "" ? Number(r.pesoInicial) : null,
        peso_atual: r.pesoAtual != null && r.pesoAtual !== "" ? Number(r.pesoAtual) : null,
        meta_peso: r.metaPeso != null && r.metaPeso !== "" ? Number(r.metaPeso) : null,
        satisfacao: r.satisfacao != null && r.satisfacao !== "" ? Number(r.satisfacao) : null,
        expectativa_atingida: r.expectativaAtingida || null,
        acompanhamento_medico:
          r.acompanhamentoMedico === true ? true : r.acompanhamentoMedico === false ? false : null,
        acompanhamento_nutricional:
          r.acompanhamentoNutricional === true
            ? true
            : r.acompanhamentoNutricional === false
              ? false
              : null,
        atividade_fisica: r.atividadeFisica || null,
        suplementacao: Array.isArray(r.suplementacao) ? r.suplementacao : null,
        efeitos_colaterais: Array.isArray(r.efeitosColaterais) ? r.efeitosColaterais : null,
        efeito_outro: r.efeitoOutro || null,
        efeito_mais_incomodo: r.efeitoMaisIncomodo || null,
        interrompeu_uso: r.interrompeuUso === true ? true : r.interrompeuUso === false ? false : null,
        efeito_interrupcao: r.efeitoInterrupcao || null,
        fontes_informacao: Array.isArray(r.fontesInformacao) ? r.fontesInformacao : null,
        acompanha_influenciadores:
          r.acompanhaInfluenciadores === true
            ? true
            : r.acompanhaInfluenciadores === false
              ? false
              : null,
        influenciadores: r.influenciadores || null,
        tipo_conteudo: r.tipoConteudo || null,
        falta_mercado: r.faltaMercado || null,
        respostas_completas: toJsonb(r || {}),
      };

      if (existing.rows.length > 0) {
        const fields = Object.keys(payload).filter((k) => k !== "session_token" && k !== "session_id");
        const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
        await pool.query(
          `UPDATE pesquisa_respostas SET ${sets}, updated_at = NOW() WHERE session_token = $1`,
          [sessao.session_token, ...fields.map((f) => payload[f])]
        );
      } else {
        const cols = Object.keys(payload);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        await pool.query(
          `INSERT INTO pesquisa_respostas (${cols.join(", ")}) VALUES (${placeholders})`,
          cols.map((c) => payload[c])
        );
      }

      repaired += 1;
    } catch (err) {
      console.error(`[pesquisa] Falha ao reparar sessão ${sessao.session_token}:`, err.message);
    }
  }

  try {
    const orphan = await pool.query(
      `UPDATE pesquisa_respostas
       SET concluida = TRUE, updated_at = NOW()
       WHERE concluida IS NOT TRUE
         AND email IS NOT NULL
         AND updated_at < NOW() - ($1 * INTERVAL '1 minute')
         AND (
           (utilizou_tirzepatida = FALSE AND pretende_utilizar IS NOT NULL)
           OR (
             utilizou_tirzepatida = TRUE
             AND marca_atual IS NOT NULL
             AND falta_mercado IS NOT NULL
             AND tipo_conteudo IS NOT NULL
             AND fontes_informacao IS NOT NULL
           )
         )
       RETURNING id`,
      [ACTIVE_WINDOW_MINUTES]
    );
    repaired += orphan.rowCount || 0;
  } catch (err) {
    console.error("[pesquisa] Falha no update órfão de concluida:", err.message);
  }

  if (repaired > 0) {
    console.log(`[pesquisa] Reparadas ${repaired} respostas/sessões que estavam incompletas no status.`);
  }

  return repaired;
}

/**
 * O repair faz várias queries por sessão. Chamado a cada carga do painel ele
 * esgotava o pool de conexões e derrubava os salvamentos de quem respondia,
 * então aqui ele é limitado por intervalo e nunca roda em paralelo consigo mesmo.
 */
async function repairPesquisaRespostas(pool, { force = false } = {}) {
  if (repairInFlight) return repairInFlight;
  if (!force && Date.now() - lastRepairAt < REPAIR_MIN_INTERVAL_MS) return 0;

  repairInFlight = runRepair(pool)
    .catch((err) => {
      console.error("[pesquisa] Repair falhou:", err.message);
      return 0;
    })
    .finally(() => {
      lastRepairAt = Date.now();
      repairInFlight = null;
    });

  return repairInFlight;
}

module.exports = {
  repairPesquisaRespostas,
  looksComplete,
  ACTIVE_WINDOW_MINUTES,
};
