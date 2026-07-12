import type { DashboardData, PesquisaConfig, PesquisaRespostas, SessaoResponse } from "@/types/pesquisa";

const API_BASE = "/api/pesquisa";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Erro na requisição" }));
    throw new Error(error.error || "Erro na requisição");
  }

  return response.json();
}

export function fetchConfig(): Promise<PesquisaConfig> {
  return request<PesquisaConfig>(`${API_BASE}/config`);
}

export function createSession(): Promise<SessaoResponse> {
  return request<SessaoResponse>(`${API_BASE}/sessao`, { method: "POST" });
}

export function fetchSession(token: string): Promise<SessaoResponse> {
  return request<SessaoResponse>(`${API_BASE}/sessao/${token}`);
}

export function saveSession(
  token: string,
  data: { currentStep: number; respostas: PesquisaRespostas; status?: string }
): Promise<SessaoResponse> {
  return request<SessaoResponse>(`${API_BASE}/sessao/${token}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function completeSession(
  token: string,
  respostas: PesquisaRespostas
): Promise<{ success: boolean; respostas: PesquisaRespostas }> {
  return request(`${API_BASE}/sessao/${token}/concluir`, {
    method: "POST",
    body: JSON.stringify({ respostas }),
  });
}

export function fetchDashboard(params: Record<string, string>): Promise<DashboardData> {
  const query = new URLSearchParams(params).toString();
  return request<DashboardData>(`${API_BASE}/admin/dashboard?${query}`);
}

export function getExportUrl(format: "csv" | "excel", params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `${API_BASE}/admin/export/${format}?${query}`;
}
