import type { DashboardData, PesquisaConfig, PesquisaRespostas, SessaoResponse } from "@/types/pesquisa";

const API_BASE = "/api/pesquisa";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...options?.headers,
    },
    credentials: "include",
    cache: "no-store",
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

export function verifyEmail(
  email: string,
  sessionToken: string
): Promise<{ available: boolean; email?: string }> {
  return request(`${API_BASE}/verificar-email`, {
    method: "POST",
    body: JSON.stringify({ email, sessionToken }),
  });
}

export function fetchDashboard(params: Record<string, string>): Promise<DashboardData> {
  const query = new URLSearchParams({
    ...params,
    _t: String(Date.now()),
  }).toString();
  return request<DashboardData>(`${API_BASE}/admin/dashboard?${query}`);
}

export function getExportUrl(format: "csv" | "excel", params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `${API_BASE}/admin/export/${format}?${query}`;
}

export function adminLogin(email: string, senha: string): Promise<{ success: boolean; user: { id: number; nome: string; email: string } }> {
  return request(`${API_BASE}/admin/login`, {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });
}

export function adminMe(): Promise<{ authenticated: boolean; user?: { id: number; nome: string; email: string } }> {
  return request(`${API_BASE}/admin/me`);
}

export function adminLogout(): Promise<{ success: boolean }> {
  return request(`${API_BASE}/admin/logout`, { method: "POST" });
}
