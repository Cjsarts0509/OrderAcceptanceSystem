import React from "react";
import {
  Add20Regular,
  Subtract20Regular,
  BoxMultiple24Filled,
  Book24Filled,
} from "@fluentui/react-icons";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getBookImageUrl } from "../utils/dataStore";
import { calculatePrice, formatWon } from "../utils/priceCalculator";
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
      {/* 헤더 */}
      <div className="h-10 flex items-center justify-center bg-gradient-to-br from-teal-600 to-cyan-700 rounded-t-xl shrink-0">
        <h3 className="text-white font-bold text-[15px] tracking-wide">{title}</h3>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto bg-white/30 backdrop-blur-sm border-l border-r border-white/40 p-3 space-y-2.5 scrollbar-thin">
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
            const prices = calculatePrice(product.listPrice);
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
                    ? "border-indigo-400/60 bg-indigo-50/40 shadow-md"
                    : "border-white/50 bg-white/40 hover:bg-white/60"
                } backdrop-blur-sm overflow-hidden`}
              >
                {/* 메인 영역 */}
                <div className="flex items-center gap-2.5 p-2.5">
                  {/* 이미지 또는 아이콘 */}
                  <div className="relative w-14 h-[72px] rounded-md overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 shrink-0 flex items-center justify-center">
                    {icon === "set" ? (
                      <BoxMultiple24Filled className="w-8 h-8 text-teal-600" />
                    ) : (
                      <ImageWithFallback
                        src={product.imageUrl || getBookImageUrl(product.isbn)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* 상품 정보 */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {icon === "single" && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-[10px] font-mono shrink-0">
                          {product.isbn}
                        </span>
                      </div>
                    )}
                    <h4 className="text-gray-800 text-[13px] leading-tight font-medium line-clamp-2">
                      {product.name}
                    </h4>
                    <p className="text-gray-400 text-[11px] truncate">{product.publisher}</p>
                    
                    {/* 가격 정보 */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 text-[10px]">정가</span>
                        <span className="text-gray-500 text-[11px] line-through">
                          {formatWon(prices.listPrice)}
                        </span>
                      </div>
                      <span className="text-gray-300">→</span>
                      <div className="flex items-center gap-1">
                        <span className="text-indigo-600 text-[13px] font-bold">
                          {formatWon(prices.finalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 수량 컨트롤 */}
                  <div
                    className="shrink-0 flex flex-col items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-gray-400 text-[10px]">수량</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={handleDecrease}
                        className="w-6 h-6 flex items-center justify-center rounded-md border border-white/60 bg-white/50 text-gray-500 hover:bg-white/80 transition-colors cursor-pointer active:scale-95"
                      >
                        <Subtract20Regular className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={handleInputChange}
                        onClick={(e) => e.stopPropagation()}
                        className="w-9 h-6 text-center text-[12px] text-gray-700 font-semibold rounded-md border border-white/60 bg-white/50 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={handleIncrease}
                        className="w-6 h-6 flex items-center justify-center rounded-md border border-white/60 bg-white/50 text-gray-500 hover:bg-white/80 transition-colors cursor-pointer active:scale-95"
                      >
                        <Add20Regular className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 세트 상품 — 단품 리스트 */}
                {icon === "set" && product.setItemDetails && product.setItemDetails.length > 0 && (
                  <div className="border-t border-white/40 bg-white/20 px-2.5 py-2">
                    <div className="flex items-center gap-1 mb-1.5">
                      <BoxMultiple24Filled className="w-3 h-3 text-teal-500" />
                      <span className="text-[10px] text-teal-600 font-medium">
                        세트 구성 ({product.setItemDetails.length}권)
                      </span>
                    </div>
                    <div className="space-y-1">
                      {product.setItemDetails.map((item, i) => {
                        const itemPrices = calculatePrice(item.listPrice);
                        return (
                          <div
                            key={item.isbn || i}
                            className="flex items-center gap-1.5 text-[10px] py-0.5 bg-white/30 rounded px-1.5"
                          >
                            <span className="text-gray-400 w-4 text-right shrink-0">{i + 1}.</span>
                            <span className="text-gray-400 font-mono text-[9px] shrink-0">
                              {item.isbn}
                            </span>
                            <span className="text-gray-700 flex-1 min-w-0 truncate text-[11px]">
                              {item.name}
                            </span>
                            <span className="text-indigo-600 shrink-0 font-semibold text-[10px]">
                              {formatWon(itemPrices.finalPrice)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 하단 라운드 */}
      <div className="h-2 bg-gradient-to-br from-teal-600 to-cyan-700 rounded-b-xl shrink-0" />
    </div>
  );
}