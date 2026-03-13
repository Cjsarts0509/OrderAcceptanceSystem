import React from "react";
import {
  Person24Regular,
  Cart24Regular,
  CreditCardPerson24Regular,
  Checkmark24Regular,
} from "@fluentui/react-icons";

const steps = [
  { label: "고객 정보", icon: Person24Regular },
  { label: "상품 선택", icon: Cart24Regular },
  { label: "결제 정보", icon: CreditCardPerson24Regular },
  { label: "확인", icon: Checkmark24Regular },
];

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isDone = index < currentStep;
        const isClickable = !!onStepClick && (isDone || isActive);
        return (
          <div key={step.label} className="contents">
            {index > 0 && (
              <div
                className={`h-[2px] flex-1 rounded-full transition-colors duration-300 ${
                  isDone ? "bg-indigo-600" : "bg-gray-200"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  isActive
                    ? "border-indigo-500 bg-indigo-50 text-indigo-600 shadow-[0_0_16px_rgba(79,70,229,0.25)]"
                    : isDone
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-200 bg-gray-50 text-gray-300"
                } ${isClickable ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-default"}`}
              >
                {isDone ? (
                  <Checkmark24Regular className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </button>
              <span
                className={`text-[11px] font-semibold whitespace-nowrap transition-colors duration-300 ${
                  isActive ? "text-indigo-600" : isDone ? "text-indigo-500" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
