import React, { useState } from "react";
import { motion } from "motion/react";
import {
  LockClosed24Regular,
  ArrowLeft24Regular,
  ShieldCheckmark24Regular,
} from "@fluentui/react-icons";

const ADMIN_PASSWORD = "!kyobo220";

interface AdminLoginProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function AdminLogin({ onBack, onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onSuccess();
    } else {
      setError("비밀번호가 올바르지 않습니다.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setPassword("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="space-y-5"
    >
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100/60 mb-3">
          <LockClosed24Regular className="text-slate-600 w-7 h-7" />
        </div>
        <h3 className="text-gray-800">관리자 인증</h3>
        <p className="text-gray-500 text-[13px] mt-1">
          관리자 비밀번호를 입력해 주세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div
          animate={shaking ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <div className="relative">
            <LockClosed24Regular className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="비밀번호 입력"
              className={`w-full rounded-xl border bg-white/40 backdrop-blur-sm py-3 pl-10 pr-4 text-gray-700 placeholder:text-gray-400 outline-none transition-all focus:ring-2 ${
                error
                  ? "border-red-300 focus:border-red-300 focus:ring-red-200/40"
                  : "border-white/40 focus:border-indigo-300 focus:ring-indigo-200/40"
              }`}
              autoFocus
            />
          </div>
          {error && (
            <p className="text-red-500 text-[13px] mt-2 text-center">{error}</p>
          )}
        </motion.div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 py-3 text-white shadow-[0_4px_16px_rgba(51,65,85,0.3)] transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
        >
          <ShieldCheckmark24Regular className="w-4 h-4" />
          인증하기
        </button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/40 bg-white/20 py-2.5 text-gray-500 text-[14px] hover:bg-white/40 transition-colors cursor-pointer"
      >
        <ArrowLeft24Regular className="w-4 h-4" />
        메인으로 돌아가기
      </button>
    </motion.div>
  );
}
