import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoSrc from "./logo.png";

export const sf = (v, d = 0) => (isFinite(parseFloat(v)) ? parseFloat(v) : d);

export const fmtLabel = (v) =>
  !v ? "—" : v.charAt(0).toUpperCase() + v.slice(1);

export const DEFAULT_VISIBLE_COLUMNS = {
  picture: true,
  common_name: true,
  scientific_name: true,
  type: true,
  size: true,
  purchasing_price: true,
  profit: true,
  margin_pct: false,
  selling_price: true,
};

export const REPORT_COLUMN_DEFS = [
  { key: "picture", label: "Picture" },
  { key: "common_name", label: "Common Name" },
  { key: "scientific_name", label: "Scientific Name" },
  { key: "type", label: "Type" },
  { key: "size", label: "Size" },
  { key: "purchasing_price", label: "Purchase Price" },
  { key: "profit", label: "Profit" },
  { key: "margin_pct", label: "Margin %" },
  { key: "selling_price", label: "Selling Price" },
];

export const getDefaultReportConfig = () => ({
  title: "Local Product List",
  companyName: "Tropical Shellfish (Pvt) Ltd",
  subtitle: "Fresh & Frozen Seafood Exporters  |  Quality You Can Trust",
  reportDate: new Date().toISOString().split("T")[0],
  notes: "",
  footerNote:
    "Tropical Shellfish (Pvt) Ltd  |  Prices subject to change without prior notice",
  groupBySection: true,
  visibleColumns: { ...DEFAULT_VISIBLE_COLUMNS },
  excludedKeys: [],
  customOrder: [],
});

const ACTIVE_LAYOUT_STORAGE_KEY = "tsf_local_report_active_layout_v1";
const SAVED_DRAFTS_STORAGE_KEY = "tsf_local_report_saved_drafts_v1";

export function loadActiveReportLayout() {
  try {
    const raw = localStorage.getItem(ACTIVE_LAYOUT_STORAGE_KEY);
    if (!raw) return getDefaultReportConfig();
    const parsed = JSON.parse(raw);
    const def = getDefaultReportConfig();
    return {
      ...def,
      ...parsed,
      visibleColumns: {
        ...DEFAULT_VISIBLE_COLUMNS,
        ...(parsed.visibleColumns || {}),
      },
      excludedKeys: Array.isArray(parsed.excludedKeys)
        ? parsed.excludedKeys
        : [],
      customOrder: Array.isArray(parsed.customOrder) ? parsed.customOrder : [],
    };
  } catch {
    return getDefaultReportConfig();
  }
}

