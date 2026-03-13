/**
 * Supabase Edge Function API 클라이언트
 * localStorage 대신 서버의 KV 스토어를 사용
 */
import { projectId, publicAnonKey } from "/utils/supabase/info";

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-81c2c616`;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicAnonKey}`,
      ...(options.headers || {}),
    },
  });

  const json = await res.json();

  if (!res.ok) {
    const errMsg = json?.error || `API error ${res.status}`;
    console.error(`[API] ${options.method || "GET"} ${path} failed:`, errMsg);
    throw new Error(errMsg);
  }

  return json;
}

// ─── Products ───
export async function fetchProducts() {
  const res = await request<{ data: any[] }>("/products");
  return res.data;
}

export async function saveProductsRemote(products: any[]) {
  await request("/products", {
    method: "PUT",
    body: JSON.stringify({ data: products }),
  });
}

// ─── Sets ───
export async function fetchSets() {
  const res = await request<{ data: any[] }>("/sets");
  return res.data;
}

export async function saveSetsRemote(sets: any[]) {
  await request("/sets", {
    method: "PUT",
    body: JSON.stringify({ data: sets }),
  });
}

// ─── Orders ───
export async function fetchOrders() {
  const res = await request<{ data: any[] }>("/orders");
  return res.data;
}

export async function createOrderRemote(order: any) {
  const res = await request<{ ok: boolean; orderNumber: string }>("/orders", {
    method: "POST",
    body: JSON.stringify({ data: order }),
  });
  return res;
}

export async function updateOrderRemote(
  orderNumber: string,
  fields: Record<string, any>
) {
  const res = await request<{ ok: boolean; data: any }>(
    `/orders/${encodeURIComponent(orderNumber)}`,
    {
      method: "PUT",
      body: JSON.stringify({ data: fields }),
    }
  );
  return res.data;
}

/** 주문번호 기준 일괄 업데이트 (송장 등록 등) */
export async function bulkUpdateOrdersRemote(
  updates: { orderNumber: string; fields: Record<string, any> }[]
) {
  const res = await request<{ ok: boolean; results: any[] }>("/orders/bulk-update", {
    method: "PUT",
    body: JSON.stringify({ updates }),
  });
  return res.results;
}

export async function lookupOrdersRemote(phone: string, pin: string) {
  const res = await request<{ data: any[] }>("/orders/lookup", {
    method: "POST",
    body: JSON.stringify({ phone, pin }),
  });
  return res.data;
}

export async function deleteOrderRemote(orderNumber: string) {
  await request(`/orders/${encodeURIComponent(orderNumber)}`, {
    method: "DELETE",
  });
}