function looksComplete(respostas = {}) {
  if (!respostas.email) return false;

  if (respostas.utilizouTirzepatida === false) {
    return Boolean(
      respostas.pretendeUtilizar &&
        respostas.motivoNaoUtilizar &&
        respostas.precoJustoNaoUsuario &&
        respostas.idade &&
        respostas.genero &&
        respostas.estado
    );
  }

  if (respostas.utilizouTirzepatida === true) {
    return Boolean(
      respostas.idade &&
        respostas.marcaAtual &&
        respostas.ondeCompra &&
        respostas.fontesInformacao &&
        respostas.tipoConteudo &&
        respostas.faltaMercado
    );
  }

  return false;
}

/**
 * Repara sessões que chegaram ao fim (ex.: etapa 9) mas ficaram como in_progress
 * por bug antigo de não chamar /concluir.
 */
async function repairPesquisaRespostas(pool) {
  const sessoes = await pool.query(`
    SELECT id, session_token, current_step, status, respostas
    FROM pesquisa_sessoes
    WHERE status = 'in_progress'
       OR current_step >= 9
  `);

  let repaired = 0;

  for (const sessao of sessoes.rows) {
    const respostas = sessao.respostas || {};
    const shouldComplete =
      sessao.status === "completed" ||
      sessao.current_step >= 9 ||
      looksComplete(respostas);

    if (!shouldComplete) continue;

    const email = typeof respostas.email === "string" ? respostas.email.trim().toLowerCase() : null;
    if (!email) continue;

    // Evita conflito com e-mail já concluído em outra sessão
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
      fatores_compra: Array.isArray(r.fatoresCompra) ? r.fatoresCompra : null,
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
      respostas_completas: r || {},
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
  }

  // Marca como concluídas respostas cujo JSON já está completo mas flag ficou false
  const orphan = await pool.query(`
    UPDATE pesquisa_respostas
    SET concluida = TRUE, updated_at = NOW()
    WHERE concluida IS NOT TRUE
      AND email IS NOT NULL
      AND (
        (utilizou_tirzepatida = FALSE AND pretende_utilizar IS NOT NULL)
        OR (utilizou_tirzepatida = TRUE AND falta_mercado IS NOT NULL AND marca_atual IS NOT NULL)
      )
    RETURNING id
  `);

  repaired += orphan.rowCount || 0;

  if (repaired > 0) {
    console.log(`[pesquisa] Reparadas ${repaired} respostas/sessões que estavam incompletas no status.`);
  }

  return repaired;
}

module.exports = { repairPesquisaRespostas, looksComplete };
