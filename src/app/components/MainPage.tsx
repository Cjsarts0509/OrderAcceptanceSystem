import React from "react";
import { motion } from "motion/react";
import {
  Cart24Regular,
  Search24Regular,
  Settings24Regular,
} from "@fluentui/react-icons";

interface MainPageProps {
  onNavigate: (view: "order" | "lookup" | "admin") => void;
  hideAdmin?: boolean;
}

const buttons = [
  {
    key: "order" as const,
    label: "주문하기",
    desc: "새로운 주문을 접수합니다",
    icon: Cart24Regular,
    gradient: "from-indigo-600 to-purple-600",
    shadow: "rgba(79,70,229,0.3)",
    adminOnly: false,
  },
  {
    key: "lookup" as const,
    label: "주문 조회",
    desc: "주문 상태를 확인합니다",
    icon: Search24Regular,
    gradient: "from-emerald-600 to-teal-600",
    shadow: "rgba(5,150,105,0.3)",
    adminOnly: false,
  },
  {
    key: "admin" as const,
    label: "관리자",
    desc: "관리자 전용 메뉴",
    icon: Settings24Regular,
    gradient: "from-gray-600 to-gray-800",
    shadow: "rgba(55,65,81,0.25)",
    adminOnly: true,
  },
];

export function MainPage({ onNavigate, hideAdmin }: MainPageProps) {
  const visibleButtons = hideAdmin ? buttons.filter((b) => !b.adminOnly) : buttons;

  return (
    <div className="space-y-4">
      {visibleButtons.map((btn, i) => {
        const Icon = btn.icon;
        return (
          <motion.button
            key={btn.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: "spring", damping: 25, stiffness: 300 }}
            onClick={() => onNavigate(btn.key)}
            className={`w-full flex items-center gap-4 rounded-2xl bg-gradient-to-r ${btn.gradient} p-5 text-white transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer text-left`}
            style={{
              boxShadow: `0 6px 24px ${btn.shadow}`,
            }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/30 shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white font-bold text-[16px]">{btn.label}</p>
              <p className="text-white/80 text-[13px] mt-0.5">{btn.desc}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}