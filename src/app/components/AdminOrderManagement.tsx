import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Dismiss24Regular,
  Search24Regular,
  Save24Regular,
  Send24Regular,
  Edit24Regular,
  CheckmarkCircle24Filled,
  ErrorCircle24Regular,
  DocumentBulletList24Regular,
  ArrowDownload24Regular,
  Delete24Regular,
  Calendar24Regular,
} from "@fluentui/react-icons";
import { GlassPanel } from "./GlassPanel";
import type { OrderData } from "../utils/orderUtils";
import { getProductsSync, getResolvedSetsSync } from "../utils/dataStore";

/* ───── Types ───── */
interface WaybillLog { id: string; orderNumber: string; customerName: string; reason: string; timestamp: string; }
type WaybillStatus = "none" | "complete" | "failed";
interface OrderWithWaybill extends OrderData { waybillStatus: WaybillStatus; adminMemo?: string; }
interface AdminOrderManagementProps { orders: OrderData[]; onDeleteOrders?: (orderNumbers: string[]) => void; }

/* ───── Helpers ───── */
function formatWon(n: number) { return n.toLocaleString("ko-KR") + "원"; }
function formatDate(iso: string) { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function formatDateTime(iso: string) { const d = new Date(iso); return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "대기", color: "text-amber-600 bg-amber-50/50 border-amber-200/50" },
  confirmed: { label: "확인", color: "text-blue-600 bg-blue-50/50 border-blue-200/50" },
  shipped: { label: "배송중", color: "text-indigo-600 bg-indigo-50/50 border-indigo-200/50" },
  delivered: { label: "배송완료", color: "text-emerald-600 bg-emerald-50/50 border-emerald-200/50" },
  cancelled: { label: "취소", color: "text-red-600 bg-red-50/50 border-red-200/50" },
};

const inputClass = "w-full rounded-lg border border-white/40 bg-white/40 backdrop-blur-sm py-2 px-3 text-gray-700 text-[14px] placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/40 transition-all";
const springTransition = { type: "spring" as const, damping: 30, stiffness: 260 };

