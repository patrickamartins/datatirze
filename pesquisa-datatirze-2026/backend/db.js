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
}

module.exports = { initPesquisaDb };
