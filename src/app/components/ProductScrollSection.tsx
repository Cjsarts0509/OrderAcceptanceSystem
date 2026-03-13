import React from "react";
import {
  Add20Regular,
  Subtract20Regular,
  BoxMultiple24Filled,
  Book24Filled,
} from "@fluentui/react-icons";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getBookImageUrl } from "../utils/dataStore";
import { formatWon } from "../utils/priceCalculator";
import type { Product } from "./ProductCard";

interface ProductScrollSectionProps {
  title: string;
  icon: "set" | "single";
  products: Product[];
  quantities: Record<string, number>;
  onQuantityChange: (id: string, qty: number) => void;
}

export function ProductScrollSection({
  title,
  icon,
  products,
  quantities,
  onQuantityChange,
}: ProductScrollSectionProps) {
  return (
    <div className="flex flex-col min-w-0 min-h-0 overflow-hidden">
      <div className="h-10 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 rounded-t-xl shrink-0">
        <h3 className="text-white font-bold text-[15px] tracking-wide">{title}</h3>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/50 border-l border-r border-gray-200 p-3 space-y-2.5 scrollbar-thin">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-[13px]">
            {icon === "set" ? (
              <BoxMultiple24Filled className="w-12 h-12 mb-2 text-gray-300" />
            ) : (
              <Book24Filled className="w-12 h-12 mb-2 text-gray-300" />
            )}
            <p>등록된 상품이 없습니다</p>
          </div>
        ) : (
          products.map((product) => {
            const quantity = quantities[product.id] || 0;
            const isSelected = quantity > 0;

            const handleIncrease = (e: React.MouseEvent) => {
              e.stopPropagation();
              onQuantityChange(product.id, quantity + 1);
            };

            const handleDecrease = (e: React.MouseEvent) => {
              e.stopPropagation();
              onQuantityChange(product.id, Math.max(0, quantity - 1));
            };

            const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              e.stopPropagation();
              const val = parseInt(e.target.value, 10);
              onQuantityChange(product.id, isNaN(val) || val < 0 ? 0 : val);
            };

            const handleRowClick = () => {
              if (quantity === 0) {
                onQuantityChange(product.id, 1);
              }
            };

            return (
              <div
                key={product.id}
                onClick={handleRowClick}
                className={`rounded-lg border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 shadow-md ring-1 ring-indigo-500/20"
                    : "border-gray-200/80 bg-white/60 hover:bg-white/80"
                } backdrop-blur-sm overflow-hidden`}
              >
                <div className="flex items-center gap-2.5 p-2.5">
                  <div className="relative w-14 h-[72px] rounded-md overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 shrink-0 flex items-center justify-center">
                    {icon === "set" ? (
                      <BoxMultiple24Filled className="w-8 h-8 text-indigo-500" />
                    ) : (
                      <ImageWithFallback
                        src={product.imageUrl || getBookImageUrl(product.isbn)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    {icon === "single" && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-[10px] font-mono shrink-0">
                          {product.isbn}
                        </span>
                      </div>
                    )}
                    <h4 className="text-gray-900 text-[13px] leading-tight font-semibold line-clamp-2">
                      {product.name}
                    </h4>
                    <p className="text-gray-500 text-[11px] truncate">{product.publisher}</p>
                    
                    <div className="flex items-center gap-1 pt-0.5">
                      <span className="text-indigo-700 text-[13px] font-bold">
                        {formatWon(product.listPrice)}
                      </span>
                    </div>
                  </div>

                  <div
                    className="shrink-0 flex flex-col items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-gray-500 text-[10px] font-medium">수량</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={handleDecrease}
                        className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer active:scale-95"
                      >
                        <Subtract20Regular className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={handleInputChange}
                        onClick={(e) => e.stopPropagation()}
                        className="w-9 h-6 text-center text-[12px] text-gray-900 font-bold rounded-md border border-gray-200 bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/25 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={handleIncrease}
                        className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer active:scale-95"
                      >
                        <Add20Regular className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {icon === "set" && product.setItemDetails && product.setItemDetails.length > 0 && (
                  <div className="border-t border-gray-200/60 bg-gray-50/50 px-2.5 py-2">
                    <div className="flex items-center gap-1 mb-1.5">
                      <BoxMultiple24Filled className="w-3 h-3 text-indigo-600" />
                      <span className="text-[10px] text-indigo-700 font-semibold">
                        세트 구성 ({product.setItemDetails.length}권)
                      </span>
                    </div>
                    <div className="space-y-1">
                      {product.setItemDetails.map((item, i) => (
                        <div
                          key={item.isbn || i}
                          className="flex items-center gap-1.5 text-[10px] py-0.5 bg-gray-50 rounded px-1.5"
                        >
                          <span className="text-gray-400 w-4 text-right shrink-0">{i + 1}.</span>
                          <span className="text-gray-400 font-mono text-[9px] shrink-0">
                            {item.isbn}
                          </span>
                          <span className="text-gray-800 flex-1 min-w-0 truncate text-[11px] font-medium">
                            {item.name}
                          </span>
                          <span className="text-gray-700 shrink-0 font-bold text-[10px]">
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
      </div>

      <div className="h-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-b-xl shrink-0" />
    </div>
  );
}