/**
 * 상품 가격 계산 유틸리티 (주문 단위 계산)
 * 
 * 가격 계산은 개별 상품이 아닌 주문(장바구니) 총계 기준으로 수행됩니다.
 * 
 * - 정가 합계 = 장바구니 내 모든 상품의 정가 × 수량 합산
 * - 할인가 합계 = 정가 합계 × 0.9
 * - 학원지원금 = 할인가 합계 × 0.1 / 천원단위 절삭
 * - 최종판매가 = 할인가 합계 - 학원지원금
 * 
 * 예시 (총 정가 합계 50,000원):
 * - 할인가: 45,000원 (정가 × 0.9)
 * - 학원지원금: 4,000원 (4,500원 → 천원단위 절삭)
 * - 최종 판매가: 41,000원
 */

export interface PriceBreakdown {
  listPrice: number;        // 정가 합계
  discountedPrice: number;  // 할인가 합계 (10% 할인)
  schoolSupport: number;    // 학원지원금 (천원단위 절삭)
  finalPrice: number;       // 최종판매가
  discountAmount: number;   // 총 할인금액 (정가 - 최종판매가)
}

/**
 * 금액을 원 단위 문자열로 포맷팅
 */
export function formatWon(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

/**
 * 주문(장바구니) 총계 기준으로 가격 계산
 * 개별 상품이 아닌 총 정가 합계를 기준으로 할인/지원금을 산출
 */
export function calculateTotalPrice(
  items: Array<{ listPrice: number; quantity: number }>
): PriceBreakdown {
  // 1. 정가 합계
  const totalListPrice = items.reduce((sum, item) => sum + item.listPrice * item.quantity, 0);
  
  // 2. 할인가 = 정가 합계 × 0.9
  const totalDiscountedPrice = Math.round(totalListPrice * 0.9);
  
  // 3. 학원지원금 = 할인가 합계 × 0.1 / 천원단위 절삭
  const schoolSupportRaw = totalDiscountedPrice * 0.1;
  const totalSchoolSupport = Math.floor(schoolSupportRaw / 1000) * 1000;
  
  // 4. 최종판매가 = 할인가 - 학원지원금
  const totalFinalPrice = totalDiscountedPrice - totalSchoolSupport;
  
  // 5. 총 할인금액 = 정가 - 최종판매가
  const totalDiscountAmount = totalListPrice - totalFinalPrice;
  
  return {
    listPrice: totalListPrice,
    discountedPrice: totalDiscountedPrice,
    schoolSupport: totalSchoolSupport,
    finalPrice: totalFinalPrice,
    discountAmount: totalDiscountAmount,
  };
}

/**
 * 학원지원금을 상품별로 비례 배분
 * 총 학원지원금을 각 상품의 정가 비율에 따라 분배
 * 나눠떨어지지 않는 경우 마지막 상품에 차이를 반영
 */
export function distributeSchoolSupport(
  items: Array<{ listPrice: number; quantity: number }>,
  totalSchoolSupport: number
): number[] {
  const totalListPrice = items.reduce((sum, item) => sum + item.listPrice * item.quantity, 0);
  if (totalListPrice === 0) return items.map(() => 0);

  const distributed: number[] = [];
  let allocated = 0;

  for (let i = 0; i < items.length; i++) {
    const itemTotal = items[i].listPrice * items[i].quantity;
    if (i === items.length - 1) {
      // 마지막 항목: 나머지 차액 보정
      distributed.push(totalSchoolSupport - allocated);
    } else {
      const share = Math.round(totalSchoolSupport * (itemTotal / totalListPrice));
      distributed.push(share);
      allocated += share;
    }
  }

  return distributed;
}
