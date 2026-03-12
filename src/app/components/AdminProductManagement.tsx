import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Box24Regular,
  BoxMultiple24Regular,
  Save24Regular,
  Search24Regular,
  Add24Regular,
  Delete24Regular,
  Dismiss24Regular,
  Image24Regular,
  ArrowRight20Regular,
  ArrowLeft20Regular,
  Checkmark24Regular,
  Settings24Regular,
  Home24Regular,
  Edit24Regular,
  DocumentBulletList24Regular,
  ChevronDown24Regular,
  ChevronRight24Regular,
  ArrowDownload24Regular,
  ArrowUpload24Regular,
  Warning24Regular,
  ClipboardTextLtr24Regular,
} from "@fluentui/react-icons";
import { GlassPanel } from "./GlassPanel";
import { AdminOrderManagement } from "./AdminOrderManagement";
import {
  getProducts,
  saveProducts,
  getResolvedSets,
  saveSets,
  getOrders,
  getBookImageUrl,
  getProductsSync,
  getResolvedSetsSync,
  getOrdersSync,
  deleteOrder as deleteOrderFromStore,
  type RegisteredProduct,
  type SetProduct as StoreSetProduct,
  type ResolvedSetProduct,
} from "../utils/dataStore";

/* ───── Types (UI-level) ───── */
type SidebarTab = "products" | "sets" | "list" | "orders";

function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

const MAX_DISCOUNT = 10;
const inputClass = "w-full rounded-lg border border-white/40 bg-white/40 backdrop-blur-sm py-2 px-3 text-gray-700 text-[14px] placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/40 transition-all";

