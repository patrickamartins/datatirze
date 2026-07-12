import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChartPanel, ChartCard, PieChartPanel, StatCard } from "@/components/charts";
import { adminLogout, adminMe, fetchDashboard, getExportUrl } from "@/lib/api";
import type { DashboardData } from "@/types/pesquisa";
import { Download, RefreshCw, LogOut } from "lucide-react";

export function AdminPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    estado: "",
    marca: "",
    dataInicio: "",
    dataFim: "",
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const me = await adminMe();
        if (!me.authenticated) {
          navigate("/admin/login", { replace: true });
          return;
        }
        setAdminName(me.user?.nome || "Admin");
        setAuthChecked(true);
      } catch {
        navigate("/admin/login", { replace: true });
      }
    }
    checkAuth();
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filters.estado) params.estado = filters.estado;
      if (filters.marca) params.marca = filters.marca;
      if (filters.dataInicio) params.dataInicio = filters.dataInicio;
      if (filters.dataFim) params.dataFim = filters.dataFim;
      const result = await fetchDashboard(params);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dados";
      if (message.includes("Não autenticado") || message.includes("restrito")) {
        navigate("/admin/login", { replace: true });
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, navigate]);

  useEffect(() => {
    if (!authChecked) return;
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [authChecked, load]);

  function handleExport(format: "csv" | "excel") {
    const params: Record<string, string> = {};
    if (filters.estado) params.estado = filters.estado;
    if (filters.marca) params.marca = filters.marca;
    if (filters.dataInicio) params.dataInicio = filters.dataInicio;
    if (filters.dataFim) params.dataFim = filters.dataFim;
    window.open(getExportUrl(format, params), "_blank");
  }

  async function handleLogout() {
    try {
      await adminLogout();
    } catch {
      // segue para login mesmo se a sessão já tiver expirado
    }
    navigate("/admin/login", { replace: true });
  }

  if (!authChecked || (loading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <button type="button" onClick={load} className="btn-primary">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Admin · DataTirze 2026</p>
            <h1 className="text-xl font-bold text-brand-900">Painel da Pesquisa Nacional</h1>
            <p className="text-xs text-slate-500">Olá, {adminName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} className="btn-secondary flex items-center gap-2 text-xs">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
            <button type="button" onClick={() => handleExport("csv")} className="btn-secondary flex items-center gap-2 text-xs">
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button type="button" onClick={() => handleExport("excel")} className="btn-secondary flex items-center gap-2 text-xs">
              <Download className="h-4 w-4" />
              Excel
            </button>
            <button type="button" onClick={handleLogout} className="btn-secondary flex items-center gap-2 text-xs">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Respostas concluídas"
            value={data.resumo?.respostasConcluidas ?? data.total}
          />
          <StatCard
            label="Exibidas nos filtros"
            value={data.resumo?.filtradas ?? data.total}
          />
          <StatCard
            label="Com e-mail no banco"
            value={data.resumo?.respostasComEmail ?? data.total}
          />
          <StatCard
            label="Sessões em andamento"
            value={data.resumo?.sessoesEmAndamento ?? 0}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Já utilizaram tirzepatida" value={data.utilizadores} />
          <StatCard label="Nunca utilizaram" value={data.naoUtilizadoresTotal} />
          <StatCard label="Satisfação média" value={`${data.saude.satisfacaoMedia}/10`} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Filtros</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Estado</label>
              <select
                value={filters.estado}
                onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {data.filtros.estados.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Marca</label>
              <select
                value={filters.marca}
                onChange={(e) => setFilters((f) => ({ ...f, marca: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {data.filtros.marcas.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Data início</label>
              <input
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters((f) => ({ ...f, dataInicio: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Data fim</label>
              <input
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters((f) => ({ ...f, dataFim: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {data.insights.length > 0 && (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 sm:p-6">
            <h2 className="mb-3 text-sm font-semibold text-brand-900">Insights automáticos</h2>
            <ul className="space-y-2">
              {data.insights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-sm text-brand-800">
                  <span className="font-bold text-brand-600">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Distribuição por idade">
            <BarChartPanel data={data.demografia.idade} />
          </ChartCard>
          <ChartCard title="Distribuição por gênero">
            <PieChartPanel data={data.demografia.genero} />
          </ChartCard>
          <ChartCard title="Distribuição por estado">
            <BarChartPanel data={data.demografia.estado.slice(0, 10)} layout="horizontal" />
          </ChartCard>
          <ChartCard title="Faixa de renda">
            <BarChartPanel data={data.demografia.faixaRenda} color="#22c55e" />
          </ChartCard>
        </div>

        <h2 className="text-lg font-bold text-brand-900">Marcas</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Marca atual">
            <PieChartPanel data={data.marcas.atual} />
          </ChartCard>
          <ChartCard title="Marcas já utilizadas">
            <BarChartPanel data={data.marcas.utilizadas} layout="horizontal" />
          </ChartCard>
          <ChartCard title="Marca considerada melhor">
            <BarChartPanel data={data.marcas.melhor} />
          </ChartCard>
          <ChartCard title="Melhor custo-benefício">
            <BarChartPanel data={data.marcas.custoBeneficio} color="#eab308" />
          </ChartCard>
        </div>

        <h2 className="text-lg font-bold text-brand-900">Comportamento de compra</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Onde compra">
            <PieChartPanel data={data.compra.ondeCompra} />
          </ChartCard>
          <ChartCard title="Gasto mensal">
            <BarChartPanel data={data.compra.gastoMensal} />
          </ChartCard>
          <ChartCard title="Preço considerado justo">
            <BarChartPanel data={data.compra.precoJusto} color="#22c55e" />
          </ChartCard>
          <ChartCard title="Fatores de compra (prioridade)">
            <BarChartPanel
              data={data.compra.fatoresCompra.map((f) => ({ name: f.name, total: f.media }))}
              layout="horizontal"
            />
          </ChartCard>
        </div>

        <h2 className="text-lg font-bold text-brand-900">Saúde e efeitos</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Efeitos colaterais">
            <BarChartPanel data={data.efeitosColaterais.lista.slice(0, 10)} layout="horizontal" color="#ef4444" />
          </ChartCard>
          <ChartCard title="Acompanhamento médico">
            <PieChartPanel
              data={[
                { name: "Sim", total: data.saude.acompanhamentoMedico.sim },
                { name: "Não", total: data.saude.acompanhamentoMedico.nao },
              ].filter((d) => d.total > 0)}
            />
          </ChartCard>
          <ChartCard title="Atividade física">
            <BarChartPanel data={data.saude.atividadeFisica} />
          </ChartCard>
          <ChartCard title="Expectativa atingida">
            <PieChartPanel data={data.saude.expectativa} />
          </ChartCard>
        </div>

        <h2 className="text-lg font-bold text-brand-900">Marketing e conteúdo</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Fontes de informação">
            <BarChartPanel data={data.conteudo.fontes} layout="horizontal" />
          </ChartCard>
          <ChartCard title="Tipo de conteúdo preferido">
            <BarChartPanel data={data.conteudo.tipoConteudo} />
          </ChartCard>
        </div>

        {data.respostasAbertas.length > 0 && (
          <ChartCard title="Respostas abertas (amostra)" className="col-span-full">
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {data.respostasAbertas.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                  {r.faltaMercado && (
                    <p><span className="font-medium text-slate-600">O que falta:</span> {r.faltaMercado}</p>
                  )}
                  {r.influenciadores && (
                    <p><span className="font-medium text-slate-600">Influenciadores:</span> {r.influenciadores}</p>
                  )}
                  {r.efeitoInterrupcao && (
                    <p><span className="font-medium text-slate-600">Interrupção:</span> {r.efeitoInterrupcao}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(r.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          </ChartCard>
        )}
      </main>
    </div>
  );
}
