const express = require("express");
const crypto = require("crypto");
const { MARCAS, DOSES, ESTADOS_BR, OPCOES, TOTAL_STEPS } = require("./constants");
const { buildDashboardData } = require("./analytics");
const { rowsToCsv, rowsToExcelBuffer } = require("./export");

function normalizeEmail(email) {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createPesquisaRouter(pool, requireAuth) {
  const router = express.Router();

  async function emailJaUtilizado(email, sessionToken) {
    const result = await pool.query(
      `SELECT pr.id
       FROM pesquisa_respostas pr
       LEFT JOIN pesquisa_sessoes ps ON ps.session_token = pr.session_token
       WHERE lower(pr.email) = $1
         AND pr.session_token::text <> $2
         AND (pr.concluida = TRUE OR ps.status = 'completed')
       LIMIT 1`,
      [email, sessionToken]
    );
    return result.rows.length > 0;
  }

  function mapRespostasToRow(sessionToken, sessionId, respostas, concluida = false) {
    const r = respostas || {};
    return {
      session_id: sessionId,
      session_token: sessionToken,
      email: normalizeEmail(r.email),
      concluida: Boolean(concluida),
      idade: r.idade || null,
      genero: r.genero || null,
      estado: r.estado || null,
      cidade: r.cidade || null,
      escolaridade: r.escolaridade || null,
      faixa_renda: r.faixaRenda || null,
      utilizou_tirzepatida: r.utilizouTirzepatida === true ? true : r.utilizouTirzepatida === false ? false : null,
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
      peso_inicial: r.pesoInicial !== undefined && r.pesoInicial !== null && r.pesoInicial !== ""
        ? Number(r.pesoInicial)
        : null,
      peso_atual: r.pesoAtual !== undefined && r.pesoAtual !== null && r.pesoAtual !== ""
        ? Number(r.pesoAtual)
        : null,
      meta_peso: r.metaPeso !== undefined && r.metaPeso !== null && r.metaPeso !== ""
        ? Number(r.metaPeso)
        : null,
      satisfacao: r.satisfacao !== undefined && r.satisfacao !== null && r.satisfacao !== ""
        ? Number(r.satisfacao)
        : null,
      expectativa_atingida: r.expectativaAtingida || null,
      acompanhamento_medico: r.acompanhamentoMedico === true ? true : r.acompanhamentoMedico === false ? false : null,
      acompanhamento_nutricional:
        r.acompanhamentoNutricional === true ? true : r.acompanhamentoNutricional === false ? false : null,
      atividade_fisica: r.atividadeFisica || null,
      suplementacao: Array.isArray(r.suplementacao) ? r.suplementacao : null,
      efeitos_colaterais: Array.isArray(r.efeitosColaterais) ? r.efeitosColaterais : null,
      efeito_outro: r.efeitoOutro || null,
      efeito_mais_incomodo: r.efeitoMaisIncomodo || null,
      interrompeu_uso: r.interrompeuUso === true ? true : r.interrompeuUso === false ? false : null,
      efeito_interrupcao: r.efeitoInterrupcao || null,
      fontes_informacao: Array.isArray(r.fontesInformacao) ? r.fontesInformacao : null,
      acompanha_influenciadores:
        r.acompanhaInfluenciadores === true ? true : r.acompanhaInfluenciadores === false ? false : null,
      influenciadores: r.influenciadores || null,
      tipo_conteudo: r.tipoConteudo || null,
      falta_mercado: r.faltaMercado || null,
      respostas_completas: r || {},
    };
  }

  async function upsertResposta(sessionToken, sessionId, respostas, concluida = false) {
    const row = mapRespostasToRow(sessionToken, sessionId, respostas, concluida);
    const existing = await pool.query(
      "SELECT id FROM pesquisa_respostas WHERE session_token = $1",
      [sessionToken]
    );

    if (existing.rows.length > 0) {
      const fields = Object.keys(row).filter((k) => k !== "session_token" && k !== "session_id");
      const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
      const values = [sessionToken, ...fields.map((f) => row[f])];
      await pool.query(
        `UPDATE pesquisa_respostas SET ${sets}, updated_at = NOW() WHERE session_token = $1`,
        values
      );
      return existing.rows[0].id;
    }

    const cols = Object.keys(row);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pool.query(
      `INSERT INTO pesquisa_respostas (${cols.join(", ")}) VALUES (${placeholders}) RETURNING id`,
      cols.map((c) => row[c])
    );
    return result.rows[0].id;
  }

  function buildFilterQuery(query) {
    const { estado, marca, dataInicio, dataFim } = query;
    const conditions = [];
    const params = [];

    if (estado) {
      params.push(estado);
      conditions.push(`estado = $${params.length}`);
    }
    if (marca) {
      params.push(marca);
      conditions.push(`marca_atual = $${params.length}`);
    }
    if (dataInicio) {
      params.push(dataInicio);
      conditions.push(`created_at >= $${params.length}::date`);
    }
    if (dataFim) {
      params.push(dataFim);
      conditions.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return { where, params };
  }

  router.get("/config", (_req, res) => {
    res.json({
      marcas: MARCAS,
      doses: DOSES,
      estados: ESTADOS_BR,
      opcoes: OPCOES,
      totalSteps: TOTAL_STEPS,
    });
  });

  router.post("/verificar-email", async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const sessionToken = req.body.sessionToken;

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Informe um e-mail válido", available: false });
      }
      if (!sessionToken) {
        return res.status(400).json({ error: "Sessão inválida", available: false });
      }

      if (await emailJaUtilizado(email, sessionToken)) {
        return res.status(409).json({
          error: "Este e-mail já respondeu a pesquisa. Cada pessoa pode participar apenas uma vez.",
          available: false,
        });
      }

      res.json({ available: true, email });
    } catch (err) {
      console.error("Erro ao verificar e-mail:", err);
      res.status(500).json({ error: "Erro ao verificar e-mail", available: false });
    }
  });

  router.post("/sessao", async (_req, res) => {
    try {
      const token = crypto.randomUUID();
      const result = await pool.query(
        `INSERT INTO pesquisa_sessoes (session_token) VALUES ($1) RETURNING *`,
        [token]
      );
      res.json({
        sessionToken: result.rows[0].session_token,
        currentStep: result.rows[0].current_step,
        respostas: result.rows[0].respostas,
        status: result.rows[0].status,
      });
    } catch (err) {
      console.error("Erro ao criar sessão:", err);
      res.status(500).json({ error: "Erro ao criar sessão" });
    }
  });

  router.get("/sessao/:token", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM pesquisa_sessoes WHERE session_token = $1",
        [req.params.token]
      );
      if (!result.rows.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }
      const sessao = result.rows[0];
      res.json({
        sessionToken: sessao.session_token,
        currentStep: sessao.current_step,
        respostas: sessao.respostas,
        status: sessao.status,
      });
    } catch (err) {
      console.error("Erro ao buscar sessão:", err);
      res.status(500).json({ error: "Erro ao buscar sessão" });
    }
  });

  router.patch("/sessao/:token", async (req, res) => {
    const { currentStep, respostas, status } = req.body;
    try {
      const existing = await pool.query(
        "SELECT * FROM pesquisa_sessoes WHERE session_token = $1",
        [req.params.token]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      const sessao = existing.rows[0];
      const mergedRespostas = { ...sessao.respostas, ...respostas };
      const email = normalizeEmail(mergedRespostas.email);

      if (email) {
        if (!isValidEmail(email)) {
          return res.status(400).json({ error: "Informe um e-mail válido" });
        }
        if (await emailJaUtilizado(email, req.params.token)) {
          return res.status(409).json({
            error: "Este e-mail já respondeu a pesquisa. Cada pessoa pode participar apenas uma vez.",
          });
        }
        mergedRespostas.email = email;
      }

      const newStep = currentStep || sessao.current_step;
      const newStatus = status || sessao.status;

      await pool.query(
        `UPDATE pesquisa_sessoes
         SET current_step = $1, respostas = $2, status = $3, updated_at = NOW(),
             completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE completed_at END
         WHERE session_token = $4`,
        [newStep, JSON.stringify(mergedRespostas), newStatus, req.params.token]
      );

      await upsertResposta(req.params.token, sessao.id, mergedRespostas, newStatus === "completed");

      res.json({
        sessionToken: req.params.token,
        currentStep: newStep,
        respostas: mergedRespostas,
        status: newStatus,
        saved: true,
      });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({
          error: "Este e-mail já respondeu a pesquisa. Cada pessoa pode participar apenas uma vez.",
        });
      }
      console.error("Erro ao salvar sessão:", err);
      res.status(500).json({ error: "Erro ao salvar progresso" });
    }
  });

  router.post("/sessao/:token/concluir", async (req, res) => {
    try {
      const existing = await pool.query(
        "SELECT * FROM pesquisa_sessoes WHERE session_token = $1",
        [req.params.token]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      const sessao = existing.rows[0];
      const mergedRespostas = { ...sessao.respostas, ...req.body.respostas };
      const email = normalizeEmail(mergedRespostas.email);

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Informe um e-mail válido para concluir a pesquisa" });
      }
      if (await emailJaUtilizado(email, req.params.token)) {
        return res.status(409).json({
          error: "Este e-mail já respondeu a pesquisa. Cada pessoa pode participar apenas uma vez.",
        });
      }
      mergedRespostas.email = email;

      await pool.query(
        `UPDATE pesquisa_sessoes
         SET respostas = $1, status = 'completed', current_step = $2, updated_at = NOW(), completed_at = NOW()
         WHERE session_token = $3`,
        [JSON.stringify(mergedRespostas), TOTAL_STEPS, req.params.token]
      );

      await upsertResposta(req.params.token, sessao.id, mergedRespostas, true);

      res.json({ success: true, respostas: mergedRespostas });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({
          error: "Este e-mail já respondeu a pesquisa. Cada pessoa pode participar apenas uma vez.",
        });
      }
      console.error("Erro ao concluir pesquisa:", err);
      res.status(500).json({ error: "Erro ao concluir pesquisa" });
    }
  });

  router.get("/admin/dashboard", requireAuth, async (req, res) => {
    try {
      const { where, params } = buildFilterQuery(req.query);
      const result = await pool.query(
        `SELECT * FROM pesquisa_respostas ${where} ORDER BY created_at DESC`,
        params
      );
      const rows = result.rows.map((row) => ({
        ...row,
        fatores_compra: typeof row.fatores_compra === "string" ? JSON.parse(row.fatores_compra || "[]") : row.fatores_compra,
      }));
      res.json(buildDashboardData(rows));
    } catch (err) {
      console.error("Erro no dashboard da pesquisa:", err);
      res.status(500).json({ error: "Erro ao carregar dashboard" });
    }
  });

  router.get("/admin/export/csv", requireAuth, async (req, res) => {
    try {
      const { where, params } = buildFilterQuery(req.query);
      const result = await pool.query(
        `SELECT * FROM pesquisa_respostas ${where} ORDER BY created_at DESC`,
        params
      );
      const csv = rowsToCsv(result.rows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="pesquisa-tirzepatida-2026.csv"');
      res.send("\uFEFF" + csv);
    } catch (err) {
      console.error("Erro na exportação CSV:", err);
      res.status(500).json({ error: "Erro na exportação CSV" });
    }
  });

  router.get("/admin/export/excel", requireAuth, async (req, res) => {
    try {
      const { where, params } = buildFilterQuery(req.query);
      const result = await pool.query(
        `SELECT * FROM pesquisa_respostas ${where} ORDER BY created_at DESC`,
        params
      );
      const buffer = rowsToExcelBuffer(result.rows);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="pesquisa-tirzepatida-2026.xlsx"');
      res.send(buffer);
    } catch (err) {
      console.error("Erro na exportação Excel:", err);
      res.status(500).json({ error: err.message || "Erro na exportação Excel" });
    }
  });

  return router;
}

module.exports = { createPesquisaRouter };
