import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BoxMultiple24Filled,
  Book24Filled,
  Add20Regular,
  Subtract20Regular,
} from "@fluentui/react-icons";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getBookImageUrl } from "../utils/dataStore";
import { formatWon } from "../utils/priceCalculator";
import type { Product } from "./ProductCard";

interface MobileProductTabsProps {
  setProducts: Product[];
  singleProducts: Product[];
  quantities: Record<string, number>;
  onQuantityChange: (id: string, qty: number) => void;
}

export function MobileProductTabs({
  setProducts,
  singleProducts,
  quantities,
  onQuantityChange,
}: MobileProductTabsProps) {
  const [activeTab, setActiveTab] = useState<"set" | "single">("set");
  const products = activeTab === "set" ? setProducts : singleProducts;

  return (
    <div className="flex flex-col h-full">
      <div className="flex rounded-t-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setActiveTab("set")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[14px] font-medium transition-all cursor-pointer ${
            activeTab === "set"
              ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <BoxMultiple24Filled className="w-4 h-4" />
          세트 상품
          {setProducts.length > 0 && (
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              activeTab === "set" ? "bg-white/20" : "bg-gray-200"
            }`}>
              {setProducts.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("single")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[14px] font-medium transition-all cursor-pointer ${
            activeTab === "single"
              ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Book24Filled className="w-4 h-4" />
          단품 상품
          {singleProducts.length > 0 && (
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              activeTab === "single" ? "bg-white/20" : "bg-gray-200"
            }`}>
              {singleProducts.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/50 border-l border-r border-gray-200 p-2.5 space-y-2 scrollbar-thin">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === "set" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === "set" ? 20 : -20 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="space-y-2"
          >
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-[13px]">
                {activeTab === "set" ? (
                  <BoxMultiple24Filled className="w-10 h-10 mb-2 text-gray-300" />
                ) : (
                  <Book24Filled className="w-10 h-10 mb-2 text-gray-300" />
                )}
                <p>등록된 상품이 없습니다</p>
              </div>
            ) : (
              products.map((product) => {
                const quantity = quantities[product.id] || 0;
                const isSelected = quantity > 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (quantity === 0) onQuantityChange(product.id, 1);
                    }}
                    className={`rounded-lg border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 shadow-md ring-1 ring-indigo-500/20"
                        : "border-gray-200/80 bg-white/60 hover:bg-white/80"
                    } backdrop-blur-sm overflow-hidden`}
                  >
                    <div className="flex items-center gap-2 p-2.5">
                      <div className="relative w-12 h-[60px] rounded-md overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 shrink-0 flex items-center justify-center">
                        {activeTab === "set" ? (
                          <BoxMultiple24Filled className="w-7 h-7 text-indigo-500" />
                        ) : (
                          <ImageWithFallback
                            src={product.imageUrl || getBookImageUrl(product.isbn)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        {activeTab === "single" && (
                          <span className="text-gray-400 text-[9px] font-mono">
                            {product.isbn}
                          </span>
                        )}
                        <h4 className="text-gray-900 text-[12px] leading-tight font-semibold line-clamp-2">
                          {product.name}
                        </h4>
                        <p className="text-gray-500 text-[10px] truncate">{product.publisher}</p>
                        <div className="pt-0.5">
                          <span className="text-indigo-700 text-[12px] font-bold">
                            {formatWon(product.listPrice)}
                          </span>
                        </div>
                      </div>

                      <div
                        className="shrink-0 flex flex-col items-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-gray-500 text-[9px] font-medium">수량</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuantityChange(product.id, Math.max(0, quantity - 1));
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer active:scale-95"
                          >
                            <Subtract20Regular className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) => {
                              e.stopPropagation();
                              const val = parseInt(e.target.value, 10);
                              onQuantityChange(product.id, isNaN(val) || val < 0 ? 0 : val);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-6 text-center text-[11px] text-gray-900 font-bold rounded-md border border-gray-200 bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/25 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuantityChange(product.id, quantity + 1);
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer active:scale-95"
                          >
                            <Add20Regular className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {activeTab === "set" && product.setItemDetails && product.setItemDetails.length > 0 && (
                      <div className="border-t border-gray-200/60 bg-gray-50 px-2.5 py-1.5">
                        <div className="flex items-center gap-1 mb-1">
                          <BoxMultiple24Filled className="w-2.5 h-2.5 text-indigo-600" />
                          <span className="text-[9px] text-indigo-700 font-semibold">
                            세트 구성 ({product.setItemDetails.length}권)
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {product.setItemDetails.map((item, i) => (
                            <div
                              key={item.isbn || i}
                              className="flex items-center gap-1 text-[9px] py-0.5 bg-gray-100 rounded px-1.5"
                            >
                              <span className="text-gray-400 w-3 text-right shrink-0">{i + 1}.</span>
                              <span className="text-gray-800 flex-1 min-w-0 truncate text-[10px] font-medium">
                                {item.name}
                              </span>
                              <span className="text-gray-700 shrink-0 font-bold text-[9px]">
                                {formatWon(item.listPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="h-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-b-xl shrink-0" />
    </div>
  );
}