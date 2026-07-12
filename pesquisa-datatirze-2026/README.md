# Pesquisa Nacional sobre o Uso de Tirzepatida no Brasil — 2026

Módulo de pesquisa de mercado integrado ao DataTirze.

## Funcionalidades

- Formulário multi-step com lógica condicional (5–8 min)
- Salvamento automático a cada etapa
- Barra de progresso e retomada por sessão (localStorage + PostgreSQL)
- Validação de campos por etapa
- Painel administrativo protegido com gráficos Recharts
- Exportação CSV e Excel
- Filtros por período, estado e marca
- Insights estatísticos automáticos

## Estrutura

```
pesquisa-datatirze-2026/
├── backend/          # API Express (rotas, analytics, exportação)
├── frontend/         # React + Vite + TypeScript + Tailwind
└── dist/             # Build de produção (gerado)
```

## URLs

| Rota | Descrição |
|------|-----------|
| `/pesquisa/` | Formulário público da pesquisa |
| `/pesquisa/admin` | Painel administrativo (requer login) |
| `/api/pesquisa/*` | API REST da pesquisa |

## Instalação

```bash
# Na raiz do projeto
npm install

# Frontend da pesquisa
npm run pesquisa:install
npm run pesquisa:build
```

## Desenvolvimento

```bash
# Terminal 1 — servidor Express
npm start

# Terminal 2 — frontend com hot reload
npm run pesquisa:dev
```

O Vite dev server (porta 5173) faz proxy das rotas `/api/pesquisa` para `localhost:3000`.

## Banco de dados

As tabelas são criadas automaticamente na inicialização:

- `pesquisa_sessoes` — rascunhos e progresso por sessão
- `pesquisa_respostas` — respostas estruturadas

## Marcas consideradas

| Marca | Fabricante |
|-------|------------|
| TG | Indufar |
| Lipoless | Éticos |
| Slimex | Éticos |
| Tirzec | Quimfa |
| Lipoland | Landerlan |
| Tirzedral | Catedral |
| T36 | Catedral |
| Gluconex | Lasca |

## Fluxo condicional

1. **Etapa 1** — Perfil (todos)
2. **Etapa 2** — Experiência com tirzepatida
   - Se **Não** → 3 perguntas resumidas → encerra
   - Se **Sim** → etapas 3–8 → conclusão
3. **Etapas 3–8** — Histórico, compra, resultados, saúde, efeitos, conteúdo
4. **Etapa 9** — Dashboard pessoal + agradecimento

## Admin

Acesse `/pesquisa/admin` (login em `/pesquisa/admin/login`).

### Usuário administrativo (criado automaticamente no boot)

| Campo | Valor padrão | Variável de ambiente |
|-------|--------------|----------------------|
| E-mail | `admin@datatirze.com` | `PESQUISA_ADMIN_EMAIL` |
| Senha | `DataTirzeAdmin2026!` | `PESQUISA_ADMIN_PASSWORD` |
| Nome | Admin Pesquisa DataTirze | `PESQUISA_ADMIN_NOME` |

Para forçar reset da senha no próximo deploy: `PESQUISA_ADMIN_RESET_PASSWORD=true`.

O painel exibe:

- Quantidade de respostas concluídas e sessões em andamento
- Distribuição demográfica
- Marcas utilizadas e percebidas
- Hábitos de compra e preço justo
- Efeitos colaterais e acompanhamento
- Canais de compra e consumo de conteúdo
- Respostas abertas (amostra)
- Insights automáticos

Exportação disponível em CSV e Excel com os filtros aplicados.
