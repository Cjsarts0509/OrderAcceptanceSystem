import React from "react";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassPanel({ children, className = "" }: GlassPanelProps) {
  return (
    <div
      className={`rounded-2xl border border-white/30 bg-white/50 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}
