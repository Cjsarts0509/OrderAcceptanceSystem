import React from "react";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassPanel({ children, className = "" }: GlassPanelProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}