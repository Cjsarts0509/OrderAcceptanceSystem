import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Search24Regular,
  ArrowLeft24Regular,
  Call24Regular,
  Box24Regular,
  VehicleTruckProfile24Regular,
  Open24Regular,
  DismissCircle24Regular,
  CheckmarkCircle24Filled,
  Clock24Regular,
  Payment24Regular,
  BoxCheckmark24Regular,
  LockClosed24Regular,
  Delete24Regular,
  Warning24Regular,
  Dismiss24Regular,
} from "@fluentui/react-icons";
import { PinInput } from "./PinInput";
import { formatPhone } from "../utils/phoneFormat";
import type { OrderData } from "../utils/orderUtils";
import { lookupOrders, updateOrder } from "../utils/dataStore";

interface OrderLookupProps {
  orders: OrderData[];
  onBack: () => void;
}

function formatWon(n: number) { return n.toLocaleString("ko-KR") + "원"; }

const STATUS_CONFIG = [
  { key: "pending", label: "접수완료", icon: Clock24Regular, color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-300" },
  { key: "confirmed", label: "결제완료", icon: Payment24Regular, color: "text-blue-700", bg: "bg-blue-100", border: "border-blue-300" },
  { key: "shipped", label: "배송중", icon: VehicleTruckProfile24Regular, color: "text-indigo-700", bg: "bg-indigo-100", border: "border-indigo-300" },
  { key: "delivered", label: "배송완료", icon: BoxCheckmark24Regular, color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300" },
] as const;

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: "접수완료", color: "text-amber-700 bg-amber-100 font-semibold" },
  confirmed: { label: "결제완료", color: "text-blue-700 bg-blue-100 font-semibold" },
  shipped: { label: "배송중", color: "text-indigo-700 bg-indigo-100 font-semibold" },
  delivered: { label: "배송완료", color: "text-emerald-700 bg-emerald-100 font-semibold" },
  cancelled: { label: "취소됨", color: "text-red-700 bg-red-100 font-semibold" },
};

function getStatusIndex(status: string): number { return STATUS_CONFIG.findIndex((s) => s.key === status); }