/* ───── Component ───── */
export function AdminOrderManagement({ orders, onDeleteOrders }: AdminOrderManagementProps) {
  const [orderList, setOrderList] = useState<OrderWithWaybill[]>(() =>
    orders.map((o) => ({ ...o, waybillStatus: o.trackingNumber ? "complete" : "none", adminMemo: "" }))
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailOrder, setDetailOrder] = useState<OrderWithWaybill | null>(null);
  const [memoText, setMemoText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [waybillFilter, setWaybillFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [errorLogs, setErrorLogs] = useState<WaybillLog[]>([]);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filteredOrders = useMemo(() => orderList.filter((o) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || o.customerName.includes(searchQuery) || o.orderNumber.toLowerCase().includes(q) || o.customerPhone.includes(searchQuery);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchWaybill = waybillFilter === "all" || (waybillFilter === "complete" && o.waybillStatus === "complete") || (waybillFilter === "failed" && o.waybillStatus === "failed") || (waybillFilter === "none" && o.waybillStatus === "none");
    const orderDate = formatDate(o.createdAt);
    const matchFrom = !dateFrom || orderDate >= dateFrom;
    const matchTo = !dateTo || orderDate <= dateTo;
    return matchSearch && matchStatus && matchWaybill && matchFrom && matchTo;
  }), [orderList, searchQuery, statusFilter, waybillFilter, dateFrom, dateTo]);

  const toggleSelect = (n: string) => setSelectedIds((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]);
  const toggleSelectAll = () => { const all = filteredOrders.map((o) => o.orderNumber); setSelectedIds((p) => p.length === all.length ? [] : all); };

  const openDetail = (order: OrderWithWaybill) => { setDetailOrder(order); setMemoText(order.adminMemo || ""); };
  const saveMemo = () => { if (!detailOrder) return; setOrderList((p) => p.map((o) => o.orderNumber === detailOrder.orderNumber ? { ...o, adminMemo: memoText } : o)); setDetailOrder((p) => p ? { ...p, adminMemo: memoText } : null); toast.success("메모가 저장되었습니다."); };
  const updateOrderField = (on: string, f: string, v: string) => { setOrderList((p) => p.map((o) => o.orderNumber === on ? { ...o, [f]: v } : o)); if (detailOrder && detailOrder.orderNumber === on) setDetailOrder((p) => p ? { ...p, [f]: v } : null); };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) { toast.error("삭제할 주문을 선택해 주세요."); return; }
    setConfirmDelete(true);
  };
  const confirmDeleteOrders = () => {
    setOrderList((p) => p.filter((o) => !selectedIds.includes(o.orderNumber)));
    if (onDeleteOrders) onDeleteOrders(selectedIds);
    toast.success(`${selectedIds.length}건의 주문이 삭제되었습니다.`);
    setSelectedIds([]);
    setConfirmDelete(false);
  };

  /* ── Waybill ── */
  const processWaybill = async () => {
    if (selectedIds.length === 0) { toast.error("운송장을 등록할 주문을 선택해 주세요."); return; }
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    const newLogs: WaybillLog[] = [];
    const updated = orderList.map((o) => {
      if (!selectedIds.includes(o.orderNumber)) return o;
      const success = Math.random() > 0.2;
      if (success) { return { ...o, waybillStatus: "complete" as WaybillStatus, trackingNumber: `607${String(Math.floor(Math.random() * 10000000000)).padStart(10, "0")}`, status: "shipped" as const }; }
      const reasons = ["주소 정보 불완전", "우편번호 오류", "API 타임아웃", "배송지 미지원 지역"];
      newLogs.push({ id: `log-${Date.now()}-${o.orderNumber}`, orderNumber: o.orderNumber, customerName: o.customerName, reason: reasons[Math.floor(Math.random() * reasons.length)], timestamp: new Date().toISOString() });
      return { ...o, waybillStatus: "failed" as WaybillStatus };
    });
    setOrderList(updated);
    if (newLogs.length > 0) { setErrorLogs((p) => [...newLogs, ...p]); setShowErrorPanel(true); }
    setSelectedIds([]);
    setIsProcessing(false);
    const sc = selectedIds.length - newLogs.length;
    if (newLogs.length === 0) toast.success(`${sc}건 운송장 등록 완료`);
    else toast(<div><p>처리 결과: 성공 {sc}건 / 실패 {newLogs.length}건</p></div>, { duration: 4000 });
  };

  /* ── Excel Download (#7 #8) ── */
  const downloadOrderExcel = () => {
    const selected = orderList.filter((o) => selectedIds.includes(o.orderNumber));
    if (selected.length === 0) { toast.error("다운로드할 주문을 선택해 주세요."); return; }

    // Get product data for set decomposition
    const allProducts = getProductsSync();
    const allSets = getResolvedSetsSync();

    /* ── Sheet 1: 주문 정보 (검산용) ── */
    const sheet1Data: any[] = [];
    for (const order of selected) {
      // 주문 헤더
      sheet1Data.push({ 주문번호: order.orderNumber, 주문자: order.customerName, 연락처: order.customerPhone, 우편번호: order.zipCode || "", 배송주소: `${order.shippingAddress} ${order.shippingAddressDetail || ""}`, 결제수단: order.paymentMethod === "card" ? "카드결제" : "계좌이체", 주문일시: formatDateTime(order.createdAt), 상태: statusLabels[order.status]?.label || order.status, ISBN: "", 상품명: "", 출판사: "", 유형: "", 수량: "", 정가: "", 판매가: "", 소계정가: "", 소계판매가: "" });
      // 상품 행
      for (const p of order.products) {
        const qty = p.quantity ?? 1;
        sheet1Data.push({ 주문번호: "", 주문자: "", 연락처: "", 우편번호: "", 배송주소: "", 결제수단: "", 주문일시: "", 상태: "", ISBN: p.isbn, 상품명: p.name, 출판사: p.publisher || "", 유형: p.type === "set" ? "세트" : "단품", 수량: qty, 정가: p.listPrice, 판매가: p.salePrice, 소계정가: p.listPrice * qty, 소계판매가: p.salePrice * qty });
      }
      // 합계 행
      sheet1Data.push({ 주문번호: "", 주문자: "", 연락처: "", 우편번호: "", 배송주소: "", 결제수단: "", 주문일시: "", 상태: "", ISBN: "", 상품명: "【합계】", 출판사: "", 유형: "", 수량: order.products.reduce((s, p) => s + (p.quantity ?? 1), 0), 정가: "", 판매가: "", 소계정가: order.totalListPrice, 소계판매가: order.totalSalePrice });
      sheet1Data.push({}); // 빈 행
    }

    /* ── Sheet 2: 발주용 상품 집계 (세트→단품 분해) ── */
    const productAgg: Record<string, { isbn: string; name: string; publisher: string; qty: number; totalList: number; totalSale: number }> = {};

    for (const order of selected) {
      for (const p of order.products) {
        const qty = p.quantity ?? 1;
        if (p.type === "set" && p.setItems) {
          // 세트를 구성품으로 분해
          const setData = allSets.find((s) => s.name === p.name || s.id === p.id);
          if (setData) {
            for (const itemId of setData.itemIds) {
              const item = allProducts.find((pr) => pr.id === itemId);
              if (item) {
                const key = item.isbn || item.id;
                if (!productAgg[key]) productAgg[key] = { isbn: item.isbn, name: item.name, publisher: item.publisher, qty: 0, totalList: 0, totalSale: 0 };
                productAgg[key].qty += qty;
                productAgg[key].totalList += item.listPrice * qty;
                productAgg[key].totalSale += item.salePrice * qty;
              }
            }
          } else {
            // 폴백: 세트 자체로 추가
            const key = p.isbn || p.id;
            if (!productAgg[key]) productAgg[key] = { isbn: p.isbn, name: p.name, publisher: p.publisher || "", qty: 0, totalList: 0, totalSale: 0 };
            productAgg[key].qty += qty;
            productAgg[key].totalList += p.listPrice * qty;
            productAgg[key].totalSale += p.salePrice * qty;
          }
        } else {
          const key = p.isbn || p.id;
          if (!productAgg[key]) productAgg[key] = { isbn: p.isbn, name: p.name, publisher: p.publisher || "", qty: 0, totalList: 0, totalSale: 0 };
          productAgg[key].qty += qty;
          productAgg[key].totalList += p.listPrice * qty;
          productAgg[key].totalSale += p.salePrice * qty;
        }
      }
    }

    const sheet2Data = Object.values(productAgg).map((v) => ({ ISBN: v.isbn, 상품명: v.name, 출판사: v.publisher, 주문수량: v.qty, 총정가: v.totalList, 총판매금액: v.totalSale }));
    // 합계
    const totalQty = sheet2Data.reduce((s, r) => s + r.주문수량, 0);
    const totalListAll = sheet2Data.reduce((s, r) => s + r.총정가, 0);
    const totalSaleAll = sheet2Data.reduce((s, r) => s + r.총판매금액, 0);
    sheet2Data.push({ ISBN: "", 상품명: "【합계】", 출판사: "", 주문수량: totalQty, 총정가: totalListAll, 총판매금액: totalSaleAll });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
    const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
    // Column widths
    ws1["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 40 }, { wch: 10 }, { wch: 18 }, { wch: 8 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 6 }, { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
    ws2["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws1, "주문정보");
    XLSX.utils.book_append_sheet(wb, ws2, "발주용 상품집계");

    const today = formatDate(new Date().toISOString());
    XLSX.writeFile(wb, `주문정보_${today}_${selected.length}건.xlsx`);
    toast.success(`${selected.length}건 주문 정보 다운로드 완료`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <h2 className="text-gray-800">주문 관리</h2>
        <p className="text-gray-400 text-[13px] mt-0.5">주문 목록을 조회하고 운송장을 등록하세요. 행을 더블클릭하면 상세 정보를 확인할 수 있습니다.</p>
      </div>

      {/* Action Bar - Fixed */}
      <GlassPanel className="p-4 shrink-0 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search24Regular className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="주문번호, 주문자, 연락처 검색..." className={`${inputClass} !pl-9`} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-white/40 bg-white/40 backdrop-blur-sm py-2 px-3 text-gray-700 text-[13px] outline-none focus:border-indigo-300 cursor-pointer">
            <option value="all">전체 상태</option>
            <option value="pending">대기</option><option value="confirmed">확인</option><option value="shipped">배송중</option><option value="delivered">배송완료</option><option value="cancelled">취소</option>
          </select>
          <select value={waybillFilter} onChange={(e) => setWaybillFilter(e.target.value)} className="rounded-lg border border-white/40 bg-white/40 backdrop-blur-sm py-2 px-3 text-gray-700 text-[13px] outline-none focus:border-indigo-300 cursor-pointer">
            <option value="all">운송장 전체</option><option value="none">미등록</option><option value="complete">출력완료</option><option value="failed">실패</option>
          </select>
        </div>
        {/* Date range + actions */}
        <div className="flex items-center gap-3 flex-wrap mt-3">
          <div className="flex items-center gap-1.5">
            <Calendar24Regular className="w-4 h-4 text-gray-400 shrink-0" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-white/40 bg-white/40 py-1.5 px-2 text-gray-700 text-[12px] outline-none focus:border-indigo-300 cursor-pointer" />
            <span className="text-gray-400 text-[12px]">~</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-white/40 bg-white/40 py-1.5 px-2 text-gray-700 text-[12px] outline-none focus:border-indigo-300 cursor-pointer" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={downloadOrderExcel} disabled={selectedIds.length === 0}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition-colors cursor-pointer ${selectedIds.length === 0 ? "border-gray-200/40 bg-gray-100/30 text-gray-400 cursor-not-allowed" : "border-indigo-200/40 bg-indigo-50/30 text-indigo-600 hover:bg-indigo-50/60"}`}>
              <ArrowDownload24Regular className="w-3.5 h-3.5" /> 주문정보 다운로드{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
            </button>
            <button type="button" onClick={handleDeleteSelected} disabled={selectedIds.length === 0}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition-colors cursor-pointer ${selectedIds.length === 0 ? "border-gray-200/40 bg-gray-100/30 text-gray-400 cursor-not-allowed" : "border-red-200/40 bg-red-50/30 text-red-600 hover:bg-red-50/60"}`}>
              <Delete24Regular className="w-3.5 h-3.5" /> 선택 삭제{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
            </button>
            <button type="button" onClick={processWaybill} disabled={isProcessing || selectedIds.length === 0}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-white text-[13px] shadow-[0_4px_16px_rgba(99,102,241,0.25)] transition-all cursor-pointer ${isProcessing || selectedIds.length === 0 ? "bg-gray-400 shadow-none cursor-not-allowed" : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:brightness-110 active:scale-[0.98]"}`}>
              <Send24Regular className="w-4 h-4" /> {isProcessing ? "처리 중..." : "운송장 등록"}
              {selectedIds.length > 0 && !isProcessing && <span className="bg-white/20 rounded-full px-2 py-0.5 text-[11px]">{selectedIds.length}</span>}
            </button>
          </div>
          {errorLogs.length > 0 && (
            <button type="button" onClick={() => setShowErrorPanel(!showErrorPanel)} className="flex items-center gap-1.5 rounded-xl border border-red-200/40 bg-red-50/30 px-3 py-1.5 text-red-600 text-[12px] hover:bg-red-50/60 transition-colors cursor-pointer">
              <ErrorCircle24Regular className="w-4 h-4" /> 실패 로그 ({errorLogs.length})
            </button>
          )}
        </div>
      </GlassPanel>

      {/* Error Log */}
      <AnimatePresence>
        {showErrorPanel && errorLogs.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={springTransition} className="overflow-hidden shrink-0 mb-4">
            <GlassPanel className="p-4 border-l-4 border-l-red-400/60">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-red-600 text-[14px] flex items-center gap-2"><ErrorCircle24Regular className="w-5 h-5" /> API 실패 로그</h3>
                <button type="button" onClick={() => { setErrorLogs([]); setShowErrorPanel(false); }} className="text-gray-400 hover:text-gray-600 text-[12px] cursor-pointer">로그 초기화</button>
              </div>
              <div className="max-h-[150px] overflow-y-auto scrollbar-thin">
                <table className="w-full text-[13px]">
                  <thead><tr className="border-b border-red-100/50"><th className="text-left text-red-400 py-2 px-3">주문번호</th><th className="text-left text-red-400 py-2 px-3">주문자</th><th className="text-left text-red-400 py-2 px-3">실패 사유</th><th className="text-left text-red-400 py-2 px-3">시각</th></tr></thead>
                  <tbody>{errorLogs.map((log) => (<tr key={log.id} className="border-b border-red-50/50"><td className="py-2 px-3 font-mono text-gray-600 text-[12px]">{log.orderNumber}</td><td className="py-2 px-3 text-gray-700">{log.customerName}</td><td className="py-2 px-3 text-red-600">{log.reason}</td><td className="py-2 px-3 text-gray-400 text-[12px]">{formatDateTime(log.timestamp)}</td></tr>))}</tbody>
                </table>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Table - Scrollable */}
      <GlassPanel className="p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="text-gray-800 flex items-center gap-2">
            <DocumentBulletList24Regular className="text-indigo-500" /> 주문 목록 <span className="text-indigo-500 text-[13px]">({filteredOrders.length}건)</span>
          </h3>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-white/60 backdrop-blur-sm">
              <tr className="border-b border-white/30">
                <th className="py-2.5 px-3 w-[40px]"><input type="checkbox" checked={filteredOrders.length > 0 && selectedIds.length === filteredOrders.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-indigo-500" /></th>
                <th className="text-left text-gray-400 py-2.5 px-3">주문번호</th>
                <th className="text-left text-gray-400 py-2.5 px-3">주문자</th>
                <th className="text-right text-gray-400 py-2.5 px-3">결제금액</th>
                <th className="text-center text-gray-400 py-2.5 px-3">주문일</th>
                <th className="text-center text-gray-400 py-2.5 px-3">상태</th>
                <th className="text-center text-gray-400 py-2.5 px-3">운송장</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, idx) => (
                <motion.tr key={order.orderNumber} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                  onDoubleClick={() => openDetail(order)}
                  className={`border-b border-white/20 transition-colors cursor-pointer ${idx % 2 === 0 ? "bg-white/5" : "bg-white/15"} hover:bg-indigo-50/20 ${selectedIds.includes(order.orderNumber) ? "bg-indigo-50/30" : ""}`}>
                  <td className="py-2.5 px-3"><input type="checkbox" checked={selectedIds.includes(order.orderNumber)} onChange={() => toggleSelect(order.orderNumber)} className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-indigo-500" /></td>
                  <td className="py-2.5 px-3 font-mono text-gray-500 text-[12px]">{order.orderNumber}</td>
                  <td className="py-2.5 px-3 text-gray-700">{order.customerName}</td>
                  <td className="py-2.5 px-3 text-right text-indigo-600">{formatWon(order.totalSalePrice)}</td>
                  <td className="py-2.5 px-3 text-center text-gray-500 text-[12px]">{formatDate(order.createdAt)}</td>
                  <td className="py-2.5 px-3 text-center"><span className={`inline-block text-[11px] px-2.5 py-1 rounded-full border ${statusLabels[order.status]?.color || "text-gray-500 bg-gray-50/50"}`}>{statusLabels[order.status]?.label || order.status}</span></td>
                  <td className="py-2.5 px-3 text-center">
                    {order.waybillStatus === "complete" && <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border text-emerald-600 bg-emerald-50/50 border-emerald-200/50"><CheckmarkCircle24Filled className="w-3.5 h-3.5" />출력완료</span>}
                    {order.waybillStatus === "failed" && <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border text-red-600 bg-red-50/50 border-red-200/50"><ErrorCircle24Regular className="w-3.5 h-3.5" />실패</span>}
                    {order.waybillStatus === "none" && <span className="text-gray-400 text-[11px]">-</span>}
                  </td>
                </motion.tr>
              ))}
              {filteredOrders.length === 0 && (<tr><td colSpan={7} className="text-center py-12 text-gray-400 text-[13px]">{searchQuery || statusFilter !== "all" || waybillFilter !== "all" || dateFrom || dateTo ? "검색 조건에 맞는 주문이 없습니다." : "주문 데이터가 없습니다."}</td></tr>)}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* ═══════ Detail Modal ═══════ */}
      <AnimatePresence>
        {detailOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDetailOrder(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={springTransition}
              className="relative rounded-2xl border border-white/30 bg-white/80 backdrop-blur-xl shadow-[0_16px_64px_rgba(0,0,0,0.15)] p-6 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setDetailOrder(null)} className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100/50 hover:text-gray-600 cursor-pointer transition-colors"><Dismiss24Regular className="w-5 h-5" /></button>
              <div className="mb-5">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-indigo-500 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50/50 border border-indigo-100/50">주문상세</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusLabels[detailOrder.status]?.color || ""}`}>{statusLabels[detailOrder.status]?.label}</span>
                </div>
                <h3 className="text-gray-800">{detailOrder.orderNumber}</h3>
                <p className="text-gray-400 text-[12px] mt-0.5">{formatDateTime(detailOrder.createdAt)}</p>
              </div>
              <div className="rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm overflow-hidden mb-5">
                <table className="w-full text-[13px]">
                  <tbody>
                    <tr className="border-b border-white/30"><td className="px-4 py-2.5 text-gray-400 whitespace-nowrap w-[100px]">주문자</td><td className="px-4 py-2.5"><input type="text" value={detailOrder.customerName} onChange={(e) => updateOrderField(detailOrder.orderNumber, "customerName", e.target.value)} className="bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-300 outline-none text-gray-700 w-full py-0.5 transition-colors" /></td></tr>
                    <tr className="border-b border-white/30"><td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">연락처</td><td className="px-4 py-2.5"><input type="text" value={detailOrder.customerPhone} onChange={(e) => updateOrderField(detailOrder.orderNumber, "customerPhone", e.target.value)} className="bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-300 outline-none text-gray-700 w-full py-0.5 transition-colors" /></td></tr>
                    <tr className="border-b border-white/30"><td className="px-4 py-2.5 text-gray-400 whitespace-nowrap align-top">배송주소</td><td className="px-4 py-2.5">{detailOrder.zipCode && <span className="text-gray-400 text-[11px] mr-2">[{detailOrder.zipCode}]</span>}<input type="text" value={detailOrder.shippingAddress} onChange={(e) => updateOrderField(detailOrder.orderNumber, "shippingAddress", e.target.value)} className="bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-300 outline-none text-gray-700 w-full py-0.5 transition-colors" />{detailOrder.shippingAddressDetail && <input type="text" value={detailOrder.shippingAddressDetail} onChange={(e) => updateOrderField(detailOrder.orderNumber, "shippingAddressDetail", e.target.value)} className="bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-300 outline-none text-gray-500 text-[12px] w-full py-0.5 mt-1 transition-colors" />}</td></tr>
                    <tr className="border-b border-white/30"><td className="px-4 py-2.5 text-gray-400 whitespace-nowrap align-top">주문상품</td><td className="px-4 py-2.5"><div className="space-y-1.5">{detailOrder.products.map((p) => (<div key={p.id} className="flex justify-between items-center"><div><span className="text-gray-700">{p.name}</span>{(p.quantity ?? 1) > 1 && <span className="text-indigo-500 text-[12px] ml-1">x{p.quantity}</span>}{p.type === "set" && p.setItems && <span className="text-gray-400 text-[11px] ml-1.5">({p.setItems.join(", ")})</span>}</div><span className="text-indigo-600 shrink-0 ml-3">{formatWon(p.salePrice * (p.quantity ?? 1))}</span></div>))}</div></td></tr>
                    <tr className="border-b border-white/30"><td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">결제금액</td><td className="px-4 py-2.5 text-indigo-600">{formatWon(detailOrder.totalSalePrice)} <span className="text-gray-400 text-[11px] ml-2 line-through">{formatWon(detailOrder.totalListPrice)}</span></td></tr>
                    <tr className="border-b border-white/30"><td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">결제수단</td><td className="px-4 py-2.5 text-gray-700">{detailOrder.paymentMethod === "card" ? "카드 결제" : "계좌 이체"}{detailOrder.receiptType && detailOrder.receiptType !== "none" && <span className="text-gray-400 text-[12px] ml-2">(현금영수증: {detailOrder.receiptType === "personal" ? "개인" : "사업자"} {detailOrder.receiptNumber})</span>}</td></tr>
                    {detailOrder.trackingNumber && <tr className="border-b border-white/30"><td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">운송장번호</td><td className="px-4 py-2.5 text-gray-700 font-mono">{detailOrder.trackingNumber}</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="rounded-xl border border-white/40 bg-white/20 backdrop-blur-sm p-4">
                <div className="flex items-center gap-2 mb-3"><Edit24Regular className="w-5 h-5 text-indigo-500" /><p className="text-gray-700 text-[14px]">관리자 메모</p></div>
                <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)} placeholder="메모를 입력하세요..." rows={3} className="w-full rounded-lg border border-white/40 bg-white/40 backdrop-blur-sm py-2.5 px-3 text-gray-700 text-[14px] placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/40 transition-all resize-none" />
                <div className="flex justify-end mt-2"><button type="button" onClick={saveMemo} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-white text-[13px] shadow-[0_4px_16px_rgba(99,102,241,0.25)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"><Save24Regular className="w-4 h-4" /> 메모 저장</button></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={springTransition}
              className="rounded-2xl border border-white/30 bg-white/80 backdrop-blur-xl shadow-[0_16px_64px_rgba(0,0,0,0.15)] p-6 w-full max-w-sm mx-4">
              <h3 className="text-gray-800 mb-2">주문 삭제</h3>
              <p className="text-gray-600 text-[14px] mb-4">선택한 {selectedIds.length}건의 주문을 삭제하시겠습니까?<br /><span className="text-red-500 text-[12px]">이 작업은 되돌릴 수 없습니다.</span></p>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl border border-white/40 bg-white/30 px-4 py-2 text-gray-600 text-[13px] hover:bg-white/50 transition-colors cursor-pointer">취소</button>
                <button type="button" onClick={confirmDeleteOrders} className="rounded-xl bg-red-500 px-4 py-2 text-white text-[13px] hover:bg-red-600 transition-colors cursor-pointer">삭제</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
