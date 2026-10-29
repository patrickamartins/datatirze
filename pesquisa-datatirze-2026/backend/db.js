const { FARMACIAS_E2, MARCAS_E2, EDICOES } = require("./editions");

async function ensureColumn(pool, table, column, definition) {
  await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
}

async function initPesquisaDb(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pesquisa_sessoes (
      id SERIAL PRIMARY KEY,
      session_token UUID UNIQUE NOT NULL,
      current_step INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'in_progress',
      respostas JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pesquisa_respostas (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES pesquisa_sessoes(id) ON DELETE SET NULL,
      session_token UUID NOT NULL,
      email TEXT,
      idade TEXT,
      genero TEXT,
      estado TEXT,
      cidade TEXT,
      escolaridade TEXT,
      faixa_renda TEXT,
      utilizou_tirzepatida BOOLEAN,
      pretende_utilizar TEXT,
      motivo_nao_utilizar TEXT,
      preco_justo_nao_usuario TEXT,
      tempo_uso TEXT,
      marca_atual TEXT,
      marcas_utilizadas TEXT[],
      melhor_marca TEXT,
      melhor_custo_beneficio TEXT,
      melhores_resultados TEXT,
      menor_resultado TEXT,
      onde_compra TEXT,
      como_conheceu TEXT,
      gasto_mensal TEXT,
      preco_justo TEXT,
      fatores_compra JSONB,
      peso_inicial NUMERIC,
      peso_atual NUMERIC,
      meta_peso NUMERIC,
      satisfacao INTEGER,
      expectativa_atingida TEXT,
      acompanhamento_medico BOOLEAN,
      acompanhamento_nutricional BOOLEAN,
      atividade_fisica TEXT,
      suplementacao TEXT[],
      efeitos_colaterais TEXT[],
      efeito_outro TEXT,
      efeito_mais_incomodo TEXT,
      interrompeu_uso BOOLEAN,
      efeito_interrupcao TEXT,
      fontes_informacao TEXT[],
      acompanha_influenciadores BOOLEAN,
      influenciadores TEXT,
      tipo_conteudo TEXT,
      falta_mercado TEXT,
      respostas_completas JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pesquisa_respostas_estado ON pesquisa_respostas(estado)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pesquisa_respostas_marca_atual ON pesquisa_respostas(marca_atual)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pesquisa_respostas_created_at ON pesquisa_respostas(created_at)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pesquisa_sessoes_token ON pesquisa_sessoes(session_token)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pesquisa_sessoes_status_updated
    ON pesquisa_sessoes(status, updated_at)
  `);

  await ensureColumn(pool, "pesquisa_respostas", "email", "TEXT");
  await ensureColumn(pool, "pesquisa_respostas", "concluida", "BOOLEAN DEFAULT FALSE");
  await ensureColumn(pool, "pesquisa_respostas", "edicao", "INTEGER NOT NULL DEFAULT 1");
  await ensureColumn(pool, "pesquisa_sessoes", "edicao", "INTEGER NOT NULL DEFAULT 1");
  await ensureColumn(pool, "pesquisa_respostas", "situacao_uso", "TEXT");
  await ensureColumn(pool, "pesquisa_respostas", "farmacia_confianca", "TEXT");
  await ensureColumn(pool, "pesquisa_respostas", "farmacia_ultima", "TEXT");
  await ensureColumn(pool, "pesquisa_respostas", "tipo_fornecedor", "TEXT");
  await ensureColumn(pool, "pesquisa_respostas", "shuffle_seed", "TEXT");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pesquisa_edicoes (
      id INTEGER PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      year INTEGER,
      started_at TIMESTAMP,
      ended_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  for (const ed of EDICOES) {
    await pool.query(
      `INSERT INTO pesquisa_edicoes (id, slug, title, status, year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         status = EXCLUDED.status,
         slug = EXCLUDED.slug,
         year = EXCLUDED.year`,
      [ed.id, ed.slug, ed.title, ed.status, ed.year]
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pesquisa_farmacias (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      pais TEXT,
      cidade TEXT,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  for (const f of FARMACIAS_E2.filter((x) => !["outros", "nao_conheco", "nao_lembro"].includes(x.id))) {
    await pool.query(
      `INSERT INTO pesquisa_farmacias (id, label, pais, cidade)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         label = EXCLUDED.label,
         pais = EXCLUDED.pais,
         cidade = EXCLUDED.cidade`,
      [f.id, f.label, f.pais || null, f.cidade || null]
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pesquisa_marcas_ref (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      ativo BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);

  for (const m of MARCAS_E2.filter((x) => !x.pinnedEnd)) {
    await pool.query(
      `INSERT INTO pesquisa_marcas_ref (id, label)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label`,
      [m.id, m.label]
    );
  }

  // Backfill seguro: linhas antigas ficam na edição 1
  await pool.query(`UPDATE pesquisa_respostas SET edicao = 1 WHERE edicao IS NULL`);
  await pool.query(`UPDATE pesquisa_sessoes SET edicao = 1 WHERE edicao IS NULL`);

  // Troca índice único global de e-mail por (email, edicao)
  await pool.query(`DROP INDEX IF EXISTS idx_pesquisa_respostas_email_concluida_unique`);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pesquisa_respostas_email_edicao_concluida_unique
    ON pesquisa_respostas (lower(email), edicao)
    WHERE email IS NOT NULL AND concluida = TRUE
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pesquisa_respostas_edicao ON pesquisa_respostas(edicao)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pesquisa_sessoes_edicao ON pesquisa_sessoes(edicao)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pesquisa_respostas_situacao ON pesquisa_respostas(situacao_uso)
  `);
}

module.exports = { initPesquisaDb };
