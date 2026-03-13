/**
 * 데이터 스토어 — Supabase KV + localStorage 캐시
 *
 * 읽기: 서버에서 fetch → localStorage 캐시 업데이트
 * 쓰기: 서버에 저장 → localStorage 캐시 업데이트
 * 오프라인 폴백: 서버 실패 시 localStorage에서 읽기
 */

import type { OrderData } from "./orderUtils";
import {
  fetchProducts as apiFetchProducts,
  saveProductsRemote,
  fetchSets as apiFetchSets,
  saveSetsRemote,
  fetchOrders as apiFetchOrders,
  createOrderRemote,
  lookupOrdersRemote,
  deleteOrderRemote,
  updateOrderRemote,
} from "./api";

/* ───── Product Types ───── */
export interface RegisteredProduct {
  id: string;
  isbn: string;
  name: string;
  publisher: string;
  listPrice: number;
  discountRate: number;
  salePrice: number;
  imageUrl: string;
  type: "single";
}

export interface SetProduct {
  id: string;
  name: string;
  itemIds: string[]; // product IDs
  listPrice: number;
  discountRate: number;
  salePrice: number;
}

/* ───── Storage Keys (localStorage 캐시) ───── */
const KEYS = {
  products: "book_products",
  sets: "book_sets",
  orders: "book_orders",
} as const;

/* ───── localStorage 헬퍼 ───── */
function readCache<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCache<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/* ═══════════════════════════════════════════════
   Products
   ═══════════════════════════════════════════════ */

export async function getProducts(): Promise<RegisteredProduct[]> {
  try {
    const data = await apiFetchProducts();
    writeCache(KEYS.products, data);
    return data as RegisteredProduct[];
  } catch (e) {
    console.warn("[dataStore] getProducts fallback to cache:", e);
    return readCache<RegisteredProduct>(KEYS.products);
  }
}

export async function saveProducts(products: RegisteredProduct[]): Promise<void> {
  writeCache(KEYS.products, products); // 즉시 캐시 업데이트
  try {
    await saveProductsRemote(products);
  } catch (e) {
    console.error("[dataStore] saveProducts remote failed:", e);
  }
}

export async function addProduct(product: RegisteredProduct): Promise<RegisteredProduct[]> {
  const products = await getProducts();
  products.push(product);
  await saveProducts(products);
  return products;
}

export async function updateProduct(updated: RegisteredProduct): Promise<RegisteredProduct[]> {
  const products = (await getProducts()).map((p) => (p.id === updated.id ? updated : p));
  await saveProducts(products);
  return products;
}

export async function deleteProducts(ids: string[]): Promise<RegisteredProduct[]> {
  const products = (await getProducts()).filter((p) => !ids.includes(p.id));
  await saveProducts(products);
  return products;
}

/* ═══════════════════════════════════════════════
   Sets
   ═══════════════════════════════════════════════ */

export async function getSets(): Promise<SetProduct[]> {
  try {
    const data = await apiFetchSets();
    writeCache(KEYS.sets, data);
    return data as SetProduct[];
  } catch (e) {
    console.warn("[dataStore] getSets fallback to cache:", e);
    return readCache<SetProduct>(KEYS.sets);
  }
}

export async function saveSets(sets: SetProduct[]): Promise<void> {
  writeCache(KEYS.sets, sets);
  try {
    await saveSetsRemote(sets);
  } catch (e) {
    console.error("[dataStore] saveSets remote failed:", e);
  }
}

export async function addSet(set: SetProduct): Promise<SetProduct[]> {
  const sets = await getSets();
  sets.push(set);
  await saveSets(sets);
  return sets;
}

export async function updateSet(updated: SetProduct): Promise<SetProduct[]> {
  const sets = (await getSets()).map((s) => (s.id === updated.id ? updated : s));
  await saveSets(sets);
  return sets;
}

export async function deleteSets(ids: string[]): Promise<SetProduct[]> {
  const sets = (await getSets()).filter((s) => !ids.includes(s.id));
  await saveSets(sets);
  return sets;
}

/* ═══════════════════════════════════════════════
   Orders
   ═══════════════════════════════════════════════ */

export async function getOrders(): Promise<OrderData[]> {
  try {
    const data = await apiFetchOrders();
    writeCache(KEYS.orders, data);
    return data as OrderData[];
  } catch (e) {
    console.warn("[dataStore] getOrders fallback to cache:", e);
    return readCache<OrderData>(KEYS.orders);
  }
}

export async function addOrder(order: OrderData): Promise<OrderData[]> {
  // 캐시에 즉시 추가
  const cached = readCache<OrderData>(KEYS.orders);
  cached.push(order);
  writeCache(KEYS.orders, cached);
  try {
    await createOrderRemote(order);
  } catch (e) {
    console.error("[dataStore] addOrder remote failed:", e);
  }
  return cached;
}

export async function lookupOrders(phone: string, pin: string): Promise<OrderData[]> {
  try {
    return (await lookupOrdersRemote(phone, pin)) as OrderData[];
  } catch (e) {
    console.warn("[dataStore] lookupOrders fallback to cache:", e);
    return readCache<OrderData>(KEYS.orders).filter(
      (o) => o.customerPhone === phone && o.pin === pin
    );
  }
}

export async function deleteOrder(orderNumber: string): Promise<OrderData[]> {
  try {
    await deleteOrderRemote(orderNumber);
  } catch (e) {
    console.error("[dataStore] deleteOrder remote failed:", e);
  }
  // 캐시에서도 제거
  const cached = readCache<OrderData>(KEYS.orders).filter((o) => o.orderNumber !== orderNumber);
  writeCache(KEYS.orders, cached);
  return cached;
}

export async function updateOrder(orderNumber: string, fields: Partial<OrderData>): Promise<OrderData | null> {
  try {
    const updated = await updateOrderRemote(orderNumber, fields);
    // 캐시 업데이트
    const cached = readCache<OrderData>(KEYS.orders).map((o) =>
      o.orderNumber === orderNumber ? { ...o, ...fields } : o
    );
    writeCache(KEYS.orders, cached);
    return updated as OrderData;
  } catch (e) {
    console.error("[dataStore] updateOrder remote failed:", e);
    return null;
  }
}

/* ═══════════════════════════════════════════════
   Helpers (동기 — 변경 없음)
   ═══════════════════════════════════════════════ */

export function getBookImageUrl(isbn: string): string {
  return `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${isbn}.jpg`;
}

export interface ResolvedSetProduct {
  id: string;
  name: string;
  items: RegisteredProduct[];
  listPrice: number;
  discountRate: number;
  salePrice: number;
}

export async function getResolvedSets(): Promise<ResolvedSetProduct[]> {
  const products = await getProducts();
  const sets = await getSets();
  return sets.map((s) => ({
    ...s,
    items: s.itemIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean) as RegisteredProduct[],
  }));
}

/* ───── 동기 캐시 읽기 (초기 렌더링용) ───── */
export function getProductsSync(): RegisteredProduct[] {
  return readCache<RegisteredProduct>(KEYS.products);
}
export function getSetsSync(): SetProduct[] {
  return readCache<SetProduct>(KEYS.sets);
}
export function getOrdersSync(): OrderData[] {
  return readCache<OrderData>(KEYS.orders);
}
export function getResolvedSetsSync(): ResolvedSetProduct[] {
  const products = getProductsSync();
  const sets = getSetsSync();
  return sets.map((s) => ({
    ...s,
    items: s.itemIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean) as RegisteredProduct[],
  }));
}