/* ───── Excel Helpers (XLSX) ───── */
function exportProductsToExcel(products: RegisteredProduct[]) {
  const headers = ["ISBN", "상품명", "출판사", "정가", "할인율(%)"];
  const rows = products.map((p) => [p.isbn, p.name, p.publisher, p.listPrice, p.discountRate]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [{ wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 10 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "상품목록");
  XLSX.writeFile(wb, `단품상품목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function downloadExcelTemplate() {
  const headers = ["ISBN", "상품명", "출판사", "정가", "할인율(%)"];
  const example = ["9791168341784", "트렌드 코리아 2026", "미래의창", 19800, 10];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = [{ wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 10 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "업로드양식");
  XLSX.writeFile(wb, "단품상품_업로드양식.xlsx");
}

function parseExcelFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        resolve(rows.map((r) => r.map(String)));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsArrayBuffer(file);
  });
}

/* ───── Confirmation Dialog ───── */
function ConfirmDialog({ open, title, message, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 260 }}
        className="rounded-2xl border border-white/30 bg-white/80 backdrop-blur-xl shadow-[0_16px_64px_rgba(0,0,0,0.15)] p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100/60 flex items-center justify-center shrink-0">
            <Warning24Regular className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-500 text-[13px] mb-5 pl-[52px]">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-white/40 bg-white/40 text-gray-600 text-[13px] hover:bg-white/60 transition-colors cursor-pointer">취소</button>
          <button type="button" onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-500 text-white text-[13px] hover:bg-red-600 transition-colors cursor-pointer">삭제</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───── Main Component ───── */
interface AdminProductManagementProps {
  onBack: () => void;
}

export function AdminProductManagement({ onBack }: AdminProductManagementProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("products");
  const [products, setProducts] = useState<RegisteredProduct[]>(() => getProductsSync());
  const [sets, setSets] = useState<ResolvedSetProduct[]>(() => getResolvedSetsSync());
  const [treeOpen, setTreeOpen] = useState(true);

  /* ── 서버에서 비동기 로드 ── */
  React.useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([getProducts(), getResolvedSets()]);
        setProducts(p);
        setSets(s);
      } catch (e) {
        console.warn("[AdminProductManagement] async load failed, using cache:", e);
      }
    })();
  }, []);

  /* ── Persist helpers (async) ── */
  const persistProducts = useCallback((newProducts: RegisteredProduct[]) => {
    setProducts(newProducts);
    saveProducts(newProducts); // async, fire & forget with cache
  }, []);

  const persistSets = useCallback((resolvedSets: ResolvedSetProduct[]) => {
    setSets(resolvedSets);
    // Convert to storage format (itemIds)
    const storeSets: StoreSetProduct[] = resolvedSets.map((s) => ({
      id: s.id,
      name: s.name,
      itemIds: s.items.map((i) => i.id),
      listPrice: s.listPrice,
      discountRate: s.discountRate,
      salePrice: s.salePrice,
    }));
    saveSets(storeSets); // async, fire & forget with cache
  }, []);

  /* ── Product Form ── */
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formIsbn, setFormIsbn] = useState("");
  const [formName, setFormName] = useState("");
  const [formPublisher, setFormPublisher] = useState("");
  const [formListPrice, setFormListPrice] = useState("");
  const [formDiscountRate, setFormDiscountRate] = useState("10");
  const [formSalePrice, setFormSalePrice] = useState("");

  /* ── Set Form ── */
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [setName, setSetName] = useState("");
  const [setSelectedIds, setSetSelectedIds] = useState<string[]>([]);
  const [setDiscountRate, setSetDiscountRate] = useState("10");
  const [setSalePrice, setSetSalePrice] = useState("");

  /* ── Detail Popup ── */
  const [detailProduct, setDetailProduct] = useState<RegisteredProduct | null>(null);
  const [detailSet, setDetailSet] = useState<ResolvedSetProduct | null>(null);

  /* ── List checkboxes & delete confirm ── */
  const [checkedProductIds, setCheckedProductIds] = useState<string[]>([]);
  const [checkedSetIds, setCheckedSetIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "product" | "set"; ids: string[] } | null>(null);

  /* ── File input ref for import ── */
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetProductForm = () => {
    setEditingProductId(null);
    setFormIsbn(""); setFormName(""); setFormPublisher("");
    setFormListPrice(""); setFormDiscountRate("10"); setFormSalePrice("");
  };

  const resetSetForm = () => {
    setEditingSetId(null);
    setSetName(""); setSetSelectedIds([]);
    setSetDiscountRate("10"); setSetSalePrice("");
  };

  const calcSalePrice = (lp: string, dr: string) => {
    const list = Number(lp);
    const disc = Math.min(Number(dr) || 0, MAX_DISCOUNT);
    if (list > 0) {
      setFormSalePrice(String(Math.round(list * (1 - disc / 100))));
    }
  };

  const handleListPriceChange = (val: string) => {
    setFormListPrice(val);
    calcSalePrice(val, formDiscountRate);
  };

  const handleDiscountRateChange = (val: string) => {
    const clamped = Math.min(Number(val) || 0, MAX_DISCOUNT);
    setFormDiscountRate(String(clamped));
    calcSalePrice(formListPrice, String(clamped));
  };

  const handleIsbnChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 13);
    setFormIsbn(digits);
  };

  const handleSaveProduct = () => {
    if (formIsbn.length !== 13) { toast.error("ISBN 13자리를 입력해 주세요."); return; }
    if (!formName.trim()) { toast.error("상품명을 입력해 주세요."); return; }
    if (!formListPrice) { toast.error("정가를 입력해 주세요."); return; }
    const dr = Math.min(Number(formDiscountRate) || 0, MAX_DISCOUNT);
    const sp = Number(formSalePrice) || Math.round(Number(formListPrice) * (1 - dr / 100));

    if (editingProductId) {
      const newProducts = products.map((p) =>
        p.id === editingProductId
          ? { ...p, isbn: formIsbn, name: formName, publisher: formPublisher, listPrice: Number(formListPrice), discountRate: dr, salePrice: sp, imageUrl: "" }
          : p
      );
      persistProducts(newProducts);
      toast.success("상품이 수정되었습니다.");
    } else {
      const newProduct: RegisteredProduct = {
        id: `rp-${Date.now()}`, isbn: formIsbn, name: formName, publisher: formPublisher,
        listPrice: Number(formListPrice), discountRate: dr, salePrice: sp,
        imageUrl: "", type: "single",
      };
      persistProducts([...products, newProduct]);
      toast.success("상품이 등록되었습니다.");
    }
    resetProductForm();
  };

  const startEditProduct = (p: RegisteredProduct) => {
    setEditingProductId(p.id);
    setFormIsbn(p.isbn); setFormName(p.name); setFormPublisher(p.publisher);
    setFormListPrice(String(p.listPrice)); setFormDiscountRate(String(p.discountRate));
    setFormSalePrice(String(p.salePrice));
    setActiveTab("products");
  };

  const handleDeleteProduct = (id: string) => {
    const newProducts = products.filter((p) => p.id !== id);
    persistProducts(newProducts);
    if (editingProductId === id) resetProductForm();
    toast.success("상품이 삭제되었습니다.");
  };

  const handleBulkDeleteProducts = (ids: string[]) => {
    const newProducts = products.filter((p) => !ids.includes(p.id));
    persistProducts(newProducts);
    if (editingProductId && ids.includes(editingProductId)) resetProductForm();
    setCheckedProductIds([]);
    toast.success(`${ids.length}개 상품이 삭제되었습니다.`);
  };

  const handleBulkDeleteSets = (ids: string[]) => {
    const newSets = sets.filter((s) => !ids.includes(s.id));
    persistSets(newSets);
    if (editingSetId && ids.includes(editingSetId)) resetSetForm();
    setCheckedSetIds([]);
    toast.success(`${ids.length}개 세트가 삭제되었습니다.`);
  };

  const calcSetSalePrice = (ids: string[], dr: string) => {
    const items = products.filter((p) => ids.includes(p.id));
    const totalList = items.reduce((s, p) => s + p.listPrice, 0);
    const disc = Math.min(Number(dr) || 0, MAX_DISCOUNT);
    return Math.round(totalList * (1 - disc / 100));
  };

  const handleSetDiscountChange = (val: string) => {
    const clamped = Math.min(Number(val) || 0, MAX_DISCOUNT);
    setSetDiscountRate(String(clamped));
    setSetSalePrice(String(calcSetSalePrice(setSelectedIds, String(clamped))));
  };

  const handleSaveSet = () => {
    if (!setName.trim()) { toast.error("세트 이름을 입력해 주세요."); return; }
    if (setSelectedIds.length < 2) { toast.error("최소 2개의 상품을 선택해 주세요."); return; }
    const items = products.filter((p) => setSelectedIds.includes(p.id));
    const totalList = items.reduce((s, p) => s + p.listPrice, 0);
    const dr = Math.min(Number(setDiscountRate) || 0, MAX_DISCOUNT);
    const sp = Number(setSalePrice) || Math.round(totalList * (1 - dr / 100));

    if (editingSetId) {
      const newSets = sets.map((s) =>
        s.id === editingSetId ? { ...s, name: setName, items, listPrice: totalList, discountRate: dr, salePrice: sp } : s
      );
      persistSets(newSets);
      toast.success("세트가 수정되었습니다.");
    } else {
      const newSet: ResolvedSetProduct = { id: `set-${Date.now()}`, name: setName, items, listPrice: totalList, discountRate: dr, salePrice: sp };
      persistSets([...sets, newSet]);
      toast.success("세트 상품이 생성되었습니다.");
    }
    resetSetForm();
  };

  const startEditSet = (s: ResolvedSetProduct) => {
    setEditingSetId(s.id);
    setSetName(s.name);
    setSetSelectedIds(s.items.map((i) => i.id));
    setSetDiscountRate(String(s.discountRate));
    setSetSalePrice(String(s.salePrice));
    setActiveTab("sets");
  };

  const handleDeleteSet = (id: string) => {
    const newSets = sets.filter((s) => s.id !== id);
    persistSets(newSets);
    if (editingSetId === id) resetSetForm();
    toast.success("세트가 삭제되었습니다.");
  };

  /* ── Excel Import (XLSX/XLS/CSV) ── */
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file);
      if (rows.length < 2) { toast.error("데이터가 없습니다."); return; }
      const dataRows = rows.slice(1);
      let count = 0;
      const newProducts: RegisteredProduct[] = [];
      for (const row of dataRows) {
        if (row.length < 5) continue;
        const [isbn, name, publisher, listPriceStr, discountRateStr] = row;
        if (!isbn || !name) continue;
        const lp = Number(listPriceStr) || 0;
        const dr = Math.min(Number(discountRateStr) || 0, MAX_DISCOUNT);
        const sp = Math.round(lp * (1 - dr / 100));
        newProducts.push({
          id: `rp-imp-${Date.now()}-${count}`,
          isbn: isbn.replace(/\D/g, ""),
          name,
          publisher: publisher || "",
          listPrice: lp,
          discountRate: dr,
          salePrice: sp,
          imageUrl: "",
          type: "single",
        });
        count++;
      }
      if (count > 0) {
        persistProducts([...products, ...newProducts]);
        toast.success(`${count}개 상품이 가져오기 되었습니다.`);
      } else {
        toast.error("유효한 상품 데이터가 없습니다.");
      }
    } catch {
      toast.error("파일을 읽는 중 오류가 발생했습니다.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Checkbox helpers ── */
  const toggleCheckProduct = (id: string) => {
    setCheckedProductIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleCheckSet = (id: string) => {
    setCheckedSetIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleAllProducts = () => {
    setCheckedProductIds((prev) => prev.length === products.length ? [] : products.map((p) => p.id));
  };
  const toggleAllSets = () => {
    setCheckedSetIds((prev) => prev.length === sets.length ? [] : sets.map((s) => s.id));
  };

  /* ── Orders ── */
  const [orders, setOrders] = useState(() => getOrdersSync());

  React.useEffect(() => {
    getOrders().then(setOrders).catch((e) => console.warn("[Admin] getOrders failed:", e));
  }, [activeTab]);

  /* ───── Sidebar tree items ───── */
  const sidebarTree = [
    { key: "products" as SidebarTab, label: "단품 관리", icon: Box24Regular },
    { key: "sets" as SidebarTab, label: "세트 구성", icon: BoxMultiple24Regular },
    { key: "list" as SidebarTab, label: "상품 목록", icon: DocumentBulletList24Regular },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* BG */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-50" />
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-200/30 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 260 }}
        className="w-[220px] shrink-0 flex flex-col border-r border-white/30 bg-white/40 backdrop-blur-xl"
      >
        <div className="p-5 border-b border-white/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Settings24Regular className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-gray-800 text-[14px]">관리자</p>
              <p className="text-gray-400 text-[11px]">대시보드</p>
            </div>
          </div>
        </div>

        {/* Tree Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <button type="button" onClick={() => setTreeOpen(!treeOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-gray-700 hover:bg-white/40 transition-all cursor-pointer">
            {treeOpen ? <ChevronDown24Regular className="w-4 h-4 text-gray-400" /> : <ChevronRight24Regular className="w-4 h-4 text-gray-400" />}
            <Box24Regular className="w-4.5 h-4.5 text-indigo-500" />
            상품 관리
          </button>
          <AnimatePresence>
            {treeOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="pl-6 space-y-0.5">
                  {sidebarTree.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.key;
                    return (
                      <button key={item.key} type="button" onClick={() => setActiveTab(item.key)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] transition-all cursor-pointer ${
                          active ? "bg-indigo-500/10 text-indigo-600 border border-indigo-200/40" : "text-gray-500 hover:bg-white/40 hover:text-gray-700 border border-transparent"
                        }`}>
                        <Icon className="w-4.5 h-4.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 주문 관리 */}
          <button type="button" onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] transition-all cursor-pointer mt-1 ${
              activeTab === "orders" ? "bg-indigo-500/10 text-indigo-600 border border-indigo-200/40" : "text-gray-700 hover:bg-white/40 border border-transparent"
            }`}>
            <ClipboardTextLtr24Regular className="w-4.5 h-4.5 text-indigo-500" />
            주문 관리
          </button>
        </nav>

        <div className="p-3 border-t border-white/20">
          <button type="button" onClick={onBack}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-white/40 hover:text-gray-700 text-[13px] transition-all cursor-pointer">
            <Home24Regular className="w-5 h-5" />
            메인으로
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6 flex flex-col">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 260, delay: 0.1 }}
          className="max-w-5xl mx-auto flex-1 overflow-hidden flex flex-col w-full">
          <AnimatePresence mode="wait">
            {/* ════════════════ 단품 관리 ════════════════ */}
            {activeTab === "products" && (
              <motion.div key="products" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ type: "spring", damping: 30, stiffness: 260 }} className="space-y-6 flex flex-col flex-1 overflow-hidden">
                <div className="shrink-0">
                  <h2 className="text-gray-800">단품 상품 관리</h2>
                  <p className="text-gray-400 text-[13px] mt-0.5">ISBN으로 도서를 검색하고 상품을 등록하세요.</p>
                </div>

                {/* 상품 등록/수정 폼 */}
                <GlassPanel className="p-5 shrink-0">
                  <h3 className="text-gray-800 flex items-center gap-2 mb-4">
                    {editingProductId ? <Edit24Regular className="text-amber-500" /> : <Add24Regular className="text-indigo-500" />}
                    {editingProductId ? "상품 수정" : "상품 등록"}
                    {editingProductId && (
                      <button type="button" onClick={resetProductForm} className="ml-auto text-gray-400 hover:text-gray-600 text-[12px] cursor-pointer">취소하고 새 등록</button>
                    )}
                  </h3>
                  <div className="flex gap-5">
                    {/* Image Preview */}
                    <div className="w-[130px] h-[180px] shrink-0 rounded-xl border-2 border-dashed border-gray-200/60 bg-white/30 flex flex-col items-center justify-center gap-2 overflow-hidden">
                      {formIsbn.length === 13 ? (
                        <img src={getBookImageUrl(formIsbn)} alt="도서 표지" className="w-full h-full object-cover rounded-xl"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                        />
                      ) : null}
                      <div className={formIsbn.length === 13 ? "hidden" : "flex flex-col items-center gap-2"}>
                        <Image24Regular className="w-8 h-8 text-gray-300" />
                        <p className="text-gray-400 text-[10px] text-center px-2">ISBN 입력 시<br />자동 조회</p>
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-gray-500 text-[12px] mb-1">ISBN (13자리)</label>
                        <div className="relative">
                          <Search24Regular className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input type="text" value={formIsbn} onChange={(e) => handleIsbnChange(e.target.value)} placeholder="978XXXXXXXXXX" maxLength={13} className={`${inputClass} !pl-9 font-mono`} />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-gray-500 text-[12px] mb-1">상품명</label>
                        <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="도서 제목" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-gray-500 text-[12px] mb-1">출판사</label>
                        <input type="text" value={formPublisher} onChange={(e) => setFormPublisher(e.target.value)} placeholder="출판사" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-gray-500 text-[12px] mb-1">정가</label>
                        <input type="number" value={formListPrice} onChange={(e) => handleListPriceChange(e.target.value)} placeholder="0" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-gray-500 text-[12px] mb-1">할인율 (%, 최대 {MAX_DISCOUNT}%)</label>
                        <input type="number" value={formDiscountRate} onChange={(e) => handleDiscountRateChange(e.target.value)} max={MAX_DISCOUNT} min={0} placeholder="10" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-gray-500 text-[12px] mb-1">할인 판매가 <span className="text-gray-400 text-[10px]">(자동계산)</span></label>
                        <input type="number" value={formSalePrice} readOnly placeholder="자동 계산" className={`${inputClass} bg-white/20 cursor-default`} />
                      </div>
                      <div className="col-span-2 flex justify-end pt-1">
                        <button type="button" onClick={handleSaveProduct}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-white text-[14px] shadow-[0_4px_16px_rgba(99,102,241,0.25)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer">
                          <Save24Regular className="w-4 h-4" />
                          {editingProductId ? "수정 저장" : "상품 저장"}
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                {/* 엑셀 가져오기 */}
                <GlassPanel className="p-4 shrink-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <ArrowUpload24Regular className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span className="text-gray-600 text-[13px]">엑셀(XLSX/XLS/CSV) 일괄 등록 — ISBN, 상품명, 출판사, 정가, 할인율</span>
                    <div className="flex gap-2 ml-auto">
                      <button type="button" onClick={downloadExcelTemplate}
                        className="flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/30 px-3 py-1.5 text-gray-600 text-[12px] hover:bg-white/50 transition-colors cursor-pointer">
                        <ArrowDownload24Regular className="w-3.5 h-3.5" />
                        양식 다운로드
                      </button>
                      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.txt" onChange={handleFileImport} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 border border-indigo-200/40 px-3 py-1.5 text-indigo-600 text-[12px] hover:bg-indigo-500/20 transition-colors cursor-pointer">
                        <ArrowUpload24Regular className="w-3.5 h-3.5" />
                        파일 가져오기
                      </button>
                    </div>
                  </div>
                </GlassPanel>

                {/* 등록된 상품 목록 */}
                <GlassPanel className="p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
                  <h3 className="text-gray-800 flex items-center gap-2 mb-4 shrink-0">
                    <Box24Regular className="text-indigo-500" />
                    등록된 상품 <span className="text-indigo-500 text-[13px]">({products.length}건)</span>
                  </h3>
                  <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-white/30">
                          <th className="text-left text-gray-400 py-2.5 px-3">ISBN</th>
                          <th className="text-left text-gray-400 py-2.5 px-3">상품명</th>
                          <th className="text-left text-gray-400 py-2.5 px-3">출판사</th>
                          <th className="text-right text-gray-400 py-2.5 px-3">정가</th>
                          <th className="text-right text-gray-400 py-2.5 px-3">할인율</th>
                          <th className="text-right text-gray-400 py-2.5 px-3">판매가</th>
                          <th className="text-center text-gray-400 py-2.5 px-3">관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p, idx) => (
                          <motion.tr key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                            className={`border-b border-white/20 hover:bg-white/20 transition-colors ${editingProductId === p.id ? "bg-amber-50/30" : ""}`}>
                            <td className="py-2.5 px-3 font-mono text-gray-500 text-[12px]">{p.isbn}</td>
                            <td className="py-2.5 px-3 text-gray-700">{p.name}</td>
                            <td className="py-2.5 px-3 text-gray-500">{p.publisher}</td>
                            <td className="py-2.5 px-3 text-right text-gray-500">{formatWon(p.listPrice)}</td>
                            <td className="py-2.5 px-3 text-right text-red-500">{p.discountRate}%</td>
                            <td className="py-2.5 px-3 text-right text-indigo-600">{formatWon(p.salePrice)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" onClick={() => startEditProduct(p)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-amber-500 hover:bg-amber-50/50 transition-colors cursor-pointer">
                                  <Edit24Regular className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => handleDeleteProduct(p.id)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:bg-red-50/50 transition-colors cursor-pointer">
                                  <Delete24Regular className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                        {products.length === 0 && (
                          <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-[13px]">등록된 상품이 없습니다. 위 폼에서 상품을 등록하세요.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </GlassPanel>
              </motion.div>
            )}

            {/* ════════════════ 세트 구성 ════════════════ */}
            {activeTab === "sets" && (
              <motion.div key="sets" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", damping: 30, stiffness: 260 }} className="space-y-6 flex flex-col flex-1 overflow-hidden">
                <div className="shrink-0">
                  <h2 className="text-gray-800">세트 상품 구성</h2>
                  <p className="text-gray-400 text-[13px] mt-0.5">등록된 단품을 조합하여 세트 상품을 만드세요.</p>
                </div>

                {products.length === 0 ? (
                  <GlassPanel className="p-8 text-center">
                    <Box24Regular className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-[14px]">먼저 단품 상품을 등록해 주세요.</p>
                    <p className="text-gray-400 text-[12px] mt-1">세트 구성에는 최소 2개의 단품이 필요합니다.</p>
                  </GlassPanel>
                ) : (
                  <GlassPanel className="p-5 shrink-0">
                    <h3 className="text-gray-800 flex items-center gap-2 mb-4">
                      {editingSetId ? <Edit24Regular className="text-amber-500" /> : <Add24Regular className="text-indigo-500" />}
                      {editingSetId ? "세트 수정" : "새 세트 상품 만들기"}
                      {editingSetId && (
                        <button type="button" onClick={resetSetForm} className="ml-auto text-gray-400 hover:text-gray-600 text-[12px] cursor-pointer">취소하고 새 생성</button>
                      )}
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-gray-500 text-[12px] mb-1">세트 이름</label>
                          <input type="text" value={setName} onChange={(e) => setSetName(e.target.value)} placeholder="예: 2026 필독서 세트" className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-[12px] mb-1">할인율 (%, 최대 {MAX_DISCOUNT}%)</label>
                          <input type="number" value={setDiscountRate} onChange={(e) => handleSetDiscountChange(e.target.value)} max={MAX_DISCOUNT} min={0} placeholder="10" className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-[12px] mb-1">세트 판매가</label>
                          <input type="number" value={setSalePrice} onChange={(e) => setSetSalePrice(e.target.value)} placeholder="자동 계산" className={inputClass} />
                          {setSelectedIds.length > 0 && (() => {
                            const totalList = products.filter((p) => setSelectedIds.includes(p.id)).reduce((s, p) => s + p.listPrice, 0);
                            const sp = Number(setSalePrice) || 0;
                            const actualDiscount = totalList > 0 ? Math.round((1 - sp / totalList) * 10000) / 100 : 0;
                            return (
                              <p className="text-[11px] mt-1 text-indigo-500">
                                정가 합계 {formatWon(totalList)} → <span className="text-red-500">{actualDiscount}% 할인</span> = <span className="text-indigo-600">{formatWon(sp)}</span>
                              </p>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Dual list */}
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                        <div className="rounded-xl border border-white/40 bg-white/20 backdrop-blur-sm overflow-hidden flex flex-col">
                          <div className="px-3 py-2.5 border-b border-white/30 bg-white/10">
                            <p className="text-gray-500 text-[12px]">등록된 단품 상품</p>
                          </div>
                          <div className="h-[360px] overflow-y-auto">
                            {products.filter((p) => !setSelectedIds.includes(p.id)).map((p) => (
                              <button key={p.id} type="button" onClick={() => {
                                const newIds = [...setSelectedIds, p.id];
                                setSetSelectedIds(newIds);
                                setSetSalePrice(String(calcSetSalePrice(newIds, setDiscountRate)));
                              }} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50/30 transition-colors cursor-pointer border-b border-white/10 last:border-0">
                                <span className="text-gray-700 text-[13px] truncate flex-1">{p.name}</span>
                                <span className="text-gray-400 text-[11px] shrink-0">{formatWon(p.listPrice)}</span>
                              </button>
                            ))}
                            {products.filter((p) => !setSelectedIds.includes(p.id)).length === 0 && (
                              <p className="text-gray-400 text-[12px] text-center py-6">모든 상품이 선택됨</p>
                            )}
                          </div>
                          <div className="px-3 py-2 border-t border-white/30 bg-white/10 flex items-center justify-between shrink-0">
                            <span className="text-gray-400 text-[11px]">정가 총계</span>
                            <span className="text-gray-600 text-[12px]">{formatWon(products.filter((p) => !setSelectedIds.includes(p.id)).reduce((s, p) => s + p.listPrice, 0))}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 pt-10">
                          <ArrowRight20Regular className="w-5 h-5 text-indigo-400" />
                          <ArrowLeft20Regular className="w-5 h-5 text-gray-300" />
                        </div>
                        <div className="rounded-xl border border-indigo-200/40 bg-indigo-50/20 backdrop-blur-sm overflow-hidden flex flex-col">
                          <div className="px-3 py-2.5 border-b border-indigo-100/40 bg-indigo-50/10">
                            <p className="text-indigo-600 text-[12px]">세트 구성 상품 ({setSelectedIds.length}개)</p>
                          </div>
                          <div className="h-[360px] overflow-y-auto">
                            {products.filter((p) => setSelectedIds.includes(p.id)).map((p) => (
                              <button key={p.id} type="button" onClick={() => {
                                const newIds = setSelectedIds.filter((x) => x !== p.id);
                                setSetSelectedIds(newIds);
                                setSetSalePrice(String(calcSetSalePrice(newIds, setDiscountRate)));
                              }} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-red-50/30 transition-colors cursor-pointer border-b border-indigo-100/20 last:border-0">
                                <span className="text-gray-700 text-[13px] truncate flex-1">{p.name}</span>
                                <span className="text-gray-400 text-[11px] shrink-0 mr-1">{formatWon(p.listPrice)}</span>
                                <Dismiss24Regular className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              </button>
                            ))}
                            {setSelectedIds.length === 0 && (
                              <p className="text-gray-400 text-[12px] text-center py-6">좌측에서 상품을 선택하세요</p>
                            )}
                          </div>
                          <div className="px-3 py-2 border-t border-indigo-100/40 bg-indigo-50/10 flex items-center justify-between shrink-0">
                            <span className="text-indigo-400 text-[11px]">정가 총계</span>
                            <span className="text-indigo-600 text-[12px]">{formatWon(products.filter((p) => setSelectedIds.includes(p.id)).reduce((s, p) => s + p.listPrice, 0))}</span>
                          </div>
                        </div>
                      </div>

                      {setSelectedIds.length > 0 && (
                        <div className="flex items-center justify-between px-1">
                          <span className="text-gray-500 text-[13px]">
                            정가 합계: {formatWon(products.filter((p) => setSelectedIds.includes(p.id)).reduce((s, p) => s + p.listPrice, 0))}
                            {setSalePrice && <span className="ml-3 text-indigo-600">판매가: {formatWon(Number(setSalePrice))}</span>}
                          </span>
                          <button type="button" onClick={handleSaveSet}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-white text-[14px] shadow-[0_4px_16px_rgba(99,102,241,0.25)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer">
                            <Checkmark24Regular className="w-4 h-4" />
                            {editingSetId ? "세트 수정" : "세트 생성"}
                          </button>
                        </div>
                      )}
                    </div>
                  </GlassPanel>
                )}

                {/* Existing sets */}
                <GlassPanel className="p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
                  <h3 className="text-gray-800 flex items-center gap-2 mb-4 shrink-0">
                    <BoxMultiple24Regular className="text-indigo-500" />
                    등록된 세트 <span className="text-indigo-500 text-[13px]">({sets.length}건)</span>
                  </h3>
                  <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-white/30">
                          <th className="text-left text-gray-400 py-2.5 px-3">세트명</th>
                          <th className="text-left text-gray-400 py-2.5 px-3">세트 목록</th>
                          <th className="text-right text-gray-400 py-2.5 px-3 whitespace-nowrap">정가</th>
                          <th className="text-right text-gray-400 py-2.5 px-3 whitespace-nowrap">할인율</th>
                          <th className="text-right text-gray-400 py-2.5 px-3 whitespace-nowrap">판매가</th>
                          <th className="text-center text-gray-400 py-2.5 px-3 whitespace-nowrap">관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sets.map((s, idx) => (
                          <motion.tr key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                            className={`border-b border-white/20 hover:bg-white/20 transition-colors ${editingSetId === s.id ? "bg-amber-50/30" : ""}`}>
                            <td className="py-3 px-3 text-gray-700 align-top whitespace-nowrap">
                              <div>
                                <p>{s.name}</p>
                                <p className="text-gray-400 text-[11px]">{s.items.length}개 구성</p>
                              </div>
                            </td>
                            <td className="py-3 px-3 align-top">
                              <div className="flex flex-wrap gap-1">
                                {s.items.map((item) => (
                                  <span key={item.id} className="rounded-lg bg-indigo-50/50 border border-indigo-100/50 px-2 py-0.5 text-[11px] text-indigo-600">{item.name}</span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right text-gray-500 align-top whitespace-nowrap">{formatWon(s.listPrice)}</td>
                            <td className="py-3 px-3 text-right text-red-500 align-top whitespace-nowrap">{s.discountRate}%</td>
                            <td className="py-3 px-3 text-right text-indigo-600 align-top whitespace-nowrap">{formatWon(s.salePrice)}</td>
                            <td className="py-3 px-3 text-center align-top">
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" onClick={() => startEditSet(s)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-amber-500 hover:bg-amber-50/50 transition-colors cursor-pointer">
                                  <Edit24Regular className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => handleDeleteSet(s.id)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:bg-red-50/50 transition-colors cursor-pointer">
                                  <Delete24Regular className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                        {sets.length === 0 && (
                          <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-[13px]">등록된 세트가 없습니다.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </GlassPanel>
              </motion.div>
            )}

            {/* ════════════════ 상품 목록 (전체) ════════════════ */}
            {activeTab === "list" && (
              <motion.div key="list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", damping: 30, stiffness: 260 }} className="space-y-6 flex flex-col flex-1 overflow-hidden">
                <div className="shrink-0">
                  <h2 className="text-gray-800">전체 상품 목록</h2>
                  <p className="text-gray-400 text-[13px] mt-0.5">단품과 세트 상품을 모두 확인합니다. 클릭하면 상세 정보를 볼 수 있습니다.</p>
                </div>

                {/* 단품 상품 */}
                <GlassPanel className="p-5 flex-1 min-h-[200px] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h3 className="text-gray-800 flex items-center gap-2">
                      <Box24Regular className="text-indigo-500" />
                      단품 상품 <span className="text-indigo-500 text-[13px]">({products.length}건)</span>
                    </h3>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => exportProductsToExcel(products)}
                        className="flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/30 px-3 py-1.5 text-gray-600 text-[12px] hover:bg-white/50 transition-colors cursor-pointer">
                        <ArrowDownload24Regular className="w-3.5 h-3.5" />
                        엑셀 다운로드
                      </button>
                      <button type="button" onClick={() => {
                        if (checkedProductIds.length === 0) { toast.error("삭제할 상품을 선택해 주세요."); return; }
                        setConfirmDelete({ type: "product", ids: checkedProductIds });
                      }}
                        className={`flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-200/40 px-3 py-1.5 text-red-600 text-[12px] hover:bg-red-500/20 transition-colors cursor-pointer ${checkedProductIds.length === 0 ? "opacity-50" : ""}`}>
                        <Delete24Regular className="w-3.5 h-3.5" />
                        선택 삭제{checkedProductIds.length > 0 ? ` (${checkedProductIds.length})` : ""}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
                    <table className="w-full text-[13px]">
                      <thead className="sticky top-0 z-10 bg-white/60 backdrop-blur-sm">
                        <tr className="border-b border-white/30">
                          <th className="text-center text-gray-400 py-2.5 px-2 w-[36px]">
                            <input type="checkbox" checked={checkedProductIds.length === products.length && products.length > 0}
                              onChange={toggleAllProducts}
                              className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer" />
                          </th>
                          <th className="text-left text-gray-400 py-2.5 px-3">ISBN</th>
                          <th className="text-left text-gray-400 py-2.5 px-3">상품명</th>
                          <th className="text-left text-gray-400 py-2.5 px-3">출판사</th>
                          <th className="text-right text-gray-400 py-2.5 px-3">정가</th>
                          <th className="text-right text-gray-400 py-2.5 px-3">할인율</th>
                          <th className="text-right text-gray-400 py-2.5 px-3">판매가</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p.id}
                            className="border-b border-white/20 hover:bg-indigo-50/20 transition-colors cursor-pointer select-none">
                            <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={checkedProductIds.includes(p.id)}
                                onChange={() => toggleCheckProduct(p.id)}
                                className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer" />
                            </td>
                            <td className="py-2.5 px-3 font-mono text-gray-500 text-[12px]" onClick={() => setDetailProduct(p)}>{p.isbn}</td>
                            <td className="py-2.5 px-3 text-gray-700" onClick={() => setDetailProduct(p)}>{p.name}</td>
                            <td className="py-2.5 px-3 text-gray-500" onClick={() => setDetailProduct(p)}>{p.publisher}</td>
                            <td className="py-2.5 px-3 text-right text-gray-500" onClick={() => setDetailProduct(p)}>{formatWon(p.listPrice)}</td>
                            <td className="py-2.5 px-3 text-right text-red-500" onClick={() => setDetailProduct(p)}>{p.discountRate}%</td>
                            <td className="py-2.5 px-3 text-right text-indigo-600" onClick={() => setDetailProduct(p)}>{formatWon(p.salePrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassPanel>

                {/* 세트 상품 */}
                <GlassPanel className="p-5 flex-1 min-h-[200px] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h3 className="text-gray-800 flex items-center gap-2">
                      <BoxMultiple24Regular className="text-indigo-500" />
                      세트 상품 <span className="text-indigo-500 text-[13px]">({sets.length}건)</span>
                    </h3>
                    <button type="button" onClick={() => {
                      if (checkedSetIds.length === 0) { toast.error("삭제할 세트를 선택해 주세요."); return; }
                      setConfirmDelete({ type: "set", ids: checkedSetIds });
                    }}
                      className={`flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-200/40 px-3 py-1.5 text-red-600 text-[12px] hover:bg-red-500/20 transition-colors cursor-pointer ${checkedSetIds.length === 0 ? "opacity-50" : ""}`}>
                      <Delete24Regular className="w-3.5 h-3.5" />
                      선택 삭제{checkedSetIds.length > 0 ? ` (${checkedSetIds.length})` : ""}
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
                    <table className="w-full text-[13px]">
                      <thead className="sticky top-0 z-10 bg-white/60 backdrop-blur-sm">
                        <tr className="border-b border-white/30">
                          <th className="text-center text-gray-400 py-2.5 px-2 w-[36px]">
                            <input type="checkbox" checked={checkedSetIds.length === sets.length && sets.length > 0}
                              onChange={toggleAllSets}
                              className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer" />
                          </th>
                          <th className="text-left text-gray-400 py-2.5 px-3">세트명</th>
                          <th className="text-center text-gray-400 py-2.5 px-3">구성 상품수</th>
                          <th className="text-right text-gray-400 py-2.5 px-3">정가 합계</th>
                          <th className="text-right text-gray-400 py-2.5 px-3">할인율</th>
                          <th className="text-right text-gray-400 py-2.5 px-3">판매가</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sets.map((s) => (
                          <tr key={s.id}
                            className="border-b border-white/20 hover:bg-indigo-50/20 transition-colors cursor-pointer select-none">
                            <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={checkedSetIds.includes(s.id)}
                                onChange={() => toggleCheckSet(s.id)}
                                className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer" />
                            </td>
                            <td className="py-2.5 px-3 text-gray-700" onClick={() => setDetailSet(s)}>{s.name}</td>
                            <td className="py-2.5 px-3 text-center text-gray-500" onClick={() => setDetailSet(s)}>{s.items.length}개</td>
                            <td className="py-2.5 px-3 text-right text-gray-500" onClick={() => setDetailSet(s)}>{formatWon(s.listPrice)}</td>
                            <td className="py-2.5 px-3 text-right text-red-500" onClick={() => setDetailSet(s)}>{s.discountRate}%</td>
                            <td className="py-2.5 px-3 text-right text-indigo-600" onClick={() => setDetailSet(s)}>{formatWon(s.salePrice)}</td>
                          </tr>
                        ))}
                        {sets.length === 0 && (
                          <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-[13px]">등록된 세트가 없습니다.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </GlassPanel>
              </motion.div>
            )}

            {/* ════════════════ 주문 관리 ════════════════ */}
            {activeTab === "orders" && (
              <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", damping: 30, stiffness: 260 }} className="flex flex-col flex-1 overflow-hidden">
                <AdminOrderManagement orders={orders} onDeleteOrders={async (orderNumbers) => {
                  for (const on of orderNumbers) {
                    try { await deleteOrderFromStore(on); } catch (e) { console.error("[Admin] delete order error:", e); }
                  }
                  const updatedOrders = await getOrders();
                  setOrders(updatedOrders);
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* ═══════ Detail Popup: Single Product ═══════ */}
      <AnimatePresence>
        {detailProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setDetailProduct(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="relative rounded-2xl border border-white/30 bg-white/70 backdrop-blur-xl shadow-[0_16px_64px_rgba(0,0,0,0.15)] p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setDetailProduct(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100/50 hover:text-gray-600 cursor-pointer transition-colors">
                <Dismiss24Regular className="w-5 h-5" />
              </button>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-[80px] h-[110px] rounded-lg bg-indigo-50/50 border border-indigo-100/50 overflow-hidden shrink-0">
                  <img src={getBookImageUrl(detailProduct.isbn)} alt={detailProduct.name} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div>
                  <span className="text-indigo-500 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50/50 border border-indigo-100/50">단품</span>
                  <h3 className="text-gray-800 mt-1.5">{detailProduct.name}</h3>
                  <p className="text-gray-500 text-[13px]">{detailProduct.publisher}</p>
                </div>
              </div>
              <table className="w-full text-[13px]">
                <tbody>
                  {([
                    ["ISBN", detailProduct.isbn],
                    ["정가", formatWon(detailProduct.listPrice)],
                    ["할인율", `${detailProduct.discountRate}%`],
                    ["판매가", formatWon(detailProduct.salePrice)],
                  ] as [string, string][]).map(([label, val]) => (
                    <tr key={label} className="border-b border-gray-100/50">
                      <td className="py-2 text-gray-400 w-[80px]">{label}</td>
                      <td className="py-2 text-gray-700 font-mono">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={() => { startEditProduct(detailProduct); setDetailProduct(null); }}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-white text-[14px] shadow-[0_4px_16px_rgba(245,158,11,0.25)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer">
                <Edit24Regular className="w-4 h-4" />
                상품 정보 수정
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Detail Popup: Set Product ═══════ */}
      <AnimatePresence>
        {detailSet && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setDetailSet(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="relative rounded-2xl border border-white/30 bg-white/70 backdrop-blur-xl shadow-[0_16px_64px_rgba(0,0,0,0.15)] p-6 w-full max-w-xl mx-4"
              onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setDetailSet(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100/50 hover:text-gray-600 cursor-pointer transition-colors">
                <Dismiss24Regular className="w-5 h-5" />
              </button>
              <div className="mb-4">
                <span className="text-purple-500 text-[11px] px-2 py-0.5 rounded-full bg-purple-50/50 border border-purple-100/50">세트</span>
                <h3 className="text-gray-800 mt-1.5">{detailSet.name}</h3>
                <div className="flex items-center gap-4 text-[13px] mt-1">
                  <span className="text-gray-400 line-through">{formatWon(detailSet.listPrice)}</span>
                  <span className="text-indigo-600">{formatWon(detailSet.salePrice)}</span>
                  <span className="text-red-500 text-[12px]">-{detailSet.discountRate}%</span>
                </div>
              </div>
              <p className="text-gray-500 text-[12px] mb-3">구성 상품 ({detailSet.items.length}개)</p>
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
                {detailSet.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm p-3">
                    <div className="w-[50px] h-[68px] rounded-lg bg-indigo-50/50 border border-indigo-100/50 overflow-hidden shrink-0">
                      <img src={getBookImageUrl(item.isbn)} alt={item.name} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-[13px] truncate">{item.name}</p>
                      <p className="text-gray-400 text-[11px]">{item.publisher} &middot; ISBN: {item.isbn}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-gray-400 text-[11px] line-through">{formatWon(item.listPrice)}</p>
                      <p className="text-indigo-600 text-[13px]">{formatWon(item.salePrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => { startEditSet(detailSet); setDetailSet(null); }}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-white text-[14px] shadow-[0_4px_16px_rgba(245,158,11,0.25)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer">
                <Edit24Regular className="w-4 h-4" />
                세트 정보 수정
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Delete Confirmation ═══════ */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            open
            title="상품 삭제"
            message={`선택한 ${confirmDelete.ids.length}개의 ${confirmDelete.type === "product" ? "단품 상품" : "세트 상품"}을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
            onConfirm={() => {
              if (confirmDelete.type === "product") handleBulkDeleteProducts(confirmDelete.ids);
              else handleBulkDeleteSets(confirmDelete.ids);
              setConfirmDelete(null);
            }}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
