const express = require("express");
const crypto = require("crypto");
const { MARCAS, DOSES, ESTADOS_BR, OPCOES, TOTAL_STEPS } = require("./constants");
const { buildDashboardData } = require("./analytics");
const { rowsToCsv, rowsToExcelBuffer } = require("./export");
const { repairPesquisaRespostas } = require("./repair");

function normalizeEmail(email) {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildFilterQuery(query, { onlyCompleted = true } = {}) {
  const { estado, marca, dataInicio, dataFim } = query;
  const conditions = [];
  const params = [];

  if (onlyCompleted) {
    conditions.push("concluida = TRUE");
  }
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

function requirePesquisaAdmin(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado", code: "UNAUTHENTICATED" });
  }
  if (!req.user?.is_admin) {
    return res.status(403).json({
      error: "Acesso restrito a administradores da pesquisa",
      code: "FORBIDDEN",
    });
  }
  return next();
}

function createPesquisaRouter(pool, bcrypt) {
  const router = express.Router();

  // E-mail só conta como participante se a pesquisa foi concluída
  async function emailJaUtilizado(email, sessionToken) {
    const result = await pool.query(
      `SELECT pr.id
       FROM pesquisa_respostas pr
       WHERE lower(pr.email) = $1
         AND pr.session_token::text <> $2
         AND pr.concluida = TRUE
       LIMIT 1`,
      [email, sessionToken]
    );
    return result.rows.length > 0;
  }

  async function findIncompleteByEmail(email, excludeToken) {
    const result = await pool.query(
      `SELECT ps.session_token, ps.current_step, ps.respostas, ps.status, ps.updated_at
       FROM pesquisa_sessoes ps
       LEFT JOIN pesquisa_respostas pr ON pr.session_token = ps.session_token
       WHERE ps.status <> 'completed'
         AND COALESCE(pr.concluida, FALSE) = FALSE
         AND (
           lower(COALESCE(ps.respostas->>'email', '')) = $1
           OR lower(COALESCE(pr.email, '')) = $1
         )
         AND ps.session_token::text <> $2
       ORDER BY ps.updated_at DESC NULLS LAST
       LIMIT 1`,
      [email, excludeToken]
    );
    if (!result.rows.length) return null;
    const row = result.rows[0];
    return {
      sessionToken: row.session_token,
      currentStep: row.current_step,
      respostas: row.respostas || {},
      status: row.status,
    };
  }

  async function abandonIncompleteForEmail(email, keepToken) {
    await pool.query(
      `UPDATE pesquisa_sessoes
       SET status = 'abandoned',
           respostas = COALESCE(respostas, '{}'::jsonb) - 'email',
           updated_at = NOW()
       WHERE status <> 'completed'
         AND session_token::text <> $2
         AND (
           lower(COALESCE(respostas->>'email', '')) = $1
           OR session_token IN (
             SELECT session_token FROM pesquisa_respostas
             WHERE lower(email) = $1 AND concluida IS NOT TRUE
           )
         )`,
      [email, keepToken]
    );
    await pool.query(
      `UPDATE pesquisa_respostas
       SET email = NULL, updated_at = NOW()
       WHERE lower(email) = $1
         AND concluida IS NOT TRUE
         AND session_token::text <> $2`,
      [email, keepToken]
    );
  }

  async function markSessionAbandoned(token) {
    await pool.query(
      `UPDATE pesquisa_sessoes
       SET status = 'abandoned', updated_at = NOW()
       WHERE session_token = $1 AND status <> 'completed'`,
      [token]
    );
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
      fatores_compra: Array.isArray(r.fatoresCompra) ? JSON.stringify(r.fatoresCompra) : null,
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
      respostas_completas: JSON.stringify(r || {}),
    };
  }

  async function upsertResposta(sessionToken, sessionId, respostas, concluida = false) {
    const existing = await pool.query(
      "SELECT id, concluida FROM pesquisa_respostas WHERE session_token = $1",
      [sessionToken]
    );

    const keepCompleted = existing.rows[0]?.concluida === true;
    const row = mapRespostasToRow(sessionToken, sessionId, respostas, keepCompleted || concluida);

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
          error: "Este e-mail já concluiu a pesquisa. Cada pessoa pode participar apenas uma vez.",
          available: false,
        });
      }

      const resume = await findIncompleteByEmail(email, sessionToken);
      res.json({ available: true, email, resume });
    } catch (err) {
      console.error("Erro ao verificar e-mail:", err);
      res.status(500).json({ error: "Erro ao verificar e-mail", available: false });
    }
  });

  router.post("/sessao/:token/abandonar", async (req, res) => {
    try {
      await markSessionAbandoned(req.params.token);
      res.json({ success: true });
    } catch (err) {
      console.error("Erro ao abandonar sessão:", err);
      res.status(500).json({ error: "Erro ao abandonar sessão" });
    }
  });

  // Continuar sessão incompleta/abandonada encontrada pelo e-mail
  router.post("/sessao/retomar", async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const currentSessionToken = req.body.currentSessionToken;
      const resumeToken = req.body.resumeToken;

      if (!email || !isValidEmail(email) || !resumeToken) {
        return res.status(400).json({ error: "Dados inválidos para retomar a sessão" });
      }

      if (await emailJaUtilizado(email, resumeToken)) {
        return res.status(409).json({
          error: "Este e-mail já concluiu a pesquisa. Cada pessoa pode participar apenas uma vez.",
        });
      }

      const result = await pool.query(
        "SELECT * FROM pesquisa_sessoes WHERE session_token = $1",
        [resumeToken]
      );
      if (!result.rows.length) {
        return res.status(404).json({ error: "Sessão anterior não encontrada" });
      }

      const sessao = result.rows[0];
      if (sessao.status === "completed") {
        return res.status(409).json({ error: "Esta sessão já foi concluída" });
      }

      const respostas = { ...(sessao.respostas || {}), email };
      await pool.query(
        `UPDATE pesquisa_sessoes
         SET respostas = $1, status = 'in_progress', updated_at = NOW()
         WHERE session_token = $2`,
        [JSON.stringify(respostas), resumeToken]
      );
      await upsertResposta(resumeToken, sessao.id, respostas, false);

      if (currentSessionToken && currentSessionToken !== resumeToken) {
        await markSessionAbandoned(currentSessionToken);
      }

      res.json({
        sessionToken: resumeToken,
        currentStep: sessao.current_step,
        respostas,
        status: "in_progress",
      });
    } catch (err) {
      console.error("Erro ao retomar sessão:", err);
      res.status(500).json({ error: "Erro ao retomar pesquisa" });
    }
  });

  // Descartar progressos incompletos do e-mail e seguir com a sessão atual
  router.post("/sessao/reiniciar", async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const sessionToken = req.body.sessionToken;

      if (!email || !isValidEmail(email) || !sessionToken) {
        return res.status(400).json({ error: "Dados inválidos para reiniciar" });
      }

      if (await emailJaUtilizado(email, sessionToken)) {
        return res.status(409).json({
          error: "Este e-mail já concluiu a pesquisa. Cada pessoa pode participar apenas uma vez.",
        });
      }

      await abandonIncompleteForEmail(email, sessionToken);

      const existing = await pool.query(
        "SELECT * FROM pesquisa_sessoes WHERE session_token = $1",
        [sessionToken]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      const sessao = existing.rows[0];
      const respostas = { ...(sessao.respostas || {}), email };
      await pool.query(
        `UPDATE pesquisa_sessoes
         SET respostas = $1, status = 'in_progress', current_step = GREATEST(current_step, 1), updated_at = NOW()
         WHERE session_token = $2`,
        [JSON.stringify(respostas), sessionToken]
      );
      await upsertResposta(sessionToken, sessao.id, respostas, false);

      res.json({
        sessionToken,
        currentStep: Math.max(sessao.current_step || 1, 1),
        respostas,
        status: "in_progress",
      });
    } catch (err) {
      console.error("Erro ao reiniciar sessão:", err);
      res.status(500).json({ error: "Erro ao reiniciar pesquisa" });
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
      if (sessao.status === "completed") {
        return res.status(409).json({ error: "Esta pesquisa já foi concluída" });
      }

      const mergedRespostas = { ...sessao.respostas, ...respostas };
      const email = normalizeEmail(mergedRespostas.email);

      if (email) {
        if (!isValidEmail(email)) {
          return res.status(400).json({ error: "Informe um e-mail válido" });
        }
        if (await emailJaUtilizado(email, req.params.token)) {
          return res.status(409).json({
            error: "Este e-mail já concluiu a pesquisa. Cada pessoa pode participar apenas uma vez.",
          });
        }
        mergedRespostas.email = email;
      }

      const newStep = currentStep || sessao.current_step;
      // Sessão abandonada volta a in_progress ao salvar progresso
      let newStatus = status;
      if (!newStatus) {
        newStatus = sessao.status === "abandoned" ? "in_progress" : sessao.status;
      }

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
          error: "Este e-mail já concluiu a pesquisa. Cada pessoa pode participar apenas uma vez.",
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
          error: "Este e-mail já concluiu a pesquisa. Cada pessoa pode participar apenas uma vez.",
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
          error: "Este e-mail já concluiu a pesquisa. Cada pessoa pode participar apenas uma vez.",
        });
      }
      console.error("Erro ao concluir pesquisa:", err);
      res.status(500).json({ error: "Erro ao concluir pesquisa" });
    }
  });

  router.post("/admin/login", async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const senha = req.body.senha;

      if (!email || !senha) {
        return res.status(400).json({ error: "Informe e-mail e senha" });
      }

      const result = await pool.query("SELECT * FROM users WHERE lower(email) = $1", [email]);
      const user = result.rows[0];

      if (!user || !user.senha || !(await bcrypt.compare(senha, user.senha))) {
        return res.status(401).json({ error: "E-mail ou senha inválidos" });
      }

      if (!user.is_admin) {
        return res.status(403).json({ error: "Este usuário não tem acesso ao painel da pesquisa" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Erro no login admin:", err);
          return res.status(500).json({ error: "Erro ao autenticar" });
        }
        return res.json({
          success: true,
          user: { id: user.id, nome: user.nome, email: user.email },
        });
      });
    } catch (err) {
      console.error("Erro no login admin da pesquisa:", err);
      res.status(500).json({ error: "Erro ao processar login" });
    }
  });

  router.get("/admin/me", (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.is_admin) {
      return res.status(401).json({ authenticated: false });
    }
    res.json({
      authenticated: true,
      user: { id: req.user.id, nome: req.user.nome, email: req.user.email },
    });
  });

  router.post("/admin/logout", (req, res) => {
    req.logout(() => res.json({ success: true }));
  });

  router.get("/admin/dashboard", requirePesquisaAdmin, async (req, res) => {
    try {
      res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      });

      // Sempre sincroniza/repara antes de devolver números atualizados
      await repairPesquisaRespostas(pool);

      // Sessões paradas há mais de 3h sem concluir = abandonadas (não inflar "em andamento")
      await pool.query(`
        UPDATE pesquisa_sessoes
        SET status = 'abandoned', updated_at = NOW()
        WHERE status = 'in_progress'
          AND updated_at < NOW() - INTERVAL '3 hours'
      `);

      const { where, params } = buildFilterQuery(req.query, { onlyCompleted: true });
      const result = await pool.query(
        `SELECT * FROM pesquisa_respostas ${where} ORDER BY created_at DESC`,
        params
      );
      const rows = result.rows.map((row) => ({
        ...row,
        fatores_compra:
          typeof row.fatores_compra === "string" ? JSON.parse(row.fatores_compra || "[]") : row.fatores_compra,
      }));

      const [emAndamento, concluidas, comDados, abandonadas, abandonadasDetalhe] = await Promise.all([
        pool.query(`
          SELECT COUNT(*)::int AS total
          FROM pesquisa_sessoes
          WHERE status = 'in_progress'
            AND updated_at >= NOW() - INTERVAL '3 hours'
        `),
        pool.query(`SELECT COUNT(*)::int AS total FROM pesquisa_respostas WHERE concluida = TRUE`),
        pool.query(`SELECT COUNT(*)::int AS total FROM pesquisa_respostas WHERE email IS NOT NULL`),
        pool.query(`SELECT COUNT(*)::int AS total FROM pesquisa_sessoes WHERE status = 'abandoned'`),
        pool.query(`
          SELECT
            ps.session_token,
            ps.current_step,
            ps.status,
            ps.created_at,
            ps.updated_at,
            lower(COALESCE(NULLIF(pr.email, ''), NULLIF(ps.respostas->>'email', ''))) AS email,
            COALESCE(pr.estado, NULLIF(ps.respostas->>'estado', '')) AS estado,
            COALESCE(pr.cidade, NULLIF(ps.respostas->>'cidade', '')) AS cidade,
            COALESCE(pr.idade, NULLIF(ps.respostas->>'idade', '')) AS idade,
            COALESCE(pr.genero, NULLIF(ps.respostas->>'genero', '')) AS genero,
            COALESCE(
              pr.utilizou_tirzepatida,
              CASE
                WHEN ps.respostas->>'utilizouTirzepatida' = 'true' THEN TRUE
                WHEN ps.respostas->>'utilizouTirzepatida' = 'false' THEN FALSE
                ELSE NULL
              END
            ) AS utilizou_tirzepatida
          FROM pesquisa_sessoes ps
          LEFT JOIN pesquisa_respostas pr ON pr.session_token = ps.session_token
          WHERE ps.status = 'abandoned'
            AND COALESCE(pr.concluida, FALSE) = FALSE
            AND COALESCE(NULLIF(pr.email, ''), NULLIF(ps.respostas->>'email', '')) IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM pesquisa_respostas pr2
              WHERE pr2.concluida = TRUE
                AND lower(pr2.email) = lower(COALESCE(NULLIF(pr.email, ''), NULLIF(ps.respostas->>'email', '')))
            )
          ORDER BY ps.updated_at DESC
          LIMIT 500
        `),
      ]);

      // Um e-mail por linha (sessão mais recente)
      const emailsVistos = new Set();
      const sessoesAbandonadasLista = [];
      for (const row of abandonadasDetalhe.rows) {
        if (!row.email || emailsVistos.has(row.email)) continue;
        emailsVistos.add(row.email);
        sessoesAbandonadasLista.push({
          sessionToken: row.session_token,
          email: row.email,
          currentStep: row.current_step,
          status: row.status,
          estado: row.estado || null,
          cidade: row.cidade || null,
          idade: row.idade || null,
          genero: row.genero || null,
          utilizouTirzepatida: row.utilizou_tirzepatida,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }

      const dashboard = buildDashboardData(rows);
      dashboard.resumo = {
        respostasConcluidas: concluidas.rows[0].total,
        sessoesEmAndamento: emAndamento.rows[0].total,
        filtradas: rows.length,
        respostasComEmail: comDados.rows[0].total,
        sessoesAbandonadas: abandonadas.rows[0].total,
        sessoesAbandonadasComEmail: sessoesAbandonadasLista.length,
        atualizadoEm: new Date().toISOString(),
      };
      dashboard.sessoesAbandonadas = sessoesAbandonadasLista;

      res.json(dashboard);
    } catch (err) {
      console.error("Erro no dashboard da pesquisa:", err);
      res.status(500).json({ error: "Erro ao carregar dashboard" });
    }
  });

  router.get("/admin/export/csv", requirePesquisaAdmin, async (req, res) => {
    try {
      const { where, params } = buildFilterQuery(req.query, { onlyCompleted: true });
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

  router.get("/admin/export/excel", requirePesquisaAdmin, async (req, res) => {
    try {
      const { where, params } = buildFilterQuery(req.query, { onlyCompleted: true });
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

  router.get("/admin/export/abandonadas.csv", requirePesquisaAdmin, async (req, res) => {
    try {
      await pool.query(`
        UPDATE pesquisa_sessoes
        SET status = 'abandoned', updated_at = NOW()
        WHERE status = 'in_progress'
          AND updated_at < NOW() - INTERVAL '3 hours'
      `);

      const result = await pool.query(`
        SELECT
          ps.current_step,
          ps.created_at,
          ps.updated_at,
          lower(COALESCE(NULLIF(pr.email, ''), NULLIF(ps.respostas->>'email', ''))) AS email,
          COALESCE(pr.estado, NULLIF(ps.respostas->>'estado', '')) AS estado,
          COALESCE(pr.cidade, NULLIF(ps.respostas->>'cidade', '')) AS cidade,
          COALESCE(pr.idade, NULLIF(ps.respostas->>'idade', '')) AS idade,
          COALESCE(pr.genero, NULLIF(ps.respostas->>'genero', '')) AS genero,
          COALESCE(
            pr.utilizou_tirzepatida,
            CASE
              WHEN ps.respostas->>'utilizouTirzepatida' = 'true' THEN TRUE
              WHEN ps.respostas->>'utilizouTirzepatida' = 'false' THEN FALSE
              ELSE NULL
            END
          ) AS utilizou_tirzepatida
        FROM pesquisa_sessoes ps
        LEFT JOIN pesquisa_respostas pr ON pr.session_token = ps.session_token
        WHERE ps.status = 'abandoned'
          AND COALESCE(pr.concluida, FALSE) = FALSE
          AND COALESCE(NULLIF(pr.email, ''), NULLIF(ps.respostas->>'email', '')) IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM pesquisa_respostas pr2
            WHERE pr2.concluida = TRUE
              AND lower(pr2.email) = lower(COALESCE(NULLIF(pr.email, ''), NULLIF(ps.respostas->>'email', '')))
          )
        ORDER BY ps.updated_at DESC
      `);

      const emailsVistos = new Set();
      const lines = ["email;etapa;estado;cidade;idade;genero;utilizou_tirzepatida;criado_em;atualizado_em"];
      for (const row of result.rows) {
        if (!row.email || emailsVistos.has(row.email)) continue;
        emailsVistos.add(row.email);
        const utilizou =
          row.utilizou_tirzepatida === true ? "sim" : row.utilizou_tirzepatida === false ? "nao" : "";
        lines.push(
          [
            row.email,
            row.current_step ?? "",
            row.estado || "",
            row.cidade || "",
            row.idade || "",
            row.genero || "",
            utilizou,
            row.created_at ? new Date(row.created_at).toISOString() : "",
            row.updated_at ? new Date(row.updated_at).toISOString() : "",
          ]
            .map((v) => String(v).replace(/;/g, ","))
            .join(";")
        );
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="pesquisa-sessoes-abandonadas-mailing.csv"'
      );
      res.send("\uFEFF" + lines.join("\n"));
    } catch (err) {
      console.error("Erro na exportação de abandonadas:", err);
      res.status(500).json({ error: "Erro ao exportar sessões abandonadas" });
    }
  });

  return router;
}

module.exports = { createPesquisaRouter };