/** 배송중 이전 상태인지 체크 */
function canCancel(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

function StatusProgressBar({ status }: { status: string }) {
  if (status === "cancelled") return null;
  const currentIdx = getStatusIndex(status);
  return (
    <div className="flex items-center gap-1 py-2">
      {STATUS_CONFIG.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step.key} className="contents">
            {idx > 0 && <div className={`flex-1 h-[2px] rounded-full transition-colors ${idx <= currentIdx ? "bg-indigo-500" : "bg-gray-200"}`} />}
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isCurrent ? `${step.bg} ${step.color} ring-2 ring-offset-1 ring-current` : isCompleted ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-300"}`}>
                {isCompleted && !isCurrent ? <CheckmarkCircle24Filled className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${isCurrent ? step.color : isCompleted ? "text-indigo-600" : "text-gray-300"}`}>{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OrderLookup({ orders, onBack }: OrderLookupProps) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [found, setFound] = useState<OrderData[] | null>(null);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ order: OrderData; productId?: string } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleSearch = async () => {
    if (phone.replace(/\D/g, "").length < 10) { setError("전화번호를 정확히 입력해 주세요."); return; }
    if (pin.length < 4) { setError("비밀번호 4자리를 입력해 주세요."); return; }
    setError("");
    setIsSearching(true);
    try {
      const matched = await lookupOrders(phone, pin);
      setFound(matched);
    } catch (e) {
      console.error("[OrderLookup] lookup failed:", e);
      const matched = orders.filter((o) => o.customerPhone === phone && o.pin === pin);
      setFound(matched);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      if (cancelTarget.productId) {
        // 부분 취소 — 해당 상품만 제거
        const order = cancelTarget.order;
        const newProducts = order.products.filter((p) => p.id !== cancelTarget.productId);
        if (newProducts.length === 0) {
          // 모든 상품이 취소됨 → 전체 취소
          await updateOrder(order.orderNumber, { status: "cancelled" as const });
          toast.success("주문이 전체 취소되었습니다.");
        } else {
          const newListPrice = newProducts.reduce((s, p) => s + p.listPrice * (p.quantity || 1), 0);
          const discounted = Math.round(newListPrice * 0.9);
          const support = Math.floor(discounted * 0.1 / 1000) * 1000;
          const finalPrice = discounted - support;
          await updateOrder(order.orderNumber, {
            products: newProducts,
            totalListPrice: newListPrice,
            totalSalePrice: finalPrice,
          });
          toast.success("해당 상품이 취소되었습니다.");
        }
      } else {
        // 전체 취소
        await updateOrder(cancelTarget.order.orderNumber, { status: "cancelled" as const });
        toast.success("주문이 취소되었습니다.");
      }
      // 재조회
      const refreshed = await lookupOrders(phone, pin);
      setFound(refreshed);
    } catch (e) {
      console.error("[OrderLookup] cancel failed:", e);
      toast.error("취소 처리 중 오류가 발생했습니다.");
    } finally {
      setIsCancelling(false);
      setCancelTarget(null);
    }
  };

  const handleTrackingClick = (trackingNumber: string) => {
    window.open(`https://service.epost.go.kr/trace.RetrieveDomRi498.postal?sid1=${trackingNumber}`, "_blank");
  };

  const groupedOrders = found ? found.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {found === null ? (
          <motion.div key="search" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-[13px] font-semibold mb-1.5">전화번호</label>
              <div className="relative">
                <Call24Regular className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-1234-5678"
                  className="w-full rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm py-2.5 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25" />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 text-[13px] font-semibold mb-2">비밀번호 (숫자 4자리)</label>
              <PinInput value={pin} onChange={setPin} />
            </div>
            {error && <p className="text-red-600 text-[13px] font-medium text-center">{error}</p>}
            <button type="button" onClick={handleSearch} disabled={isSearching}
              className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-white shadow-[0_4px_16px_rgba(5,150,105,0.3)] transition-all hover:shadow-[0_6px_24px_rgba(5,150,105,0.4)] hover:brightness-110 active:scale-[0.98] cursor-pointer ${isSearching ? "opacity-70 cursor-wait" : ""}`}>
              <Search24Regular className="w-4 h-4" /> {isSearching ? "조회 중..." : "주문 조회"}
            </button>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }} className="space-y-3">
            {groupedOrders.length === 0 ? (
              <div className="text-center py-8">
                <DismissCircle24Regular className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600 text-[14px] font-medium">일치하는 주문을 찾을 수 없습니다.</p>
                <p className="text-gray-500 text-[12px] mt-1">전화번호와 비밀번호를 확인해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="text-center space-y-1 shrink-0">
                  <div className="flex items-center justify-center gap-2 text-gray-700 text-[14px] font-medium">
                    <Call24Regular className="w-4 h-4 text-indigo-600" />
                    <span className="font-mono">{phone}</span>
                  </div>
                  <p className="text-gray-600 text-[13px]">
                    총 <span className="text-indigo-700 font-bold">{groupedOrders.length}건</span>의 주문이 조회되었습니다.
                  </p>
                </div>
                <div className="max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin space-y-3">
                  {groupedOrders.map((order, orderIdx) => {
                    const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
                    const trackingNumber = order.trackingNumber;
                    const isCancellable = canCancel(order.status);
                    return (
                      <motion.div key={order.orderNumber} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: orderIdx * 0.08, type: "spring", damping: 28, stiffness: 300 }}
                        className="rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900 font-mono font-bold text-[13px]">{order.orderNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[12px] ${badge.color}`}>{badge.label}</span>
                        </div>
                        <StatusProgressBar status={order.status} />
                        <div className="space-y-1">
                          {order.products.map((p) => (
                            <div key={p.id} className="flex items-center gap-2 text-[13px]">
                              <Box24Regular className="w-4 h-4 text-gray-500 shrink-0" />
                              <span className="text-gray-700 truncate min-w-0 flex-1 font-medium">
                                {p.name}
                                {(p.quantity ?? 1) > 1 && <span className="text-gray-400 ml-1">x{p.quantity}</span>}
                              </span>
                              <span className="text-indigo-600 shrink-0 whitespace-nowrap font-semibold">{formatWon(p.listPrice * (p.quantity ?? 1))}</span>
                              {/* 부분 취소 버튼 — 배송중 이전 & 상품 2개 이상일 때 */}
                              {isCancellable && order.products.length > 1 && (
                                <button type="button" onClick={() => setCancelTarget({ order, productId: p.id })}
                                  className="text-red-400 hover:text-red-500 text-[11px] shrink-0 cursor-pointer ml-1">
                                  취소
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[13px] pt-2 border-t border-gray-200/60">
                          <span className="text-gray-600 font-medium">결제 금액</span>
                          <span className="text-indigo-700 font-bold">{formatWon(order.totalSalePrice)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-gray-600 font-medium">결제 수단</span>
                          <span className="text-gray-800 font-medium">{order.paymentMethod === "card" ? "카드 결제" : "계좌 이체"}</span>
                        </div>
                        <div className="text-[12px] text-gray-600 font-medium">
                          <span className="text-gray-500">배송지: </span>{order.shippingAddress} {order.shippingAddressDetail}
                        </div>
                        {trackingNumber && (
                          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2.5">
                            <VehicleTruckProfile24Regular className="w-5 h-5 text-indigo-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-gray-500 font-medium">우체국택배</p>
                              <button type="button" onClick={() => handleTrackingClick(trackingNumber)}
                                className="text-indigo-700 text-[14px] font-mono font-bold flex items-center gap-1 hover:underline cursor-pointer">
                                {trackingNumber} <Open24Regular className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[11px] text-gray-400 shrink-0">클릭하여 조회</span>
                          </div>
                        )}
                        <p className="text-gray-500 text-[11px] font-medium">주문일시: {new Date(order.createdAt).toLocaleString("ko-KR")}</p>

                        {/* 주문 전체 취소 버튼 — 배송중 이전에만 표시 */}
                        {isCancellable && (
                          <button type="button" onClick={() => setCancelTarget({ order })}
                            className="w-full flex items-center justify-center gap-1.5 rounded-lg border-2 border-red-300 bg-red-50 py-2 text-red-600 text-[13px] font-semibold hover:bg-red-100 transition-colors cursor-pointer">
                            <Delete24Regular className="w-4 h-4" />
                            주문 전체 취소
                          </button>
                        )}
                        {order.status === "cancelled" && (
                          <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-center">
                            <p className="text-red-600 text-[12px] font-medium">이 주문은 취소되었습니다.</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
            <button type="button" onClick={() => setFound(null)}
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 text-gray-700 text-[14px] hover:bg-gray-50 transition-colors cursor-pointer font-medium">
              다시 조회
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button type="button" onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-2.5 text-gray-600 text-[14px] hover:bg-gray-50 transition-colors cursor-pointer">
        <ArrowLeft24Regular className="w-4 h-4" /> 메인으로 돌아가기
      </button>

      {/* ═══════ 취소 확인 모달 ═══════ */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-xl shadow-[0_16px_64px_rgba(0,0,0,0.15)] p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Warning24Regular className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-gray-900">
                  {cancelTarget.productId ? "상품 취소" : "주문 전체 취소"}
                </h3>
              </div>
              <p className="text-gray-600 text-[13px] mb-1 pl-[52px]">
                {cancelTarget.productId
                  ? `"${cancelTarget.order.products.find(p => p.id === cancelTarget.productId)?.name}" 상품을 취소하시겠습니까?`
                  : `주문번호 ${cancelTarget.order.orderNumber}을(를) 전체 취소하시겠습니까?`
                }
              </p>
              <p className="text-red-500 text-[12px] font-medium mb-5 pl-[52px]">이 작업은 되돌릴 수 없습니다.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCancelTarget(null)} disabled={isCancelling}
                  className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-[13px] hover:bg-gray-50 transition-colors cursor-pointer">
                  아니오
                </button>
                <button type="button" onClick={handleCancelOrder} disabled={isCancelling}
                  className={`px-4 py-2 rounded-xl bg-red-600 text-white text-[13px] hover:bg-red-700 transition-colors cursor-pointer ${isCancelling ? "opacity-70 cursor-wait" : ""}`}>
                  {isCancelling ? "처리 중..." : "취소하기"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}