import React, { useEffect, useMemo, useState } from "react";
import "./Productlist.css";
import { useNavigate } from "react-router-dom";
import { isAdmin } from "../../hooks/useAuth";
import ReportCustomizerPanel from "./ReportCustomizerPanel";
import SavedReportsModal from "./SavedReportsModal";
import {
  sf,
  fmtLabel as fmt,
  DEFAULT_VISIBLE_COLUMNS,
  getDefaultReportConfig,
  loadActiveReportLayout,
  saveActiveReportLayout,
  loadSavedReportDrafts,
  persistSavedReportDrafts,
  calcFromProfit,
  calcFromSelling,
  calcFromMarginPct,
  attachRowKeys,
  cloneReportItems,
  isRowDirty,
  isProductMasterDirty,
  isProductLocalDirty,
  getDirtySummary,
  sortItemsByReportConfig,
  generateLocalReportPDF,
} from "./localReportUtils";

/* ── Badge helpers ─────────────────────────────────────────────── */
const getCategoryBadgeClass = (c) => {
  if (!c) return "badge-default-cat";
  const v = c.toLowerCase();
  if (v === "live") return "badge-live";
  if (v === "fresh") return "badge-fresh";
  if (v === "frozen") return "badge-frozen";
  return "badge-default-cat";
};
const getCategoryBadgeIcon = (c) => {
  if (!c) return "";
  const v = c.toLowerCase();
  if (v === "live") return "🟢";
  if (v === "fresh") return "💧";
  if (v === "frozen") return "❄️";
  return "";
};

const sectionCategories = [
  // ── Shellfish ──
  { name: "Oyster", keywords: ["oyster", "depurated oyster"] },
  {
    name: "Clams",
    keywords: [
      "clam",
      "clams",
      "pen clam",
      "short neck clam",
      "blood clam",
      "sea clam",
      "mangrove clam",
      "nylon shell",
      "scallop",
      "razor clam",
      "aballone",
    ],
  },
  {
    name: "Mussel",
    keywords: ["mussel", "brown mussel", "green mussel", "half shell"],
  },
  // ── Crustacean ──
  {
    name: "Prawn",
    keywords: [
      "white prawn",
      "black tiger",
      "flowery prawn",
      "sea prawns",
      "shrimp",
      "vannamei",
      "pacific white",
    ],
  },
  {
    name: "Scampi",
    keywords: [
      "scampi",
      "freshwater prawn",
      "freshwater prawn (scampi) lsb with claw",
    ],
  },
  {
    name: "Crab",
    keywords: [
      "mud crab",
      "sea crab",
      "cut crab",
      "blue swimming crab",
      "lagoon crab",
    ],
  },
  { name: "Lobster", keywords: ["lobster"] },

  // ── Cephalopoda ──
  {
    name: "Cuttlefish & Squid",
    keywords: ["cuttlefish", "squid", "cuttlefish broken rings"],
  },
  { name: "Octopus", keywords: ["octopus", "baby octopus"] },
  // ── Fish ──
  {
    name: "Marine Fish",
    keywords: [
      "yellow fin tuna",
      "seer fish",
      "barramundi",
      "scad",
      "trevally",
      "indian mackerel",
      "tenched sardine",
      "anchovy",
      "jack trevally",
      "red mullet",
      "grey mullet",
      "tiger grouper",
      "red grouper",
      "red snapper",
      "mahi mahi",
      "salmon",
      "parrot fish",
      "tuna",
      "king fish",
      "sword fish",
      "barracuda",
      "bonito",
      "cobia",
      "thread fin",
      "sea bass",
      "rabbit fish",
      "sole fish",
      "emperor",
      "grouper",
      "pomfret",
      "marlin",
      "pinjalo",
      "job fish",
    ],
  },
  {
    name: "Fresh Water",
    keywords: ["eel", "catla", "rohu", "tilapia", "freshwater", "river"],
  },
  // ── Processed ──
  {
    name: "Processed Products",
    keywords: [
      "processed",
      "claw meat",
      "seafood mix",
      "half shell",
      "oyster can",
      "crab meat",
      "lump meat",
      "jambo",
      "glazing",
    ],
  },
];

const speciesTypes = [
  { value: "all", label: "All Products", icon: "🌊" },
  { value: "crustacean", label: "Crustacean", icon: "🦞" },
  { value: "fish", label: "Fish", icon: "🐟" },
];

const PRODUCT_ORDER = [
  // Oyster
  "depurated oyster",
  // Clams
  "short neck clam",
  "sea clam",
  "pen clam",
  "blood clam",
  "mangrove clam",
  "nylon shell",
  "scallop",
  "razor clam",
  "aballone",
  // Mussel
  "green mussel",
  "half shell green mussel",
  "half shell brown mussel",
  "brown mussel",
  // Prawn
  "white prawn",
  "black tiger frozen",
  "black tiger",
  "flowery prawn",
  "sea prawns",
  "vannamei",
  "pacific white",
  // Scampi
  "scampi headless",
  "scampi claw",
  "scampi",
  // Lobster
  "lobster",
  // Crab
  "mud crab",
  "sea crab fresh",
  "sea crab frozen",
  "sea crab",
  "cut crab",
  // Cuttlefish & Squid
  "cuttlefish fresh whole",
  "cuttlefish whole cleaned",
  "cuttlefish fresh corn",
  "cuttlefish cleaned corn",
  "squid fresh cleaned",
  "cuttlefish broken rings",
  "squid",
  // Octopus
  "baby octopus frozen",
  "baby octopus",
  "octopus frozen",
  "octopus",
  // Marine Fish
  "yellow fin tuna",
  "seer fish",
  "barramundi",
  "scad",
  "trevally",
  "indian mackerel",
  "tenched sardine",
  "anchovy",
  "jack trevally",
  "red mullet",
  "grey mullet",
  "tiger grouper",
  "red grouper",
  "red snapper",
  "mahi mahi",
  "salmon fish",
  "salmon fillet",
  "salmon tail",
  "salmon ground",
  "salmon",
  "parrot fish",
  "tuna shashimi loins",
  "tuna loin grade a",
  "tuna loin grade b",
  "tuna shashimi cut",
  "tuna off cut",
  "tuna trimming",
  "tuna belly",
  "tuna",
  // Fresh Water
  "eel",
  "catla",
  "rohu",
  "tilapia",
  // Processed
  "sea crab meat",
  "mud crab body",
  "mud crab claw meat",
  "mud crab lump",
  "mud crab jambo",
  "oyster meat",
  "oyster can",
  "seafood mix",
  "green mussel half shell",
  "claw meat",
  "clean prawns",
  "half shell mussel",
  "pen clam meat",
];

const getSortIndex = (name) => {
  const lower = (name || "").toLowerCase();
  const idx = PRODUCT_ORDER.findIndex((k) => lower.includes(k));
  return idx === -1 ? 9999 : idx;
};

const sectionIcon = {
  Oyster: "🦪",
  Clams: "🐚",
  Mussel: "🦪",
  Crab: "🦀",
  Prawn: "🦐",
  Lobster: "🦞",
  Scampi: "🦞",
  "Cuttlefish & Squid": "🦑",
  Octopus: "🐙",
  "Marine Fish": "🐟",
  "Fresh Water": "🐠",
  "Processed Products": "📦",
  Other: "📦",
};

const CATEGORY_OPTIONS = [
  { value: "live", label: "🟢 Live" },
  { value: "fresh", label: "💧 Fresh" },
  { value: "frozen", label: "❄️ Frozen" },
];