export function saveActiveReportLayout(config) {
  try {
    localStorage.setItem(ACTIVE_LAYOUT_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error("Failed to save active report layout:", err);
  }
}

export function loadSavedReportDrafts() {
  try {
    const raw = localStorage.getItem(SAVED_DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedReportDrafts(drafts) {
  localStorage.setItem(SAVED_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

// ── Calculation helpers ──────────────────────────────────────────────────────
export function calcFromProfit(pp, profit) {
  const sp = pp + profit;
  const pmp = sp > 0 ? (profit / sp) * 100 : 0;
  return {
    profit,
    selling_price: parseFloat(sp.toFixed(2)),
    profit_margin_percentage: parseFloat(pmp.toFixed(2)),
  };
}

export function calcFromSelling(pp, sp) {
  const profit = sp - pp;
  const pmp = sp > 0 ? (profit / sp) * 100 : 0;
  return {
    profit: parseFloat(profit.toFixed(2)),
    selling_price: sp,
    profit_margin_percentage: parseFloat(pmp.toFixed(2)),
  };
}

export function calcFromMarginPct(pp, pmp) {
  const profit = pmp < 100 && pmp >= 0 ? (pmp / (100 - pmp)) * pp : 0;
  const sp = pp + profit;
  return {
    profit: parseFloat(profit.toFixed(2)),
    selling_price: parseFloat(sp.toFixed(2)),
    profit_margin_percentage: pmp,
  };
}

// ── Stable key & cloning helpers ─────────────────────────────────────────────
export function attachRowKeys(data = []) {
  const seenCounts = {};
  return (data || []).map((product) => {
    const base = `${product.id}::${(product.category || "none").toLowerCase()}`;
    const idx = seenCounts[base] || 0;
    seenCounts[base] = idx + 1;
    const _rowKey = product._rowKey || `${base}::${idx}`;
    return {
      ...product,
      _rowKey,
      _origCommonName: product._origCommonName ?? product.common_name ?? "",
      _origCategory: product._origCategory ?? product.category ?? "",
      variants: (product.variants || []).map((v, vi) => ({
        ...v,
        _vKey: v._vKey || (v.id ? `v_${v.id}` : `v_tmp_${_rowKey}_${vi}`),
      })),
    };
  });
}

export function cloneReportItems(items = []) {
  return (items || []).map((p) => ({
    ...p,
    categories: Array.isArray(p.categories) ? [...p.categories] : p.categories,
    variants: (p.variants || []).map((v) => ({ ...v })),
  }));
}

// ── Dirty detection ──────────────────────────────────────────────────────────
const approxDiff = (a, b) => Math.abs(sf(a) - sf(b)) > 0.005;

export function isProductMasterDirty(orig, edited) {
  if (!orig || !edited) return false;
  if ((orig.common_name || "").trim() !== (edited.common_name || "").trim())
    return true;
  if (
    (orig.scientific_name || "").trim() !==
    (edited.scientific_name || "").trim()
  )
    return true;

  const origVars = orig.variants || [];
  const editVars = edited.variants || [];
  if (origVars.length !== editVars.length) return true;

  for (let i = 0; i < editVars.length; i++) {
    const ev = editVars[i];
    if (ev._isNew) return true;
    const ov = origVars.find(
      (v) =>
        (v._vKey && ev._vKey && v._vKey === ev._vKey) ||
        (v.id && ev.id && String(v.id) === String(ev.id)),
    );
    if (!ov) return true;
    if ((ov.size || "").trim() !== (ev.size || "").trim()) return true;
    if ((ov.unit || "kg") !== (ev.unit || "kg")) return true;
    if (approxDiff(ov.purchasing_price, ev.purchasing_price)) return true;
  }
  return false;
}

export function isProductLocalDirty(orig, edited) {
  if (!orig || !edited) return false;
  if (
    (orig.category || "").toLowerCase() !==
    (edited.category || "").toLowerCase()
  )
    return true;

  const origVars = orig.variants || [];
  const editVars = edited.variants || [];
  if (origVars.length !== editVars.length) return true;

  for (let i = 0; i < editVars.length; i++) {
    const ev = editVars[i];
    if (ev._isNew) return true;
    const ov = origVars.find(
      (v) =>
        (v._vKey && ev._vKey && v._vKey === ev._vKey) ||
        (v.id && ev.id && String(v.id) === String(ev.id)),
    );
    if (!ov) return true;
    if (approxDiff(ov.purchasing_price, ev.purchasing_price)) return true;
    if (approxDiff(ov.profit, ev.profit)) return true;
    if (approxDiff(ov.selling_price, ev.selling_price)) return true;
    if (approxDiff(ov.profit_margin_percentage, ev.profit_margin_percentage))
      return true;
  }
  return false;
}

export function isRowDirty(orig, edited) {
  return isProductMasterDirty(orig, edited) || isProductLocalDirty(orig, edited);
}

export function getDirtySummary(origItems = [], workingItems = []) {
  const origByRowKey = new Map(origItems.map((p) => [p._rowKey, p]));
  const masterProductIds = new Set();
  const localProductIds = new Set();
  const dirtyRowKeys = new Set();

  workingItems.forEach((edited) => {
    const orig =
      origByRowKey.get(edited._rowKey) ||
      origItems.find((o) => String(o.id) === String(edited.id));
    if (!orig) return;
    const mDirty = isProductMasterDirty(orig, edited);
    const lDirty = isProductLocalDirty(orig, edited);
    if (mDirty) masterProductIds.add(edited.id);
    if (lDirty) localProductIds.add(edited.id);
    if (mDirty || lDirty) dirtyRowKeys.add(edited._rowKey);
  });

  return {
    masterProductIds,
    localProductIds,
    dirtyRowKeys,
    modifiedProductCount: new Set([...masterProductIds, ...localProductIds])
      .size,
  };
}

// ── Ordering helpers ─────────────────────────────────────────────────────────
export function sortItemsByReportConfig(
  items = [],
  customOrder = [],
  getSortIndex,
  useDefaultProductOrder = false,
) {
  if (customOrder && customOrder.length > 0) {
    const orderMap = new Map(customOrder.map((k, idx) => [k, idx]));
    return [...items].sort((a, b) => {
      const ia = orderMap.has(a._rowKey) ? orderMap.get(a._rowKey) : 999999;
      const ib = orderMap.has(b._rowKey) ? orderMap.get(b._rowKey) : 999999;
      if (ia !== ib) return ia - ib;
      return 0;
    });
  }
  if (useDefaultProductOrder && typeof getSortIndex === "function") {
    return [...items].sort(
      (a, b) => getSortIndex(a.common_name) - getSortIndex(b.common_name),
    );
  }
  return items;
}

// ── Shared PDF generation ────────────────────────────────────────────────────
function formatPdfDate(dateStr) {
  if (!dateStr) {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateLocalReportPDF({
  mode = "custom", // "full" | "pricelist" | "custom"
  products = [],
  reportConfig,
  API_URL,
  getSortIndex,
}) {
  if (!products || products.length === 0) {
    alert("No products to download");
    return;
  }

  const cfg = reportConfig || getDefaultReportConfig();
  const vis = cfg.visibleColumns || DEFAULT_VISIBLE_COLUMNS;
  const hasCustomOrder = Array.isArray(cfg.customOrder) && cfg.customOrder.length > 0;

  // Determine columns based on mode
  let activeColKeys = [];
  if (mode === "full") {
    const candidate = ["picture", "common_name", "scientific_name", "type", "size"];
    activeColKeys = candidate.filter((k) => vis[k] !== false);
    if (activeColKeys.length === 0) activeColKeys = candidate;
  } else if (mode === "pricelist") {
    const candidate = [
      "picture",
      "common_name",
      "scientific_name",
      "size",
      "selling_price",
    ];
    activeColKeys = candidate.filter(
      (k) => k === "selling_price" || vis[k] !== false,
    );
  } else {
    activeColKeys = REPORT_COLUMN_DEFS.map((c) => c.key).filter(
      (k) => vis[k] !== false,
    );
    if (activeColKeys.length === 0) {
      activeColKeys = ["common_name", "size", "selling_price"];
    }
  }

  const useLandscape =
    mode === "custom" &&
    (activeColKeys.length >= 6 ||
      activeColKeys.includes("purchasing_price") ||
      activeColKeys.includes("profit"));

  const doc = new jsPDF({
    orientation: useLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  const NAVY = [13, 71, 161];
  const NAVY_DARK = [8, 47, 114];
  const NAVY_LIGHT = [224, 232, 247];
  const WHITE = [255, 255, 255];
  const DARK = [20, 20, 40];
  const GREY = [180, 200, 230];

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 28, "F");
  try {
    doc.addImage(logoSrc, "PNG", margin, 4, 22, 20);
  } catch {}
  doc.setTextColor(...WHITE);
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(cfg.companyName || "Tropical Shellfish (Pvt) Ltd", margin + 26, 13);
  doc.setFontSize(7.5);
  doc.setFont(undefined, "normal");
  doc.text(
    cfg.subtitle || "Fresh & Frozen Seafood Exporters  |  Quality You Can Trust",
    margin + 26,
    19,
  );

  // Title / Date sub-header
  doc.setFillColor(...NAVY_LIGHT);
  doc.rect(0, 28, pageW, 9, "F");
  doc.setTextColor(...DARK);
  doc.setFontSize(7.5);
  doc.setFont(undefined, "bold");
  const subLabel =
    mode === "pricelist"
      ? `${cfg.title || "Local Product List"} — Selling Prices`
      : mode === "custom"
        ? cfg.title || "Local Product List"
        : "Generated:";
  doc.text(subLabel, margin, 33.5);
  doc.setFont(undefined, "normal");
  const dateText = formatPdfDate(cfg.reportDate);
  if (mode === "full") {
    doc.text(dateText, margin + 18, 33.5);
  } else {
    doc.text(dateText, pageW - margin, 33.5, { align: "right" });
  }

  let tableStartY = 40;
  if (cfg.notes && cfg.notes.trim()) {
    doc.setFontSize(7.5);
    doc.setTextColor(40, 55, 85);
    const wrapped = doc.splitTextToSize(
      `Note: ${cfg.notes.trim()}`,
      pageW - margin * 2,
    );
    doc.text(wrapped, margin, 42);
    tableStartY = 42 + wrapped.length * 3.8 + 2;
  }

  // Image cache
  const imageCache = {};
  if (activeColKeys.includes("picture")) {
    const fetchImg = async (p) => {
      if (!p || imageCache[p] !== undefined) return;
      try {
        const url = p.startsWith("http") ? p : `${API_URL}${p}`;
        const blob = await (await fetch(url)).blob();
        imageCache[p] = await new Promise((res) => {
          const r = new FileReader();
          r.onloadend = () => res(r.result);
          r.readAsDataURL(blob);
        });
      } catch {
        imageCache[p] = null;
      }
    };
    await Promise.all(
      [...new Set(products.map((p) => p.image_url).filter(Boolean))].map(
        fetchImg,
      ),
    );
  }

  const drawPlaceholder = (x, y, w, h) => {
    doc.setFillColor(232, 238, 252);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");
    doc.setDrawColor(...GREY);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, "S");
    doc.setFontSize(4.5);
    doc.setTextColor(25, 100, 200);
    doc.text("No Image", x + w / 2, y + h / 2 + 1.5, { align: "center" });
  };

  // Order & build flat variant rows
  const orderedProducts = hasCustomOrder
    ? sortItemsByReportConfig(products, cfg.customOrder, getSortIndex, false)
    : [...products].sort(
        (a, b) => getSortIndex(a.common_name) - getSortIndex(b.common_name),
      );

  const tableRows = [];
  orderedProducts.forEach((product) => {
    const variants =
      mode === "pricelist" && !hasCustomOrder
        ? [...(product.variants || [])].sort(
            (a, b) => (sf(a.size) || 0) - (sf(b.size) || 0),
          )
        : product.variants || [];

    if (variants.length > 0) {
      variants.forEach((v, idx) => {
        tableRows.push({
          isFirst: idx === 0,
          commonName: product.common_name || "—",
          scientificName: product.scientific_name || "—",
          image: product.image_url || null,
          type: fmtLabel(product.category),
          size: v.size || "—",
          purchasingPrice: v.purchasing_price,
          profit: v.profit,
          marginPct: v.profit_margin_percentage,
          sellingPrice: v.selling_price,
        });
      });
    } else {
      tableRows.push({
        isFirst: true,
        commonName: product.common_name || "—",
        scientificName: product.scientific_name || "—",
        image: product.image_url || null,
        type: fmtLabel(product.category),
        size: "—",
        purchasingPrice: null,
        profit: null,
        marginPct: null,
        sellingPrice: null,
      });
    }
  });

  const colMeta = {
    picture: {
      header: { content: "Picture", styles: { halign: "center" } },
      style: { cellWidth: 14, halign: "center", valign: "middle" },
      value: () => "",
    },
    common_name: {
      header: { content: "Common Name", styles: { halign: "left" } },
      style: {
        cellWidth: useLandscape ? 48 : 50,
        halign: "left",
        valign: "middle",
        fontStyle: "bold",
        fontSize: 7.5,
      },
      value: (r) => (r.isFirst ? r.commonName : ""),
    },
    scientific_name: {
      header: { content: "Scientific Name", styles: { halign: "left" } },
      style: {
        cellWidth: useLandscape ? 44 : 44,
        halign: "left",
        valign: "middle",
        fontStyle: "italic",
        fontSize: 7,
        textColor: [50, 80, 150],
      },
      value: (r) => (r.isFirst ? r.scientificName : ""),
    },
    type: {
      header: { content: "Type", styles: { halign: "left" } },
      style: { cellWidth: 18, halign: "left", valign: "middle", fontSize: 7 },
      value: (r) => (r.isFirst ? r.type : ""),
    },
    size: {
      header: { content: "Size / Range", styles: { halign: "left" } },
      style: {
        cellWidth: "auto",
        halign: "left",
        valign: "middle",
        fontSize: 7,
      },
      value: (r) => r.size,
    },
    purchasing_price: {
      header: { content: "Purchase (Rs)", styles: { halign: "right" } },
      style: {
        cellWidth: 26,
        halign: "right",
        valign: "middle",
        fontSize: 7.5,
      },
      value: (r) =>
        r.purchasingPrice != null ? `Rs. ${sf(r.purchasingPrice).toFixed(2)}` : "—",
    },
    profit: {
      header: { content: "Profit (Rs)", styles: { halign: "right" } },
      style: {
        cellWidth: 24,
        halign: "right",
        valign: "middle",
        fontSize: 7.5,
      },
      value: (r) => (r.profit != null ? `Rs. ${sf(r.profit).toFixed(2)}` : "—"),
    },
    margin_pct: {
      header: { content: "Margin %", styles: { halign: "right" } },
      style: {
        cellWidth: 18,
        halign: "right",
        valign: "middle",
        fontSize: 7.5,
      },
      value: (r) =>
        r.marginPct != null ? `${sf(r.marginPct).toFixed(1)}%` : "—",
    },
    selling_price: {
      header: { content: "Selling Price (Rs)", styles: { halign: "right" } },
      style: {
        cellWidth: 28,
        halign: "right",
        valign: "middle",
        fontSize: 7.5,
        fontStyle: "bold",
        textColor: [0, 120, 0],
      },
      value: (r) =>
        r.sellingPrice != null ? `Rs. ${sf(r.sellingPrice).toFixed(2)}` : "—",
    },
  };

  const picColIdx = activeColKeys.indexOf("picture");
  const productLevelCols = new Set([
    "picture",
    "common_name",
    "scientific_name",
    "type",
  ]);
  const columnStyles = {};
  activeColKeys.forEach((k, idx) => {
    columnStyles[idx] = colMeta[k].style;
  });

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [activeColKeys.map((k) => colMeta[k].header)],
    body: tableRows.map((r) => activeColKeys.map((k) => colMeta[k].value(r))),
    theme: "grid",
    columnStyles,
    headStyles: {
      fillColor: NAVY_DARK,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
      minCellHeight: picColIdx !== -1 ? 12 : 8,
      textColor: DARK,
      lineColor: GREY,
      lineWidth: 0.2,
    },
    willDrawCell: (data) => {
      if (data.section !== "body") return;
      const r = tableRows[data.row.index];
      const colKey = activeColKeys[data.column.index];
      if (r && !r.isFirst && productLevelCols.has(colKey)) {
        data.cell.styles.lineWidth = {
          top: 0,
          bottom: 0.2,
          left: 0.2,
          right: 0.2,
        };
      }
    },
    didDrawCell: (data) => {
      if (
        picColIdx === -1 ||
        data.section !== "body" ||
        data.column.index !== picColIdx
      )
        return;
      const r = tableRows[data.row.index];
      if (!r || !r.isFirst) return;
      const imgW = 10;
      const imgH = 10;
      const x = data.cell.x + (data.cell.width - imgW) / 2;
      const y = data.cell.y + (data.cell.height - imgH) / 2;
      const src = r.image ? imageCache[r.image] : null;
      if (src) {
        const f = src.includes("image/png") ? "PNG" : "JPEG";
        try {
          doc.addImage(src, f, x, y, imgW, imgH, undefined, "FAST");
        } catch {
          drawPlaceholder(x, y, imgW, imgH);
        }
      } else {
        drawPlaceholder(x, y, imgW, imgH);
      }
    },
  });

  const totalPages = doc.internal.getNumberOfPages();
  const footerText =
    cfg.footerNote ||
    "Tropical Shellfish (Pvt) Ltd  |  Prices subject to change without prior notice";

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 8, pageW, 8, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(6);
    doc.setFont(undefined, "normal");
    doc.text(footerText, pageW / 2, pageH - 3, { align: "center" });
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 3, {
      align: "right",
    });
  }

  const dateTag = cfg.reportDate || new Date().toISOString().split("T")[0];
  const filePrefix =
    mode === "pricelist"
      ? "Price_List"
      : mode === "custom"
        ? (cfg.title || "Local_Product_Report").replace(/[^a-z0-9_-]+/gi, "_")
        : "Local_Product_List";

  doc.save(`${filePrefix}_${dateTag}.pdf`);
}
