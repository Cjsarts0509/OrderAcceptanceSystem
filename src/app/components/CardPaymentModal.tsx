import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Payment24Regular,
  Dismiss24Regular,
  ShieldCheckmark24Regular,
  LockClosed24Regular,
} from "@fluentui/react-icons";

interface CardPaymentModalProps {
  open: boolean;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export function CardPaymentModal({
  open,
  amount,
  onSuccess,
  onCancel,
}: CardPaymentModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1-");
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const handlePay = () => {
    if (cardNumber.replace(/\D/g, "").length < 16) return;
    if (expiry.replace(/\D/g, "").length < 4) return;
    if (cvc.length < 3) return;

    setProcessing(true);
    // Mock PG API 호출 시뮬레이션
    setTimeout(() => {
      setProcessing(false);
      setDone(true);
      setTimeout(() => {
        onSuccess();
        // Reset state
        setCardNumber("");
        setExpiry("");
        setCvc("");
        setDone(false);
      }, 1200);
    }, 2000);
  };

  const handleCancel = () => {
    setCardNumber("");
    setExpiry("");
    setCvc("");
    setProcessing(false);
    setDone(false);
    onCancel();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="relative w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-2xl border border-white/50 shadow-[0_24px_80px_rgba(0,0,0,0.2)] overflow-hidden"
          >
            {/* 헤더 */}
            <div className="px-5 pt-5 pb-4 text-center border-b border-gray-100">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100/60 mb-3">
                <Payment24Regular className="text-indigo-500 w-6 h-6" />
              </div>
              <h3 className="text-gray-800">카드 결제</h3>
              <p className="text-indigo-600 mt-1">{formatWon(amount)}</p>
            </div>

            {done ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-5 py-10 text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100/60 mb-3">
                  <ShieldCheckmark24Regular className="text-emerald-500 w-8 h-8" />
                </div>
                <p className="text-gray-800">결제가 완료되었습니다!</p>
              </motion.div>
            ) : processing ? (
              <div className="px-5 py-10 text-center">
                <div className="inline-block w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-gray-600 text-[14px]">결제 처리 중...</p>
                <p className="text-gray-400 text-[12px] mt-1">잠시만 기다려 주세요.</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <label className="block text-gray-500 text-[12px] mb-1">카드 번호</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="0000-0000-0000-0000"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-gray-700 text-[14px] placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200/40 font-mono tracking-wider"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-500 text-[12px] mb-1">유효기간</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-gray-700 text-[14px] placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200/40 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[12px] mb-1">CVC</label>
                      <input
                        type="password"
                        maxLength={3}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))}
                        placeholder="000"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-gray-700 text-[14px] placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200/40 font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 text-[11px] pt-1">
                    <LockClosed24Regular className="w-3.5 h-3.5" />
                    <span>결제 정보는 SSL로 안전하게 암호화됩니다.</span>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-gray-600 text-[14px] hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handlePay}
                    className="flex-1 rounded-lg bg-indigo-500 py-2.5 text-white text-[14px] hover:bg-indigo-600 transition-colors cursor-pointer"
                  >
                    {formatWon(amount)} 결제
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
