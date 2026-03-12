import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
} from "@fluentui/react-icons";
import { PinInput } from "./PinInput";
import { formatPhone } from "../utils/phoneFormat";
import type { OrderData } from "../utils/orderUtils";
import { lookupOrders } from "../utils/dataStore";

interface OrderLookupProps {
  orders: OrderData[];
  onBack: () => void;
}

function formatWon(n: number) { return n.toLocaleString("ko-KR") + "원"; }

const STATUS_CONFIG = [
  { key: "pending", label: "접수완료", icon: Clock24Regular, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { key: "confirmed", label: "결제완료", icon: Payment24Regular, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "shipped", label: "배송중", icon: VehicleTruckProfile24Regular, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  { key: "delivered", label: "배송완료", icon: BoxCheckmark24Regular, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
] as const;

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: "접수완료", color: "text-amber-600 bg-amber-50" },
  confirmed: { label: "결제완료", color: "text-blue-600 bg-blue-50" },
  shipped: { label: "배송중", color: "text-indigo-600 bg-indigo-50" },
  delivered: { label: "배송완료", color: "text-emerald-600 bg-emerald-50" },
  cancelled: { label: "취소됨", color: "text-red-600 bg-red-50" },
};

function getStatusIndex(status: string): number { return STATUS_CONFIG.findIndex((s) => s.key === status); }

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
            {idx > 0 && <div className={`flex-1 h-[2px] rounded-full transition-colors ${idx <= currentIdx ? "bg-indigo-400" : "bg-gray-200"}`} />}
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isCurrent ? `${step.bg} ${step.color} ring-2 ring-offset-1 ring-current` : isCompleted ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-300"}`}>
                {isCompleted && !isCurrent ? <CheckmarkCircle24Filled className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[10px] whitespace-nowrap ${isCurrent ? step.color : isCompleted ? "text-indigo-500" : "text-gray-300"}`}>{step.label}</span>
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

  const handleTrackingClick = (trackingNumber: string) => {
    window.open(`https://service.epost.go.kr/trace.RetrieveDomRi498.postal?sid1=${trackingNumber}`, "_blank");
  };

  // 전화번호 기준 그룹핑 (사실상 동일 전화번호로 조회하지만, 향후 확장 대비)
  const groupedOrders = found ? found.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {found === null ? (
          <motion.div key="search" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }} className="space-y-4">
            <div>
              <label className="block text-gray-600 text-[13px] mb-1.5">전화번호</label>
              <div className="relative">
                <Call24Regular className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-1234-5678"
                  className="w-full rounded-xl border border-white/40 bg-white/40 backdrop-blur-sm py-2.5 pl-10 pr-4 text-gray-700 placeholder:text-gray-400 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/40" />
              </div>
            </div>
            <div>
              <label className="block text-gray-600 text-[13px] mb-2">비밀번호 (숫자 4자리)</label>
              <PinInput value={pin} onChange={setPin} />
            </div>
            {error && <p className="text-red-500 text-[13px] text-center">{error}</p>}
            <button type="button" onClick={handleSearch} disabled={isSearching}
              className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-white shadow-[0_4px_16px_rgba(16,185,129,0.25)] transition-all hover:shadow-[0_6px_24px_rgba(16,185,129,0.35)] hover:brightness-110 active:scale-[0.98] cursor-pointer ${isSearching ? "opacity-70 cursor-wait" : ""}`}>
              <Search24Regular className="w-4 h-4" /> {isSearching ? "조회 중..." : "주문 조회"}
            </button>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }} className="space-y-3">
            {groupedOrders.length === 0 ? (
              <div className="text-center py-8">
                <DismissCircle24Regular className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-[14px]">일치하는 주문을 찾을 수 없습니다.</p>
                <p className="text-gray-400 text-[12px] mt-1">전화번호와 비밀번호를 확인해 주세요.</p>
              </div>
            ) : (
              <>
                {/* 전화번호 기준 헤더 */}
                <div className="text-center space-y-1 shrink-0">
                  <div className="flex items-center justify-center gap-2 text-gray-600 text-[14px]">
                    <Call24Regular className="w-4 h-4 text-indigo-500" />
                    <span className="font-mono">{phone}</span>
                  </div>
                  <p className="text-gray-500 text-[13px]">
                    총 <span className="text-indigo-600 font-medium">{groupedOrders.length}건</span>의 주문이 조회되었습니다.
                  </p>
                </div>
                {/* 독립 스크롤 영역 */}
                <div className="max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin space-y-3">
                  {groupedOrders.map((order, orderIdx) => {
                    const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
                    const trackingNumber = order.trackingNumber;
                    return (
                      <motion.div key={order.orderNumber} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: orderIdx * 0.08, type: "spring", damping: 28, stiffness: 300 }}
                        className="rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-800 font-mono text-[13px]">{order.orderNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[12px] ${badge.color}`}>{badge.label}</span>
                        </div>
                        <StatusProgressBar status={order.status} />
                        <div className="space-y-1">
                          {order.products.map((p) => (
                            <div key={p.id} className="flex items-center gap-2 text-[13px]">
                              <Box24Regular className="w-4 h-4 text-gray-400 shrink-0" />
                              <span className="text-gray-600 truncate min-w-0 flex-1">
                                {p.name}
                                {(p.quantity ?? 1) > 1 && <span className="text-gray-400 ml-1">x{p.quantity}</span>}
                              </span>
                              <span className="text-indigo-500 shrink-0 whitespace-nowrap">{formatWon(p.salePrice * (p.quantity ?? 1))}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[13px] pt-2 border-t border-white/30">
                          <span className="text-gray-500">결제 금액</span>
                          <span className="text-indigo-600">{formatWon(order.totalSalePrice)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-gray-500">결제 수단</span>
                          <span className="text-gray-700">{order.paymentMethod === "card" ? "카드 결제" : "계좌 이체"}</span>
                        </div>
                        <div className="text-[12px] text-gray-500">
                          <span className="text-gray-400">배송지: </span>{order.shippingAddress} {order.shippingAddressDetail}
                        </div>
                        {trackingNumber && (
                          <div className="flex items-center gap-2 rounded-lg bg-indigo-50/50 border border-indigo-100/60 px-3 py-2.5">
                            <VehicleTruckProfile24Regular className="w-5 h-5 text-indigo-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-gray-400">우체국택배</p>
                              <button type="button" onClick={() => handleTrackingClick(trackingNumber)}
                                className="text-indigo-600 text-[14px] font-mono flex items-center gap-1 hover:underline cursor-pointer">
                                {trackingNumber} <Open24Regular className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[11px] text-gray-400 shrink-0">클릭하여 조회</span>
                          </div>
                        )}
                        <p className="text-gray-400 text-[11px]">주문일시: {new Date(order.createdAt).toLocaleString("ko-KR")}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
            <button type="button" onClick={() => setFound(null)}
              className="w-full rounded-xl border border-white/40 bg-white/30 py-2.5 text-gray-600 text-[14px] hover:bg-white/50 transition-colors cursor-pointer">
              다시 조회
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button type="button" onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/40 bg-white/20 py-2.5 text-gray-500 text-[14px] hover:bg-white/40 transition-colors cursor-pointer">
        <ArrowLeft24Regular className="w-4 h-4" /> 메인으로 돌아가기
      </button>
    </div>
  );
}
