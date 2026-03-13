/**
 * 상품 가격 계산 유틸리티
 * 
 * 판매가 책정 방식:
 * - 정가 = 상품정가
 * - 할인가 = 상품정가 * 0.9
 * - 학원지원금 = 할인가 * 0.1 / 천원단위 절삭
 * - 최종판매가 = 할인가 - 학원지원금
 * 
 * 예시:
 * - 정가: 25,000원
 * - 할인가: 22,500원 (정가 × 0.9)
 * - 학원지원금: 2,000원 (2,250원 → 천원단위 절삭)
 * - 최종 구매가: 20,500원
 */

export interface PriceBreakdown {
  listPrice: number;        // 정가
  discountedPrice: number;  // 할인가 (10% 할인)
  schoolSupport: number;    // 학원지원금 (천원단위 절삭)
  finalPrice: number;       // 최종판매가
  discountAmount: number;   // 할인금액 (정가 - 최종판매가)
}

/**
 * 정가를 기준으로 모든 가격 정보를 계산
 */
export function calculatePrice(listPrice: number): PriceBreakdown {
  // 할인가 = 정가 × 0.9
  const discountedPrice = Math.round(listPrice * 0.9);
  
  // 학원지원금 = 할인가 × 0.1 / 천원단위 절삭
  const schoolSupportRaw = discountedPrice * 0.1;
  const schoolSupport = Math.floor(schoolSupportRaw / 1000) * 1000;
  
  // 최종판매가 = 할인가 - 학원지원금
  const finalPrice = discountedPrice - schoolSupport;
  
  // 할인금액 = 정가 - 최종판매가
  const discountAmount = listPrice - finalPrice;
  
  return {
    listPrice,
    discountedPrice,
    schoolSupport,
    finalPrice,
    discountAmount,
  };
}

/**
 * 금액을 원 단위 문자열로 포맷팅
 */
export function formatWon(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

/**
 * 여러 상품의 총액을 계산
 */
export function calculateTotalPrice(
  items: Array<{ listPrice: number; quantity: number }>
): PriceBreakdown {
  let totalListPrice = 0;
  let totalDiscountedPrice = 0;
  let totalSchoolSupport = 0;
  
  for (const item of items) {
    const prices = calculatePrice(item.listPrice);
    totalListPrice += prices.listPrice * item.quantity;
    totalDiscountedPrice += prices.discountedPrice * item.quantity;
    totalSchoolSupport += prices.schoolSupport * item.quantity;
  }
  
  const totalFinalPrice = totalDiscountedPrice - totalSchoolSupport;
  const totalDiscountAmount = totalListPrice - totalFinalPrice;
  
  return {
    listPrice: totalListPrice,
    discountedPrice: totalDiscountedPrice,
    schoolSupport: totalSchoolSupport,
    finalPrice: totalFinalPrice,
    discountAmount: totalDiscountAmount,
  };
}