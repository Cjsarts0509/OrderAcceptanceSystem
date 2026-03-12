import React, { useCallback, useEffect, useRef } from "react";
import { Location24Regular } from "@fluentui/react-icons";

/**
 * 카카오(다음) 우편번호 서비스 연동
 * https://postcode.map.daum.net/guide
 * - 외부 API key 불필요 (무료)
 * - 스크립트를 동적 로드하여 팝업 방식으로 주소 검색
 */

declare global {
  interface Window {
    daum: any;
  }
}

interface AddressSearchProps {
  value: string;
  onChange: (address: string, zipCode: string) => void;
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadDaumPostcode(): Promise<void> {
  if (scriptLoaded && window.daum?.Postcode) return Promise.resolve();
  return new Promise((resolve) => {
    if (scriptLoading) {
      loadCallbacks.push(resolve);
      return;
    }
    scriptLoading = true;
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    script.onerror = () => {
      scriptLoading = false;
      resolve(); // 실패해도 그냥 진행
    };
    document.head.appendChild(script);
  });
}

export function AddressSearch({ value, onChange }: AddressSearchProps) {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // 미리 스크립트 로드
    loadDaumPostcode();
    return () => { mounted.current = false; };
  }, []);

  const openSearch = useCallback(async () => {
    await loadDaumPostcode();

    if (!window.daum?.Postcode) {
      alert("주소 검색 서비스를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    new window.daum.Postcode({
      oncomplete(data: any) {
        if (!mounted.current) return;
        // 도로명 주소 우선, 없으면 지번
        const roadAddr = data.roadAddress || data.jibunAddress || "";
        const zipCode = data.zonecode || "";
        onChange(roadAddr, zipCode);
      },
      width: "100%",
      height: "100%",
    }).open({
      // 팝업 방식
      popupTitle: "주소 검색",
    });
  }, [onChange]);

  return (
    <div className="relative">
      <Location24Regular className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
      <button
        type="button"
        onClick={openSearch}
        className="w-full text-left rounded-xl border border-white/40 bg-white/40 backdrop-blur-sm py-2.5 pl-10 pr-4 transition-all hover:border-indigo-200 cursor-pointer"
      >
        {value ? (
          <span className="text-gray-700">{value}</span>
        ) : (
          <span className="text-gray-400">클릭하여 주소 검색</span>
        )}
      </button>
    </div>
  );
}