/* ══════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════ */
const Productlist = () => {
  const adminUser = isAdmin();
  const API_URL = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSpeciesType, setSelectedSpeciesType] = useState("all");

  /* ── Inline Report Edit & Customizer state ────────────────────── */
  const [editMode, setEditMode] = useState(false);
  const [workingItems, setWorkingItems] = useState([]);
  const [reportConfig, setReportConfig] = useState(() =>
    loadActiveReportLayout(),
  );
  const [savedDrafts, setSavedDrafts] = useState(() =>
    loadSavedReportDrafts(),
  );
  const [activeDraft, setActiveDraft] = useState(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftModalTab, setDraftModalTab] = useState("list");
  const [savingDb, setSavingDb] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [editSearch, setEditSearch] = useState("");

  /* ── "Add from Catalogue" modal state ─────────────────────────── */
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);
  const [catalogue, setCatalogue] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [selectedCatProduct, setSelectedCatProduct] = useState(null);
  const [pricingRows, setPricingRows] = useState([]);
  const [savingPricing, setSavingPricing] = useState(false);
  const [selectedPricingCategories, setSelectedPricingCategories] = useState([
    "fresh",
  ]);

  /* ── "Add to Customer" bulk modal state ───────────────────────── */
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [bulkCustomerId, setBulkCustomerId] = useState("");
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  /* ── Fetch local product list ─────────────────────────────────── */
  const fetchProducts = () => {
    setLoading(true);
    return fetch(`${API_URL}/api/local-product-prices/full-list`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data) => {
        const keyed = attachRowKeys(data);
        setItems(keyed);
        setLoading(false);
        return keyed;
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
        return null;
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []); // eslint-disable-line

  // Persist active layout when working on live list (not inside a temporary draft)
  useEffect(() => {
    if (!activeDraft) {
      saveActiveReportLayout(reportConfig);
    }
  }, [reportConfig, activeDraft]);

  /* ── Derived active dataset, exclusions, sorting & dirty summary ── */
  const sourceItems = useMemo(
    () => (editMode || activeDraft ? workingItems : items),
    [editMode, activeDraft, workingItems, items],
  );

  const excludedSet = useMemo(
    () => new Set(reportConfig.excludedKeys || []),
    [reportConfig.excludedKeys],
  );

  const orderedSourceItems = useMemo(
    () =>
      sortItemsByReportConfig(
        sourceItems,
        reportConfig.customOrder,
        getSortIndex,
        false,
      ),
    [sourceItems, reportConfig.customOrder],
  );

  const speciesFilteredItems = useMemo(() => {
    return orderedSourceItems.filter((p) => {
      if (
        selectedSpeciesType !== "all" &&
        p.species_type?.toLowerCase() !== selectedSpeciesType
      ) {
        return false;
      }
      if (editSearch.trim()) {
        const q = editSearch.toLowerCase().trim();
        const matchesName = p.common_name?.toLowerCase().includes(q);
        const matchesSci = p.scientific_name?.toLowerCase().includes(q);
        const matchesSize = (p.variants || []).some((v) =>
          v.size?.toLowerCase().includes(q),
        );
        if (!matchesName && !matchesSci && !matchesSize) return false;
      }
      return true;
    });
  }, [orderedSourceItems, selectedSpeciesType, editSearch]);

  // In view mode, excluded rows are hidden; in edit mode, all stay visible with Include checkboxes
  const displayedItems = useMemo(() => {
    if (editMode) return speciesFilteredItems;
    return speciesFilteredItems.filter((p) => !excludedSet.has(p._rowKey));
  }, [editMode, speciesFilteredItems, excludedSet]);

  // Exported PDFs always exclude unchecked rows (even while in editMode)
  const exportableItems = useMemo(
    () => speciesFilteredItems.filter((p) => !excludedSet.has(p._rowKey)),
    [speciesFilteredItems, excludedSet],
  );

  const excludedInCurrentFilterCount = useMemo(
    () => speciesFilteredItems.filter((p) => excludedSet.has(p._rowKey)).length,
    [speciesFilteredItems, excludedSet],
  );

  const includedTotalCount = useMemo(
    () => sourceItems.filter((p) => !excludedSet.has(p._rowKey)).length,
    [sourceItems, excludedSet],
  );

  const origByRowKey = useMemo(
    () => new Map(items.map((p) => [p._rowKey, p])),
    [items],
  );

  const dirtySummary = useMemo(() => {
    if (!editMode && !activeDraft) {
      return {
        masterProductIds: new Set(),
        localProductIds: new Set(),
        dirtyRowKeys: new Set(),
        modifiedProductCount: 0,
      };
    }
    return getDirtySummary(items, workingItems);
  }, [editMode, activeDraft, items, workingItems]);

  /* ── Edit mode transitions ────────────────────────────────────── */
  const handleEnterEditMode = () => {
    if (bulkMode) {
      setBulkMode(false);
      setSelectedProductIds(new Set());
    }
    if (!activeDraft) {
      setWorkingItems(cloneReportItems(items));
    }
    setSaveStatus(null);
    setEditMode(true);
  };

  const handleExitEditMode = () => {
    if (dirtySummary.modifiedProductCount > 0 && !activeDraft) {
      if (
        !window.confirm(
          `You have ${dirtySummary.modifiedProductCount} unsaved product change(s). Discard changes and exit Edit Mode?`,
        )
      ) {
        return;
      }
    }
    setEditMode(false);
    setSaveStatus(null);
    setEditSearch("");
    if (!activeDraft) {
      setWorkingItems([]);
    }
  };

  const handleDiscardAllEdits = () => {
    if (
      !window.confirm(
        "Revert all unsaved product and price edits back to the live database values?",
      )
    ) {
      return;
    }
    setWorkingItems(cloneReportItems(items));
    setSaveStatus({
      type: "warning",
      message: "Reverted edits back to live database values.",
    });
  };

  /* ── Inline field editing handlers ────────────────────────────── */
  const updateProductField = (rowKey, field, value) => {
    setWorkingItems((prev) => {
      const target = prev.find((p) => p._rowKey === rowKey);
      if (!target) return prev;
      const syncMaster =
        field === "common_name" || field === "scientific_name";
      return prev.map((p) => {
        if (p._rowKey === rowKey) {
          return { ...p, [field]: value };
        }
        if (syncMaster && String(p.id) === String(target.id)) {
          return { ...p, [field]: value };
        }
        return p;
      });
    });
  };

  const updateVariantField = (rowKey, variantKey, field, value) => {
    setWorkingItems((prev) => {
      const target = prev.find((p) => p._rowKey === rowKey);
      if (!target) return prev;
      const targetVar = (target.variants || []).find(
        (v) => v._vKey === variantKey,
      );
      const matchVarId = targetVar?.id;

      const applyVariantEdit = (v) => {
        const pp =
          field === "purchasing_price" ? sf(value) : sf(v.purchasing_price);

        if (field === "size" || field === "unit") {
          return { ...v, [field]: value };
        }
        if (field === "purchasing_price") {
          const calc = calcFromProfit(pp, sf(v.profit));
          return {
            ...v,
            purchasing_price: value,
            selling_price: calc.selling_price,
            profit_margin_percentage: calc.profit_margin_percentage,
          };
        }
        if (field === "profit") {
          const calc = calcFromProfit(pp, sf(value));
          return {
            ...v,
            profit: value,
            selling_price: calc.selling_price,
            profit_margin_percentage: calc.profit_margin_percentage,
          };
        }
        if (field === "selling_price") {
          const calc = calcFromSelling(pp, sf(value));
          return {
            ...v,
            selling_price: value,
            profit: calc.profit,
            profit_margin_percentage: calc.profit_margin_percentage,
          };
        }
        if (field === "profit_margin_percentage") {
          const calc = calcFromMarginPct(pp, sf(value));
          return {
            ...v,
            profit_margin_percentage: value,
            profit: calc.profit,
            selling_price: calc.selling_price,
          };
        }
        return { ...v, [field]: value };
      };

      return prev.map((p) => {
        if (p._rowKey === rowKey) {
          return {
            ...p,
            variants: (p.variants || []).map((v) =>
              v._vKey === variantKey ? applyVariantEdit(v) : v,
            ),
          };
        }
        // Keep shared variant values synced if duplicate product_id rows exist
        if (String(p.id) === String(target.id) && matchVarId != null) {
          return {
            ...p,
            variants: (p.variants || []).map((v) =>
              String(v.id) === String(matchVarId) ? applyVariantEdit(v) : v,
            ),
          };
        }
        return p;
      });
    });
  };

  const handleAddInlineVariant = (rowKey) => {
    setWorkingItems((prev) =>
      prev.map((p) => {
        if (p._rowKey !== rowKey) return p;
        const newVar = {
          _vKey: `v_new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          _isNew: true,
          id: null,
          size: "",
          unit: "kg",
          purchasing_price: 0,
          profit: 0,
          selling_price: 0,
          profit_margin_percentage: 0,
        };
        return {
          ...p,
          variants: [...(p.variants || []), newVar],
        };
      }),
    );
  };

  const handleRemoveInlineNewVariant = (rowKey, variantKey) => {
    setWorkingItems((prev) =>
      prev.map((p) => {
        if (p._rowKey !== rowKey) return p;
        return {
          ...p,
          variants: (p.variants || []).filter(
            (v) => !(v._vKey === variantKey && v._isNew),
          ),
        };
      }),
    );
  };

  const handleResetSingleProduct = (rowKey) => {
    const orig = origByRowKey.get(rowKey);
    if (!orig) return;
    setWorkingItems((prev) =>
      prev.map((p) => (p._rowKey === rowKey ? cloneReportItems([orig])[0] : p)),
    );
  };

  /* ── Layout: include/exclude & reorder handlers ───────────────── */
  const toggleIncludeProduct = (rowKey) => {
    setReportConfig((prev) => {
      const next = new Set(prev.excludedKeys || []);
      next.has(rowKey) ? next.delete(rowKey) : next.add(rowKey);
      return { ...prev, excludedKeys: [...next] };
    });
  };

  const handleIncludeAll = () => {
    const visibleKeys = new Set(speciesFilteredItems.map((p) => p._rowKey));
    setReportConfig((prev) => ({
      ...prev,
      excludedKeys: (prev.excludedKeys || []).filter((k) => !visibleKeys.has(k)),
    }));
  };

  const handleExcludeAll = () => {
    const visibleKeys = speciesFilteredItems.map((p) => p._rowKey);
    setReportConfig((prev) => ({
      ...prev,
      excludedKeys: [...new Set([...(prev.excludedKeys || []), ...visibleKeys])],
    }));
  };

  const handleMoveProduct = (rowKey, direction, siblingKeys) => {
    const pos = siblingKeys.indexOf(rowKey);
    const targetPos = direction === "up" ? pos - 1 : pos + 1;
    if (pos === -1 || targetPos < 0 || targetPos >= siblingKeys.length) return;
    const swapKey = siblingKeys[targetPos];

    setReportConfig((prev) => {
      const baseKeys =
        prev.customOrder && prev.customOrder.length > 0
          ? [...prev.customOrder]
          : orderedSourceItems.map((p) => p._rowKey);

      // Ensure all current items exist in baseKeys
      orderedSourceItems.forEach((p) => {
        if (!baseKeys.includes(p._rowKey)) baseKeys.push(p._rowKey);
      });

      const iA = baseKeys.indexOf(rowKey);
      const iB = baseKeys.indexOf(swapKey);
      if (iA === -1 || iB === -1) return prev;
      [baseKeys[iA], baseKeys[iB]] = [baseKeys[iB], baseKeys[iA]];
      return { ...prev, customOrder: baseKeys };
    });
  };

  const handleSortDefaultOrder = () => {
    const sortedKeys = [...sourceItems]
      .sort((a, b) => getSortIndex(a.common_name) - getSortIndex(b.common_name))
      .map((p) => p._rowKey);
    setReportConfig((prev) => ({ ...prev, customOrder: sortedKeys }));
  };

  const handleResetLayout = () => {
    if (
      !window.confirm(
        "Reset report title, notes, visible columns, product order, and hidden items back to defaults?",
      )
    ) {
      return;
    }
    setReportConfig(getDefaultReportConfig());
  };

  /* ── Save edits to Backend Database ───────────────────────────── */
  const handleSaveToDatabase = async (targetRowKey = null) => {
    const sourceList = editMode || activeDraft ? workingItems : items;
    const summary = getDirtySummary(items, sourceList);

    let productIdsToSave = [
      ...new Set([...summary.masterProductIds, ...summary.localProductIds]),
    ];

    if (targetRowKey) {
      const targetRow = sourceList.find((p) => p._rowKey === targetRowKey);
      if (!targetRow) return;
      productIdsToSave = productIdsToSave.filter(
        (id) => String(id) === String(targetRow.id),
      );
    }

    if (productIdsToSave.length === 0) {
      setSaveStatus({
        type: "warning",
        message: "No product or price changes to save to the database.",
      });
      return;
    }

    // Validate before sending
    for (const pid of productIdsToSave) {
      const prod = sourceList.find((p) => String(p.id) === String(pid));
      if (!prod) continue;
      if (!prod.common_name || !prod.common_name.trim()) {
        setSaveStatus({
          type: "error",
          message: "Common Name cannot be empty.",
        });
        return;
      }
      const emptySizeVar = (prod.variants || []).find(
        (v) => !v.size || !v.size.trim(),
      );
      if (emptySizeVar) {
        setSaveStatus({
          type: "error",
          message: `Please enter a Size name for every variant in "${prod.common_name}".`,
        });
        return;
      }
    }

    setSavingDb(true);
    setSaveStatus(null);

    const succeededIds = new Set();
    const failures = [];

    for (const pid of productIdsToSave) {
      const rowsForProduct = sourceList.filter(
        (p) => String(p.id) === String(pid),
      );
      const primary = rowsForProduct[0];
      if (!primary) continue;

      const orig =
        origByRowKey.get(primary._rowKey) ||
        items.find((o) => String(o.id) === String(pid));

      const needsMaster = isProductMasterDirty(orig, primary);
      const needsLocal =
        rowsForProduct.some((r) => {
          const rOrig =
            origByRowKey.get(r._rowKey) ||
            items.find((o) => String(o.id) === String(pid));
          return isProductLocalDirty(rOrig, r);
        }) || needsMaster;

      try {
        let resolvedVariants = (primary.variants || []).map((v) => ({
          ...v,
          resolvedId: v.id,
        }));

        if (needsMaster) {
          // 1. Fetch latest master product so description/species_type/image/extra variants aren't wiped
          const masterRes = await fetch(`${API_URL}/api/productlist/${pid}`);
          if (!masterRes.ok) {
            throw new Error("Could not load master product record");
          }
          const masterData = await masterRes.json();

          const editedExistingMap = new Map(
            resolvedVariants
              .filter((v) => !v._isNew && v.id != null)
              .map((v) => [String(v.id), v]),
          );

          const mergedMasterVariants = (masterData.variants || []).map((mv) => {
            const ed = editedExistingMap.get(String(mv.id));
            if (!ed) {
              return {
                id: mv.id,
                size: mv.size || "",
                unit: mv.unit || "kg",
                purchasing_price: sf(mv.purchasing_price),
              };
            }
            return {
              id: mv.id,
              size: ed.size.trim(),
              unit: ed.unit || mv.unit || "kg",
              purchasing_price: sf(ed.purchasing_price),
            };
          });

          const newVariants = resolvedVariants.filter((v) => v._isNew);
          newVariants.forEach((nv, idx) => {
            mergedMasterVariants.push({
              id: Date.now() + idx,
              size: nv.size.trim(),
              unit: nv.unit || "kg",
              purchasing_price: sf(nv.purchasing_price),
            });
          });

          const fd = new FormData();
          fd.append("common_name", primary.common_name.trim());
          fd.append("scientific_name", (primary.scientific_name || "").trim());
          fd.append(
            "description",
            masterData.description ?? primary.description ?? "",
          );
          fd.append(
            "species_type",
            masterData.species_type ?? primary.species_type ?? "fish",
          );
          const imgUrl = masterData.image_url || primary.image_url;
          if (imgUrl) fd.append("existing_image_url", imgUrl);
          fd.append("variants", JSON.stringify(mergedMasterVariants));

          const putMasterRes = await fetch(
            `${API_URL}/api/productlist/upload/${pid}`,
            { method: "PUT", body: fd },
          );
          if (!putMasterRes.ok) {
            const errBody = await putMasterRes.json().catch(() => ({}));
            throw new Error(errBody.error || "Failed to update master product");
          }

          // Re-fetch master if new variants were added to resolve real DB variant IDs
          if (newVariants.length > 0) {
            const refreshedMasterRes = await fetch(
              `${API_URL}/api/productlist/${pid}`,
            );
            if (refreshedMasterRes.ok) {
              const refreshedMaster = await refreshedMasterRes.json();
              const usedIds = new Set(
                resolvedVariants
                  .filter((v) => !v._isNew && v.id != null)
                  .map((v) => String(v.id)),
              );
              resolvedVariants = resolvedVariants.map((rv) => {
                if (!rv._isNew && rv.id != null) return rv;
                const matched = (refreshedMaster.variants || []).find(
                  (mv) =>
                    !usedIds.has(String(mv.id)) &&
                    (mv.size || "").trim() === (rv.size || "").trim() &&
                    (mv.unit || "kg") === (rv.unit || "kg"),
                );
                if (matched) {
                  usedIds.add(String(matched.id));
                  return { ...rv, resolvedId: matched.id };
                }
                return rv;
              });
            }
          }
        }

        if (needsLocal) {
          const rowCategories = rowsForProduct
            .map((r) => (r.category || "").toLowerCase())
            .filter(Boolean);
          let categoriesPayload = [...new Set(rowCategories)];
          if (
            rowsForProduct.length === 1 &&
            Array.isArray(primary.categories) &&
            primary.categories.length > 1
          ) {
            const oldCat = (primary._origCategory || "").toLowerCase();
            const newCat = (primary.category || "").toLowerCase();
            categoriesPayload = [
              ...new Set(
                primary.categories.map((c) =>
                  c.toLowerCase() === oldCat ? newCat : c.toLowerCase(),
                ),
              ),
            ].filter(Boolean);
          }
          if (categoriesPayload.length === 0) categoriesPayload = ["fresh"];

          const validLocalVariants = resolvedVariants.filter(
            (v) => v.resolvedId != null,
          );

          if (validLocalVariants.length > 0) {
            const bulkRes = await fetch(
              `${API_URL}/api/local-product-prices/bulk`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  product_id: Number(pid) || pid,
                  categories: categoriesPayload,
                  variants: validLocalVariants.map((v) => ({
                    variant_id: v.resolvedId,
                    profit: sf(v.profit),
                    selling_price: sf(v.selling_price),
                    profit_margin_percentage: sf(v.profit_margin_percentage),
                  })),
                }),
              },
            );
            if (!bulkRes.ok) {
              const errBody = await bulkRes.json().catch(() => ({}));
              throw new Error(errBody.error || "Failed to update local pricing");
            }
          }
        }

        succeededIds.add(String(pid));
      } catch (err) {
        failures.push({
          name: primary.common_name || `Product #${pid}`,
          message: err.message,
        });
      }
    }

    // Re-fetch authoritative DB list
    const freshList = await fetchProducts();
    if (freshList && (editMode || activeDraft)) {
      const freshById = new Map();
      freshList.forEach((p) => {
        const key = String(p.id);
        if (!freshById.has(key)) freshById.set(key, []);
        freshById.get(key).push(p);
      });

      setWorkingItems((prev) => {
        if (!targetRowKey && failures.length === 0) {
          return cloneReportItems(freshList);
        }
        return prev.map((p) => {
          if (!succeededIds.has(String(p.id))) return p;
          const freshMatches = freshById.get(String(p.id)) || [];
          const match =
            freshMatches.find((f) => f._rowKey === p._rowKey) || freshMatches[0];
          return match ? cloneReportItems([match])[0] : p;
        });
      });
    }

    if (failures.length === 0) {
      setSaveStatus({
        type: "success",
        message: `✅ Saved ${succeededIds.size} product${succeededIds.size !== 1 ? "s" : ""} to the database.`,
      });
    } else {
      const failText = failures
        .map((f) => `${f.name} (${f.message})`)
        .join("; ");
      setSaveStatus({
        type: "error",
        message: `Saved ${succeededIds.size}, failed ${failures.length}: ${failText}`,
      });
    }

    setSavingDb(false);
  };

  /* ── Saved Report Drafts handlers ─────────────────────────────── */
  const openDraftModal = (tab = "list") => {
    setDraftModalTab(tab);
    setDraftModalOpen(true);
  };

  const handleSaveDraft = ({ name, overwriteId }) => {
    const snapshotItems = cloneReportItems(
      editMode || activeDraft ? workingItems : items,
    );
    const nowIso = new Date().toISOString();
    const draftObj = {
      id: overwriteId || `draft_${Date.now()}`,
      name,
      savedAt: nowIso,
      speciesFilter: selectedSpeciesType,
      config: {
        ...reportConfig,
        visibleColumns: { ...(reportConfig.visibleColumns || DEFAULT_VISIBLE_COLUMNS) },
        excludedKeys: [...(reportConfig.excludedKeys || [])],
        customOrder: [...(reportConfig.customOrder || [])],
      },
      items: snapshotItems,
    };

    const nextDrafts = overwriteId
      ? savedDrafts.map((d) => (d.id === overwriteId ? draftObj : d))
      : [draftObj, ...savedDrafts];

    persistSavedReportDrafts(nextDrafts);
    setSavedDrafts(nextDrafts);
    setActiveDraft(draftObj);
    setWorkingItems(cloneReportItems(snapshotItems));
    setDraftModalOpen(false);
    setSaveStatus({
      type: "success",
      message: `📌 Report draft "${name}" saved.`,
    });
  };

  const handleLoadDraft = (draft, openInEdit = false) => {
    const keyedDraftItems = attachRowKeys(draft.items || []);
    setActiveDraft(draft);
    setWorkingItems(cloneReportItems(keyedDraftItems));
    setReportConfig({
      ...getDefaultReportConfig(),
      ...(draft.config || {}),
      visibleColumns: {
        ...DEFAULT_VISIBLE_COLUMNS,
        ...(draft.config?.visibleColumns || {}),
      },
    });
    if (draft.speciesFilter) setSelectedSpeciesType(draft.speciesFilter);
    setEditMode(openInEdit);
    setDraftModalOpen(false);
    setSaveStatus({
      type: "success",
      message: `📂 Loaded report draft "${draft.name}".`,
    });
  };

  const handleDeleteDraft = (draftId, draftName) => {
    if (!window.confirm(`Delete saved report draft "${draftName}"?`)) return;
    const next = savedDrafts.filter((d) => d.id !== draftId);
    persistSavedReportDrafts(next);
    setSavedDrafts(next);
    if (activeDraft?.id === draftId) {
      setActiveDraft(null);
      setEditMode(false);
      setWorkingItems([]);
      setReportConfig(loadActiveReportLayout());
    }
  };

  const handleReturnToLiveList = () => {
    setActiveDraft(null);
    setEditMode(false);
    setWorkingItems([]);
    setSaveStatus(null);
    setReportConfig(loadActiveReportLayout());
  };

  const handleExportDraftPDF = async (draft) => {
    try {
      const draftItems = attachRowKeys(draft.items || []);
      const excl = new Set(draft.config?.excludedKeys || []);
      const visibleProducts = sortItemsByReportConfig(
        draftItems.filter((p) => !excl.has(p._rowKey)),
        draft.config?.customOrder || [],
        getSortIndex,
        false,
      );
      await generateLocalReportPDF({
        mode: "custom",
        products: visibleProducts,
        reportConfig: draft.config || getDefaultReportConfig(),
        API_URL,
        getSortIndex,
      });
    } catch (err) {
      console.error(err);
      alert("Error generating draft PDF.");
    }
  };

  /* ── Catalogue modal ─────────────────────────────────────────── */
  const openCatalogueModal = async () => {
    setShowCatalogueModal(true);
    setSelectedCatProduct(null);
    setPricingRows([]);
    setCatalogueSearch("");
    setCatalogueLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/productlist`);
      const data = await res.json();
      setCatalogue(data);
    } catch {
      setCatalogue([]);
    } finally {
      setCatalogueLoading(false);
    }
  };

  const selectCatalogueProduct = (product) => {
    setSelectedCatProduct(product);
    const existing = items.find((p) => p.id === product.id);
    const existingCats = existing
      ? existing.categories || (existing.category ? [existing.category] : [])
      : product.categories ||
        (product.category ? [product.category] : ["fresh"]);
    setSelectedPricingCategories(existingCats);

    const rows = (product.variants || []).map((v) => {
      const ex = existing?.variants?.find(
        (ev) => String(ev.id) === String(v.id),
      );
      const pp = sf(v.purchasing_price);
      return {
        variant_id: v.id,
        size: v.size,
        unit: v.unit,
        purchasing_price: pp,
        profit: ex ? sf(ex.profit) : 0,
        selling_price: ex ? sf(ex.selling_price) : pp,
        profit_margin_percentage: ex ? sf(ex.profit_margin_percentage) : 0,
        local_price_id: ex?.local_price_id || null,
      };
    });
    setPricingRows(rows);
  };

  const updatePricingRow = (idx, field, val) => {
    setPricingRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const pp = sf(row.purchasing_price);
        const v = sf(val);
        if (field === "profit")
          return { ...row, ...calcFromProfit(pp, v), profit: v };
        if (field === "selling_price")
          return { ...row, ...calcFromSelling(pp, v), selling_price: v };
        if (field === "profit_margin_percentage")
          return {
            ...row,
            ...calcFromMarginPct(pp, v),
            profit_margin_percentage: v,
          };
        return { ...row, [field]: val };
      }),
    );
  };

  const applyProfitToAll = (profit) => {
    setPricingRows((prev) =>
      prev.map((row) => ({
        ...row,
        ...calcFromProfit(sf(row.purchasing_price), sf(profit)),
      })),
    );
  };

  const savePricing = async () => {
    if (!selectedCatProduct) return;
    setSavingPricing(true);
    try {
      const res = await fetch(`${API_URL}/api/local-product-prices/bulk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedCatProduct.id,
          categories: selectedPricingCategories,
          variants: pricingRows.map((r) => ({
            variant_id: r.variant_id,
            profit: sf(r.profit),
            selling_price: sf(r.selling_price),
            profit_margin_percentage: sf(r.profit_margin_percentage),
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      alert(`✅ Pricing saved for ${selectedCatProduct.common_name}`);
      setShowCatalogueModal(false);
      const fresh = await fetchProducts();
      if (fresh && editMode) setWorkingItems(cloneReportItems(fresh));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSavingPricing(false);
    }
  };

  /* ── Remove from local list ───────────────────────────────────── */
  const handleRemoveFromLocal = async (productId, productName) => {
    if (
      !window.confirm(
        `Remove "${productName}" from the local list? This will delete its local pricing only — the product stays in the master catalogue.`,
      )
    )
      return;
    try {
      const res = await fetch(
        `${API_URL}/api/local-product-prices/product/${productId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to remove");
      fetchProducts();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  /* ── Bulk-add to customer ─────────────────────────────────────── */
  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/customerlist`);
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleBulkMode = () => {
    setBulkMode((p) => !p);
    setSelectedProductIds(new Set());
  };
  const toggleProductSelection = (id) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openBulkModal = async () => {
    if (selectedProductIds.size === 0) {
      alert("Please select at least one product.");
      return;
    }
    await fetchCustomers();
    const rows = [];
    displayedItems.forEach((product) => {
      if (!selectedProductIds.has(product.id)) return;
      (product.variants || []).forEach((v) => {
        rows.push({
          key: `${product.id}-${v.id}`,
          product_id: product.id,
          variant_id: v.id,
          common_name: product.common_name,
          scientific_name: product.scientific_name || "",
          category: product.category,
          image_url: product.image_url || "",
          size_range: v.size || "",
          purchasing_price: sf(v.purchasing_price),
          margin: sf(v.profit),
          margin_percentage: sf(v.profit_margin_percentage),
          selling_price: sf(v.selling_price),
        });
      });
    });
    setBulkItems(rows);
    setBulkCustomerId("");
    setShowBulkModal(true);
  };

  const updateBulkItem = (key, field, value) => {
    setBulkItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const updated = { ...item, [field]: value };
        const pp = sf(updated.purchasing_price);
        if (field === "margin") {
          const sp = pp + sf(value);
          updated.selling_price = parseFloat(sp.toFixed(2));
          updated.margin_percentage =
            sp > 0 ? parseFloat(((sf(value) / sp) * 100).toFixed(2)) : 0;
        } else if (field === "margin_percentage") {
          const m = (pp * sf(value)) / (100 - sf(value));
          updated.margin = parseFloat(m.toFixed(2));
          updated.selling_price = parseFloat((pp + m).toFixed(2));
        } else if (field === "selling_price") {
          const m = sf(value) - pp;
          updated.margin = parseFloat(m.toFixed(2));
          updated.margin_percentage =
            sf(value) > 0 ? parseFloat(((m / sf(value)) * 100).toFixed(2)) : 0;
        }
        return updated;
      }),
    );
  };

  const handleBulkSubmit = async () => {
    if (!bulkCustomerId) {
      alert("Please select a customer.");
      return;
    }
    setBulkSubmitting(true);
    let success = 0,
      skip = 0,
      fail = 0;
    try {
      const existingRes = await fetch(
        `${API_URL}/api/customer-products/${bulkCustomerId}`,
      );
      const existingData = existingRes.ok ? await existingRes.json() : [];
      const existingKeys = new Set(
        existingData.map((e) => `${e.product_id}-${e.variant_id ?? "null"}`),
      );

      for (const item of bulkItems) {
        const dupKey = `${item.product_id}-${item.variant_id ?? "null"}`;
        if (existingKeys.has(dupKey)) {
          skip++;
          continue;
        }
        const res = await fetch(`${API_URL}/api/customer-products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cus_id: parseInt(bulkCustomerId),
            product_id: item.product_id,
            variant_id: item.variant_id ?? null,
            common_name: item.common_name,
            scientific_name: item.scientific_name || null,
            category: item.category,
            image_url: item.image_url || null,
            size_range: item.size_range,
            purchasing_price: item.purchasing_price,
            margin: item.margin,
            margin_percentage: item.margin_percentage,
            selling_price: item.selling_price,
          }),
        });
        res.ok ? success++ : fail++;
      }
      let msg = `✅ Added ${success} item(s).`;
      if (skip) msg += `\n⚠️ ${skip} skipped (already exist).`;
      if (fail) msg += `\n❌ ${fail} failed.`;
      alert(msg);
      setShowBulkModal(false);
      setBulkMode(false);
      setSelectedProductIds(new Set());
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  /* ── Grouping ─────────────────────────────────────────────────── */
  const getSection = (product) => {
    const nameSource = editMode
      ? product._origCommonName || product.common_name
      : product.common_name;
    const name = nameSource?.toLowerCase() || "";
    for (const s of sectionCategories) {
      if (s.keywords.some((k) => name.includes(k))) return s.name;
    }
    return "Other";
  };

  const groupedBySection = useMemo(() => {
    const grouped = {};
    sectionCategories.forEach((s) => {
      grouped[s.name] = {};
    });
    grouped["Other"] = {};
    displayedItems.forEach((product) => {
      const section = getSection(product);
      const key = editMode
        ? product._rowKey
        : `${product.common_name}||${product.category || ""}`;
      if (!grouped[section][key]) grouped[section][key] = [];
      grouped[section][key].push(product);
    });
    return grouped;
  }, [displayedItems, editMode]); // eslint-disable-line

  const sectionHasProducts = (section) =>
    Object.keys(groupedBySection[section] || {}).length > 0;

  const getTotalRows = (products) =>
    products.reduce(
      (sum, p) => sum + Math.max((p.variants || []).length, 1),
      0,
    );

  const getImageUrl = (url) => {
    if (!url) return "/images/placeholder-seafood.png";
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const getSpeciesCount = (val) =>
    val === "all"
      ? sourceItems.length
      : sourceItems.filter((p) => p.species_type?.toLowerCase() === val).length;

  /* ── Catalogue filter ─────────────────────────────────────────── */
  const filteredCatalogue = catalogue.filter((p) => {
    if (!catalogueSearch) return true;
    const q = catalogueSearch.toLowerCase();
    return (
      p.common_name?.toLowerCase().includes(q) ||
      p.scientific_name?.toLowerCase().includes(q)
    );
  });

  /* ── PDF exports (Full PDF, Price List, Custom Edited Report) ─── */
  const handleDownloadPDF = async () => {
    try {
      await generateLocalReportPDF({
        mode: "full",
        products: exportableItems,
        reportConfig,
        API_URL,
        getSortIndex,
      });
    } catch (err) {
      console.error(err);
      alert("Error generating PDF.");
    }
  };

  const handleDownloadPriceListPDF = async () => {
    try {
      await generateLocalReportPDF({
        mode: "pricelist",
        products: exportableItems,
        reportConfig,
        API_URL,
        getSortIndex,
      });
    } catch (err) {
      console.error(err);
      alert("Error generating price list PDF.");
    }
  };

  const handleDownloadCustomReportPDF = async () => {
    try {
      await generateLocalReportPDF({
        mode: "custom",
        products: exportableItems,
        reportConfig,
        API_URL,
        getSortIndex,
      });
    } catch (err) {
      console.error(err);
      alert("Error generating custom report PDF.");
    }
  };

  /* ── Visible columns computation ──────────────────────────────── */
  const vis = reportConfig.visibleColumns || DEFAULT_VISIBLE_COLUMNS;
  const totalColCount =
    (bulkMode && !editMode ? 1 : 0) +
    (editMode ? 1 : 0) +
    (vis.picture ? 1 : 0) +
    (vis.common_name ? 1 : 0) +
    (vis.scientific_name ? 1 : 0) +
    (vis.type ? 1 : 0) +
    (vis.size ? 1 : 0) +
    (vis.purchasing_price ? 1 : 0) +
    (vis.profit ? 1 : 0) +
    (vis.margin_pct ? 1 : 0) +
    (vis.selling_price ? 1 : 0) +
    1; // Actions column

  /* ── Product group row renderer (reused for grouped & flat views) ── */
  const renderProductGroup = (products, siblingRowKeys) => {
    const firstProduct = products[0];
    const commonName = firstProduct?.common_name || "";
    const groupRowSpan = getTotalRows(products);
    const imgSrc = getImageUrl(firstProduct.image_url);
    const isSelected = selectedProductIds.has(firstProduct.id);
    const isExcluded = excludedSet.has(firstProduct._rowKey);
    const origProd = origByRowKey.get(firstProduct._rowKey);
    const rowModified =
      (editMode || activeDraft) && origProd
        ? isRowDirty(origProd, firstProduct)
        : false;
    const siblingIdx = siblingRowKeys.indexOf(firstProduct._rowKey);

    let isFirstOfGroup = true;

    return products.map((product) => {
      const variants = product.variants || [];
      const catOptions =
        product.category &&
        !CATEGORY_OPTIONS.some(
          (o) => o.value === product.category.toLowerCase(),
        )
          ? [
              ...CATEGORY_OPTIONS,
              { value: product.category, label: fmt(product.category) },
            ]
          : CATEGORY_OPTIONS;

      if (variants.length > 0) {
        return variants.map((variant, vi) => {
          const isVeryFirst = isFirstOfGroup && vi === 0;
          const isFirstOfProd = vi === 0;
          if (isVeryFirst) isFirstOfGroup = false;

          const rowClasses = [
            isVeryFirst ? "product-group-start" : "",
            isExcluded && editMode ? "lp-row-excluded" : "",
            rowModified ? "lp-row-modified" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <tr
              key={`${product._rowKey}-${variant._vKey || vi}`}
              className={rowClasses}
            >
              {bulkMode && !editMode && isVeryFirst && (
                <td
                  rowSpan={groupRowSpan}
                  style={{ textAlign: "center", verticalAlign: "middle" }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleProductSelection(firstProduct.id)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                </td>
              )}

              {editMode && isVeryFirst && (
                <td rowSpan={groupRowSpan} className="lp-report-ctrl-cell">
                  <div className="lp-report-ctrl-wrap">
                    <label className="lp-include-toggle" title="Include in report">
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => toggleIncludeProduct(product._rowKey)}
                      />
                      <span>{isExcluded ? "Off" : "On"}</span>
                    </label>
                    <div className="lp-reorder-btns">
                      <button
                        type="button"
                        className="lp-order-btn"
                        disabled={siblingIdx <= 0}
                        onClick={() =>
                          handleMoveProduct(
                            product._rowKey,
                            "up",
                            siblingRowKeys,
                          )
                        }
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="lp-order-btn"
                        disabled={siblingIdx === -1 || siblingIdx >= siblingRowKeys.length - 1}
                        onClick={() =>
                          handleMoveProduct(
                            product._rowKey,
                            "down",
                            siblingRowKeys,
                          )
                        }
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </td>
              )}

              {isVeryFirst && vis.picture && (
                <td className="thumb-cell" rowSpan={groupRowSpan}>
                  <img src={imgSrc} alt={commonName} className="thumb" />
                </td>
              )}

              {isVeryFirst && vis.common_name && (
                <td rowSpan={groupRowSpan} style={{ fontWeight: 600 }}>
                  {editMode ? (
                    <input
                      type="text"
                      className="lp-inline-input lp-inline-text"
                      value={product.common_name || ""}
                      onChange={(e) =>
                        updateProductField(
                          product._rowKey,
                          "common_name",
                          e.target.value,
                        )
                      }
                      placeholder="Common name"
                    />
                  ) : (
                    commonName
                  )}
                </td>
              )}

              {isVeryFirst && vis.scientific_name && (
                <td className="scientific" rowSpan={groupRowSpan}>
                  {editMode ? (
                    <input
                      type="text"
                      className="lp-inline-input lp-inline-text lp-inline-italic"
                      value={product.scientific_name || ""}
                      onChange={(e) =>
                        updateProductField(
                          product._rowKey,
                          "scientific_name",
                          e.target.value,
                        )
                      }
                      placeholder="Scientific name"
                    />
                  ) : (
                    firstProduct.scientific_name || "—"
                  )}
                </td>
              )}

              {isFirstOfProd && vis.type && (
                <td rowSpan={variants.length}>
                  {editMode ? (
                    <select
                      className="lp-inline-select"
                      value={(product.category || "fresh").toLowerCase()}
                      onChange={(e) =>
                        updateProductField(
                          product._rowKey,
                          "category",
                          e.target.value,
                        )
                      }
                    >
                      {catOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`category-badge ${getCategoryBadgeClass(product.category)}`}
                    >
                      {getCategoryBadgeIcon(product.category)}{" "}
                      {fmt(product.category)}
                    </span>
                  )}
                </td>
              )}

              {vis.size && (
                <td>
                  {editMode ? (
                    <div className="lp-size-edit-wrap">
                      <input
                        type="text"
                        className="lp-inline-input lp-inline-size"
                        value={variant.size || ""}
                        onChange={(e) =>
                          updateVariantField(
                            product._rowKey,
                            variant._vKey,
                            "size",
                            e.target.value,
                          )
                        }
                        placeholder="Size / range"
                      />
                      <select
                        className="lp-inline-unit"
                        value={variant.unit || "kg"}
                        onChange={(e) =>
                          updateVariantField(
                            product._rowKey,
                            variant._vKey,
                            "unit",
                            e.target.value,
                          )
                        }
                      >
                        {["kg", "g", "pcs", "box", "tray"].map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      {variant._isNew && (
                        <button
                          type="button"
                          className="lp-var-remove-btn"
                          onClick={() =>
                            handleRemoveInlineNewVariant(
                              product._rowKey,
                              variant._vKey,
                            )
                          }
                          title="Remove unsaved size"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ) : (
                    variant.size || "—"
                  )}
                </td>
              )}

              {vis.purchasing_price && (
                <td className="price-cell">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="lp-inline-input lp-inline-num"
                      value={variant.purchasing_price ?? ""}
                      onChange={(e) =>
                        updateVariantField(
                          product._rowKey,
                          variant._vKey,
                          "purchasing_price",
                          e.target.value,
                        )
                      }
                    />
                  ) : (
                    <>Rs.&nbsp;{sf(variant.purchasing_price).toFixed(2)}</>
                  )}
                </td>
              )}

              {vis.profit && (
                <td className="price-cell">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="lp-inline-input lp-inline-num"
                      value={variant.profit ?? ""}
                      onChange={(e) =>
                        updateVariantField(
                          product._rowKey,
                          variant._vKey,
                          "profit",
                          e.target.value,
                        )
                      }
                    />
                  ) : (
                    <>Rs.&nbsp;{sf(variant.profit).toFixed(2)}</>
                  )}
                </td>
              )}

              {vis.margin_pct && (
                <td className="price-cell">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="lp-inline-input lp-inline-num lp-inline-pct"
                      value={variant.profit_margin_percentage ?? ""}
                      onChange={(e) =>
                        updateVariantField(
                          product._rowKey,
                          variant._vKey,
                          "profit_margin_percentage",
                          e.target.value,
                        )
                      }
                    />
                  ) : (
                    <>{sf(variant.profit_margin_percentage).toFixed(1)}%</>
                  )}
                </td>
              )}

              {vis.selling_price && (
                <td className="price-cell">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="lp-inline-input lp-inline-num lp-inline-selling"
                      value={variant.selling_price ?? ""}
                      onChange={(e) =>
                        updateVariantField(
                          product._rowKey,
                          variant._vKey,
                          "selling_price",
                          e.target.value,
                        )
                      }
                    />
                  ) : (
                    <>Rs.&nbsp;{sf(variant.selling_price).toFixed(2)}</>
                  )}
                </td>
              )}

              {isFirstOfProd && (
                <td className="actions-cell" rowSpan={variants.length}>
                  {editMode ? (
                    <div className="actions-wrapper lp-edit-actions-wrapper">
                      <button
                        type="button"
                        className="lp-row-btn lp-row-btn-add"
                        onClick={() => handleAddInlineVariant(product._rowKey)}
                        title="Add a new size row"
                      >
                        + Size
                      </button>
                      {rowModified && (
                        <>
                          <button
                            type="button"
                            className="lp-row-btn lp-row-btn-save"
                            onClick={() => handleSaveToDatabase(product._rowKey)}
                            disabled={savingDb}
                            title="Save this product's edits to DB"
                          >
                            💾 Save
                          </button>
                          <button
                            type="button"
                            className="lp-row-btn lp-row-btn-undo"
                            onClick={() =>
                              handleResetSingleProduct(product._rowKey)
                            }
                            disabled={savingDb}
                            title="Undo changes on this product"
                          >
                            ↺ Undo
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="actions-wrapper">
                      <button
                        className="btn-view"
                        onClick={() => navigate(`/productdetail/${product.id}`)}
                      >
                        View
                      </button>
                      {adminUser && (
                        <button
                          className="btn-edit"
                          onClick={() => {
                            setShowCatalogueModal(true);
                            setCatalogueLoading(false);
                            setCatalogue([product]);
                            selectCatalogueProduct(product);
                          }}
                        >
                          Price
                        </button>
                      )}
                      {adminUser && (
                        <button
                          className="btn-delete"
                          onClick={() =>
                            handleRemoveFromLocal(
                              product.id,
                              product.common_name,
                            )
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </td>
              )}
            </tr>
          );
        });
      }

      // No variants row
      const isVeryFirst = isFirstOfGroup;
      if (isVeryFirst) isFirstOfGroup = false;
      const rowClasses = [
        isVeryFirst ? "product-group-start" : "",
        isExcluded && editMode ? "lp-row-excluded" : "",
        rowModified ? "lp-row-modified" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <tr key={product._rowKey || product.id} className={rowClasses}>
          {bulkMode && !editMode && isVeryFirst && (
            <td
              rowSpan={groupRowSpan}
              style={{ textAlign: "center", verticalAlign: "middle" }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleProductSelection(firstProduct.id)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
            </td>
          )}

          {editMode && isVeryFirst && (
            <td rowSpan={groupRowSpan} className="lp-report-ctrl-cell">
              <div className="lp-report-ctrl-wrap">
                <label className="lp-include-toggle" title="Include in report">
                  <input
                    type="checkbox"
                    checked={!isExcluded}
                    onChange={() => toggleIncludeProduct(product._rowKey)}
                  />
                  <span>{isExcluded ? "Off" : "On"}</span>
                </label>
                <div className="lp-reorder-btns">
                  <button
                    type="button"
                    className="lp-order-btn"
                    disabled={siblingIdx <= 0}
                    onClick={() =>
                      handleMoveProduct(product._rowKey, "up", siblingRowKeys)
                    }
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="lp-order-btn"
                    disabled={siblingIdx === -1 || siblingIdx >= siblingRowKeys.length - 1}
                    onClick={() =>
                      handleMoveProduct(product._rowKey, "down", siblingRowKeys)
                    }
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </td>
          )}

          {isVeryFirst && vis.picture && (
            <td className="thumb-cell" rowSpan={groupRowSpan}>
              <img src={imgSrc} alt={commonName} className="thumb" />
            </td>
          )}

          {isVeryFirst && vis.common_name && (
            <td rowSpan={groupRowSpan} style={{ fontWeight: 600 }}>
              {editMode ? (
                <input
                  type="text"
                  className="lp-inline-input lp-inline-text"
                  value={product.common_name || ""}
                  onChange={(e) =>
                    updateProductField(
                      product._rowKey,
                      "common_name",
                      e.target.value,
                    )
                  }
                />
              ) : (
                commonName
              )}
            </td>
          )}

          {isVeryFirst && vis.scientific_name && (
            <td className="scientific" rowSpan={groupRowSpan}>
              {editMode ? (
                <input
                  type="text"
                  className="lp-inline-input lp-inline-text lp-inline-italic"
                  value={product.scientific_name || ""}
                  onChange={(e) =>
                    updateProductField(
                      product._rowKey,
                      "scientific_name",
                      e.target.value,
                    )
                  }
                />
              ) : (
                firstProduct.scientific_name || "—"
              )}
            </td>
          )}

          {vis.type && (
            <td>
              {editMode ? (
                <select
                  className="lp-inline-select"
                  value={(product.category || "fresh").toLowerCase()}
                  onChange={(e) =>
                    updateProductField(
                      product._rowKey,
                      "category",
                      e.target.value,
                    )
                  }
                >
                  {catOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={`category-badge ${getCategoryBadgeClass(product.category)}`}
                >
                  {getCategoryBadgeIcon(product.category)}{" "}
                  {fmt(product.category)}
                </span>
              )}
            </td>
          )}

          {vis.size && <td className="muted">—</td>}
          {vis.purchasing_price && <td className="muted">—</td>}
          {vis.profit && <td className="muted">—</td>}
          {vis.margin_pct && <td className="muted">—</td>}
          {vis.selling_price && <td className="muted">—</td>}

          <td className="actions-cell">
            {editMode ? (
              <div className="actions-wrapper lp-edit-actions-wrapper">
                <button
                  type="button"
                  className="lp-row-btn lp-row-btn-add"
                  onClick={() => handleAddInlineVariant(product._rowKey)}
                >
                  + Size
                </button>
                {rowModified && (
                  <>
                    <button
                      type="button"
                      className="lp-row-btn lp-row-btn-save"
                      onClick={() => handleSaveToDatabase(product._rowKey)}
                      disabled={savingDb}
                      title="Save this product's edits to DB"
                    >
                      💾 Save
                    </button>
                    <button
                      type="button"
                      className="lp-row-btn lp-row-btn-undo"
                      onClick={() => handleResetSingleProduct(product._rowKey)}
                      disabled={savingDb}
                    >
                      ↺ Undo
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="actions-wrapper">
                <button
                  className="btn-view"
                  onClick={() => navigate(`/productdetail/${product.id}`)}
                >
                  View
                </button>
                {adminUser && (
                  <button
                    className="btn-delete"
                    onClick={() =>
                      handleRemoveFromLocal(product.id, product.common_name)
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </td>
        </tr>
      );
    });
  };

  /* ══════════════════════════ RENDER ══════════════════════════════ */
  return (
    <div className="pricelist-container">
      <h2>
        {reportConfig.title || "Local Product List"}
        {reportConfig.reportDate &&
          reportConfig.reportDate !== new Date().toISOString().split("T")[0] && (
            <span className="lp-heading-date">{reportConfig.reportDate}</span>
          )}
      </h2>

      {/* ── Active Saved Draft Banner ───────────────────────────── */}
      {activeDraft && (
        <div className="lp-draft-banner">
          <div>
            <strong>📑 Viewing Saved Report Draft:</strong>{" "}
            <span>{activeDraft.name}</span>{" "}
            <span style={{ color: "#8899bb", fontSize: "12px" }}>
              (Saved {new Date(activeDraft.savedAt).toLocaleString()})
            </span>
          </div>
          <div className="lp-draft-banner-actions">
            {adminUser && !editMode && (
              <button
                type="button"
                className="lp-mini-btn lp-mini-btn-active"
                onClick={handleEnterEditMode}
              >
                ✏️ Edit Draft
              </button>
            )}
            {adminUser && dirtySummary.modifiedProductCount > 0 && (
              <button
                type="button"
                className="lp-mini-btn lp-mini-btn-save"
                onClick={() => handleSaveToDatabase()}
                disabled={savingDb}
              >
                {savingDb
                  ? "Saving…"
                  : `💾 Push ${dirtySummary.modifiedProductCount} Change(s) to Live DB`}
              </button>
            )}
            <button
              type="button"
              className="lp-mini-btn"
              onClick={handleReturnToLiveList}
            >
              🔄 Return to Live List
            </button>
          </div>
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="lp-toolbar">
        {adminUser && (
          <button
            className="apf-btn"
            onClick={openCatalogueModal}
            disabled={editMode}
          >
            + Add from Catalogue
          </button>
        )}

        {adminUser && (
          <button
            className="apf-btn"
            onClick={editMode ? handleExitEditMode : handleEnterEditMode}
            style={{
              background: editMode
                ? "linear-gradient(135deg, #f59e0b, #d97706)"
                : "linear-gradient(135deg, #06b6d4, #0284c7)",
            }}
          >
            {editMode ? "✓ Done Editing" : "✏️ Edit Report"}
          </button>
        )}

        <button
          className="apf-btn"
          onClick={handleDownloadPDF}
          style={{
            background: "var(--accent-cyan, #0ea5e9)",
          }}
        >
          ⬇ Download Full PDF
        </button>

        <button
          className="apf-btn"
          onClick={handleDownloadPriceListPDF}
          style={{
            background: "var(--accent-green, #10b981)",
          }}
        >
          💰 Download Price List
        </button>

        <button
          className="apf-btn"
          onClick={handleDownloadCustomReportPDF}
          style={{
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
          }}
        >
          📊 Download Report PDF
        </button>

        <button
          className="apf-btn"
          onClick={() => openDraftModal("list")}
          style={{
            background: "linear-gradient(135deg, #475569, #334155)",
          }}
        >
          📑 Saved Reports ({savedDrafts.length})
        </button>

        {adminUser && (
          <button
            className="apf-btn"
            disabled={editMode}
            onClick={bulkMode ? openBulkModal : toggleBulkMode}
            style={{
              background: bulkMode ? "#f59e0b" : "#6366f1",
            }}
          >
            {bulkMode
              ? selectedProductIds.size > 0
                ? `➕ Add ${selectedProductIds.size} to Customer`
                : "✕ Cancel"
              : "👥 Add to Customer"}
          </button>
        )}
        {bulkMode && selectedProductIds.size === 0 && (
          <button className="cancel-btn" onClick={toggleBulkMode}>
            Cancel
          </button>
        )}
      </div>

      {/* ── Edit Mode Panel ─────────────────────────────────────── */}
      {editMode && (
        <ReportCustomizerPanel
          reportConfig={reportConfig}
          onUpdateConfig={setReportConfig}
          onResetLayout={handleResetLayout}
          onSortDefaultOrder={handleSortDefaultOrder}
          onIncludeAll={handleIncludeAll}
          onExcludeAll={handleExcludeAll}
          includedCount={includedTotalCount}
          totalCount={sourceItems.length}
          modifiedCount={dirtySummary.modifiedProductCount}
          savingDb={savingDb}
          saveStatus={saveStatus}
          onSaveToDatabase={() => handleSaveToDatabase()}
          onDiscardAllEdits={handleDiscardAllEdits}
          onExitEditMode={handleExitEditMode}
          onOpenSaveDraft={() => openDraftModal("save")}
          onOpenSavedDrafts={() => openDraftModal("list")}
          savedDraftsCount={savedDrafts.length}
          onDownloadCustomPDF={handleDownloadCustomReportPDF}
          searchQuery={editSearch}
          onSearchChange={setEditSearch}
          activeDraft={activeDraft}
        />
      )}

      {/* Non-edit status banner (e.g. after pushing draft to DB) */}
      {!editMode && saveStatus && (
        <div
          className={`lp-status-banner ${
            saveStatus.type === "error"
              ? "lp-status-error"
              : saveStatus.type === "warning"
                ? "lp-status-warn"
                : "lp-status-success"
          }`}
        >
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* Custom Report Notes banner (visible in report view) */}
      {reportConfig.notes && reportConfig.notes.trim() && (
        <div className="lp-report-notes-banner">
          <strong>📝 Report Note:</strong> {reportConfig.notes}
        </div>
      )}

      {bulkMode && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #f59e0b",
            borderRadius: "8px",
            padding: "10px 16px",
            marginBottom: "12px",
            fontSize: "14px",
            color: "#92400e",
            position: "relative",
            zIndex: 1,
          }}
        >
          ☑️ Select products to add to a customer.{" "}
          {selectedProductIds.size > 0 ? (
            <strong>{selectedProductIds.size} selected.</strong>
          ) : (
            "No products selected yet."
          )}
        </div>
      )}

      {/* Species Filter Pills */}
      <div className="species-filter">
        {speciesTypes.map((type) => (
          <button
            key={type.value}
            className={`species-pill ${selectedSpeciesType === type.value ? "active" : ""}`}
            onClick={() => setSelectedSpeciesType(type.value)}
            disabled={getSpeciesCount(type.value) === 0 && type.value !== "all"}
          >
            <span className="species-icon">{type.icon}</span>
            <span className="species-label">{type.label}</span>
            <span className="species-count">
              ({getSpeciesCount(type.value)})
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="info">Loading…</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="filter-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              Showing <strong>{displayedItems.length}</strong>{" "}
              {selectedSpeciesType === "all"
                ? "products"
                : fmt(selectedSpeciesType)}
              {!editMode && excludedInCurrentFilterCount > 0 && (
                <span style={{ marginLeft: "8px", color: "#fbbf24" }}>
                  ({excludedInCurrentFilterCount} hidden by report layout)
                </span>
              )}
            </div>
            {!editMode && excludedInCurrentFilterCount > 0 && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="lp-mini-btn"
                  onClick={handleIncludeAll}
                >
                  Show All
                </button>
                {adminUser && (
                  <button
                    type="button"
                    className="lp-mini-btn lp-mini-btn-active"
                    onClick={handleEnterEditMode}
                  >
                    ✏️ Edit Report
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="table-wrap">
            <table className="pricelist-table">
              <thead>
                <tr>
                  {bulkMode && !editMode && (
                    <th style={{ width: "40px" }}>Select</th>
                  )}
                  {editMode && <th style={{ width: "105px" }}>Report</th>}
                  {vis.picture && <th>Picture</th>}
                  {vis.common_name && <th>Common Name</th>}
                  {vis.scientific_name && <th>Scientific Name</th>}
                  {vis.type && <th>Type</th>}
                  {vis.size && <th>Size</th>}
                  {vis.purchasing_price && <th>Purchase Price</th>}
                  {vis.profit && <th>Profit</th>}
                  {vis.margin_pct && <th>Margin %</th>}
                  {vis.selling_price && <th>Selling Price</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportConfig.groupBySection !== false ? (
                  <>
                    {[...sectionCategories.map((s) => s.name), "Other"].map(
                      (section) => {
                        if (!sectionHasProducts(section)) return null;
                        const sectionEntries = Object.entries(
                          groupedBySection[section],
                        );
                        const siblingKeys = sectionEntries.map(
                          ([, prods]) => prods[0]._rowKey,
                        );

                        return (
                          <React.Fragment key={section}>
                            <tr className="section-header">
                              <td colSpan={totalColCount} className="section-title">
                                <span className="section-icon">
                                  {sectionIcon[section] || "📦"}
                                </span>
                                {section}
                              </td>
                            </tr>

                            {sectionEntries.map(([, products]) =>
                              renderProductGroup(products, siblingKeys),
                            )}
                          </React.Fragment>
                        );
                      },
                    )}
                  </>
                ) : (
                  (() => {
                    const flatKeys = displayedItems.map((p) => p._rowKey);
                    return displayedItems.map((p) =>
                      renderProductGroup([p], flatKeys),
                    );
                  })()
                )}

                {displayedItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={totalColCount}
                      className="muted"
                      style={{ textAlign: "center", padding: "3rem" }}
                    >
                      {sourceItems.length === 0
                        ? 'No products in the local list yet. Click "+ Add from Catalogue" to add products.'
                        : "No products match the current filter / report inclusion settings."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {reportConfig.footerNote &&
            reportConfig.footerNote !==
              "Tropical Shellfish (Pvt) Ltd  |  Prices subject to change without prior notice" && (
              <div className="lp-report-footer-preview">
                {reportConfig.footerNote}
              </div>
            )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SAVED REPORT DRAFTS MODAL
      ══════════════════════════════════════════════════════════════ */}
      <SavedReportsModal
        isOpen={draftModalOpen}
        initialTab={draftModalTab}
        onClose={() => setDraftModalOpen(false)}
        drafts={savedDrafts}
        activeDraft={activeDraft}
        reportConfig={reportConfig}
        includedCount={includedTotalCount}
        totalCount={sourceItems.length}
        modifiedCount={dirtySummary.modifiedProductCount}
        onSaveDraft={handleSaveDraft}
        onLoadDraft={handleLoadDraft}
        onDeleteDraft={handleDeleteDraft}
        onExportDraftPDF={handleExportDraftPDF}
      />

      {/* ══════════════════════════════════════════════════════════════
          ADD FROM CATALOGUE MODAL
      ══════════════════════════════════════════════════════════════ */}
      {showCatalogueModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#1e3a5f" }}>
                  {selectedCatProduct
                    ? `📋 Set Local Pricing — ${selectedCatProduct.common_name}`
                    : "🗂️ Add from Catalogue"}
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "13px",
                    color: "#6b7280",
                  }}
                >
                  {selectedCatProduct
                    ? "Set profit and selling price per size. These prices will appear in the local list."
                    : "Select a product from the master catalogue to add to the local list."}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCatalogueModal(false);
                  setSelectedCatProduct(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>

            {!selectedCatProduct ? (
              /* ── Step 1: Pick a product ── */
              <>
                <div
                  style={{
                    padding: "16px 24px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <input
                    value={catalogueSearch}
                    onChange={(e) => setCatalogueSearch(e.target.value)}
                    placeholder="🔍 Search by name…"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                  {catalogueLoading && (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      Loading catalogue…
                    </div>
                  )}
                  {!catalogueLoading &&
                    filteredCatalogue.map((product) => {
                      const inLocalList = items.some(
                        (p) => p.id === product.id,
                      );
                      return (
                        <div
                          key={product.id}
                          onClick={() => selectCatalogueProduct(product)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            padding: "12px 24px",
                            cursor: "pointer",
                            borderBottom: "1px solid #f1f5f9",
                            background: inLocalList ? "#f0fdf4" : "#fff",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = inLocalList
                              ? "#dcfce7"
                              : "#f8faff")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = inLocalList
                              ? "#f0fdf4"
                              : "#fff")
                          }
                        >
                          <img
                            src={
                              product.image_url
                                ? product.image_url.startsWith("http")
                                  ? product.image_url
                                  : `${API_URL}${product.image_url}`
                                : "/images/placeholder-seafood.png"
                            }
                            alt={product.common_name}
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "8px",
                              objectFit: "cover",
                              border: "1px solid #e5e7eb",
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "#1e3a5f",
                                fontSize: "14px",
                              }}
                            >
                              {product.common_name}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                fontStyle: "italic",
                              }}
                            >
                              {product.scientific_name || "—"}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#94a3b8",
                                marginTop: "2px",
                              }}
                            >
                              {(product.variants || []).length} size
                              {(product.variants || []).length !== 1
                                ? "s"
                                : ""}{" "}
                              · {fmt(product.category)}
                            </div>
                          </div>
                          {inLocalList && (
                            <span
                              style={{
                                fontSize: "11px",
                                background: "#dcfce7",
                                color: "#166534",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontWeight: 600,
                              }}
                            >
                              ✓ In list
                            </span>
                          )}
                          <span style={{ color: "#94a3b8", fontSize: "18px" }}>
                            ›
                          </span>
                        </div>
                      );
                    })}
                  {!catalogueLoading && filteredCatalogue.length === 0 && (
                    <div
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#9ca3af",
                      }}
                    >
                      No products found
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── Step 2: Set pricing ── */
              <>
                <div
                  style={{
                    padding: "12px 24px",
                    borderBottom: "1px solid #e5e7eb",
                    background: "#f8faff",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#475569",
                      fontWeight: 600,
                    }}
                  >
                    Apply profit to all:
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 150"
                    style={{
                      width: "110px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      fontSize: "13px",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applyProfitToAll(e.target.value);
                    }}
                    onBlur={(e) => {
                      if (e.target.value) applyProfitToAll(e.target.value);
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                    Press Enter or blur to apply
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      marginLeft: "16px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      Category:
                    </span>
                    {[
                      { key: "fresh", label: "💧 Fresh", color: "#38bdf8" },
                      { key: "frozen", label: "❄️ Frozen", color: "#818cf8" },
                      { key: "live", label: "🟢 Live", color: "#34d399" },
                    ].map((cat) => {
                      const on = selectedPricingCategories.includes(cat.key);
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() =>
                            setSelectedPricingCategories((prev) => {
                              const has = prev.includes(cat.key);
                              const next = has
                                ? prev.filter((c) => c !== cat.key)
                                : [...prev, cat.key];
                              return next.length ? next : [cat.key];
                            })
                          }
                          style={{
                            padding: "5px 12px",
                            borderRadius: "6px",
                            border: `2px solid ${on ? cat.color : "#e2e8f0"}`,
                            background: on ? `${cat.color}20` : "#fff",
                            color: on ? cat.color : "#94a3b8",
                            fontWeight: "700",
                            fontSize: "12px",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {on ? "✓ " : ""}
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setSelectedCatProduct(null)}
                    style={{
                      marginLeft: "auto",
                      background: "none",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "#6b7280",
                    }}
                  >
                    ← Back to catalogue
                  </button>
                </div>

                <div
                  style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}
                >
                  {pricingRows.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#9ca3af",
                        padding: "32px",
                      }}
                    >
                      This product has no sizes yet. Add sizes from the master
                      catalogue first.
                    </div>
                  )}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                    }}
                  >
                    {pricingRows.length > 0 && (
                      <thead>
                        <tr style={{ background: "#f1f5f9" }}>
                          {[
                            "Size",
                            "Unit",
                            "Purchase (Rs.)",
                            "Profit (Rs.)",
                            "Margin %",
                            "Selling (Rs.)",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "8px 10px",
                                color: "#475569",
                                fontWeight: 600,
                                textAlign:
                                  h === "Size" || h === "Unit"
                                    ? "left"
                                    : "right",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {pricingRows.map((row, i) => (
                        <tr
                          key={`${row.variant_id}-${i}`}
                          style={{ borderBottom: "1px solid #f1f5f9" }}
                        >
                          <td
                            style={{
                              padding: "8px 10px",
                              fontWeight: 600,
                              color: "#1e3a5f",
                            }}
                          >
                            {row.size || "—"}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#6b7280" }}>
                            {row.unit}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              textAlign: "right",
                              color: "#374151",
                            }}
                          >
                            Rs. {sf(row.purchasing_price).toFixed(2)}
                          </td>
                          <td style={{ padding: "4px 6px" }}>
                            <input
                              type="number"
                              step="0.01"
                              value={row.profit}
                              onChange={(e) =>
                                updatePricingRow(i, "profit", e.target.value)
                              }
                              style={{
                                width: "90px",
                                padding: "5px 8px",
                                textAlign: "right",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                fontSize: "13px",
                              }}
                            />
                          </td>
                          <td style={{ padding: "4px 6px" }}>
                            <input
                              type="number"
                              step="0.01"
                              value={row.profit_margin_percentage}
                              onChange={(e) =>
                                updatePricingRow(
                                  i,
                                  "profit_margin_percentage",
                                  e.target.value,
                                )
                              }
                              style={{
                                width: "70px",
                                padding: "5px 8px",
                                textAlign: "right",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                fontSize: "13px",
                              }}
                            />
                          </td>
                          <td style={{ padding: "4px 6px" }}>
                            <input
                              type="number"
                              step="0.01"
                              value={row.selling_price}
                              onChange={(e) =>
                                updatePricingRow(
                                  i,
                                  "selling_price",
                                  e.target.value,
                                )
                              }
                              style={{
                                width: "100px",
                                padding: "5px 8px",
                                textAlign: "right",
                                borderRadius: "6px",
                                border: "1px solid #0d47a1",
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#0d47a1",
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    padding: "16px 24px",
                    borderTop: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowCatalogueModal(false);
                      setSelectedCatProduct(null);
                    }}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePricing}
                    disabled={savingPricing || pricingRows.length === 0}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "8px",
                      border: "none",
                      background:
                        savingPricing || pricingRows.length === 0
                          ? "#9ca3af"
                          : "#0d47a1",
                      color: "#fff",
                      cursor:
                        savingPricing || pricingRows.length === 0
                          ? "not-allowed"
                          : "pointer",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    {savingPricing ? "Saving…" : "Save to Local List"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Bulk Add to Customer Modal ─────────────────────────────── */}
      {showBulkModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "780px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px", color: "#1e3a5f" }}>
                👥 Add Products to Customer
              </h3>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "13px",
                  color: "#6b7280",
                }}
              >
                {bulkItems.length} variant(s) from {selectedProductIds.size}{" "}
                product(s)
              </p>
            </div>
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <label
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "#374151",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Select Customer *
              </label>
              <select
                value={bulkCustomerId}
                onChange={(e) => setBulkCustomerId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              >
                <option value="">— Choose a customer —</option>
                {customers.map((c) => (
                  <option key={c.cus_id ?? c.id} value={c.cus_id ?? c.id}>
                    {c.cus_name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {[
                      "Product",
                      "Size",
                      "Purchase (Rs)",
                      "Margin (Rs)",
                      "Margin %",
                      "Selling (Rs)",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 10px",
                          textAlign:
                            h === "Product" || h === "Size" ? "left" : "right",
                          color: "#475569",
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkItems.map((item) => (
                    <tr
                      key={item.key}
                      style={{ borderBottom: "1px solid #e5e7eb" }}
                    >
                      <td
                        style={{
                          padding: "8px 10px",
                          fontWeight: 500,
                          color: "#1e3a5f",
                        }}
                      >
                        {item.common_name}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#6b7280" }}>
                        {item.size_range || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          color: "#374151",
                        }}
                      >
                        {sf(item.purchasing_price).toFixed(2)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        <input
                          type="number"
                          step="0.01"
                          value={item.margin}
                          onChange={(e) =>
                            updateBulkItem(item.key, "margin", e.target.value)
                          }
                          style={{
                            width: "80px",
                            padding: "4px 6px",
                            textAlign: "right",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                            fontSize: "13px",
                          }}
                        />
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        <input
                          type="number"
                          step="0.01"
                          value={item.margin_percentage}
                          onChange={(e) =>
                            updateBulkItem(
                              item.key,
                              "margin_percentage",
                              e.target.value,
                            )
                          }
                          style={{
                            width: "70px",
                            padding: "4px 6px",
                            textAlign: "right",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                            fontSize: "13px",
                          }}
                        />
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        <input
                          type="number"
                          step="0.01"
                          value={item.selling_price}
                          onChange={(e) =>
                            updateBulkItem(
                              item.key,
                              "selling_price",
                              e.target.value,
                            )
                          }
                          style={{
                            width: "90px",
                            padding: "4px 6px",
                            textAlign: "right",
                            borderRadius: "6px",
                            border: "1px solid #0d47a1",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#0d47a1",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() => setShowBulkModal(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSubmit}
                disabled={bulkSubmitting || !bulkCustomerId}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    bulkSubmitting || !bulkCustomerId ? "#9ca3af" : "#0d47a1",
                  color: "#fff",
                  cursor:
                    bulkSubmitting || !bulkCustomerId
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {bulkSubmitting ? "Adding…" : "Add to Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Productlist;
