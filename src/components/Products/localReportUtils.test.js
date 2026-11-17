import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  attachRowKeys,
  calcFromMarginPct,
  calcFromProfit,
  calcFromSelling,
  cloneReportItems,
  generateLocalReportPDF,
  getDefaultReportConfig,
  getDirtySummary,
  isProductLocalDirty,
  isProductMasterDirty,
  loadActiveReportLayout,
  loadSavedReportDrafts,
  persistSavedReportDrafts,
  saveActiveReportLayout,
  sortItemsByReportConfig,
} from "./localReportUtils";

jest.mock("jspdf", () => jest.fn());
jest.mock("jspdf-autotable", () => jest.fn());

describe("localReportUtils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("pricing calculations stay consistent across profit, selling price, and margin %", () => {
    const fromProfit = calcFromProfit(90, 140);
    expect(fromProfit.selling_price).toBe(230);
    expect(fromProfit.profit_margin_percentage).toBeCloseTo(60.87, 2);

    const fromSelling = calcFromSelling(60, 160);
    expect(fromSelling.profit).toBe(100);
    expect(fromSelling.profit_margin_percentage).toBe(62.5);

    const fromMargin = calcFromMarginPct(100, 20);
    expect(fromMargin.profit).toBe(25);
    expect(fromMargin.selling_price).toBe(125);
  });

  test("attachRowKeys assigns stable unique keys even for duplicate product IDs", () => {
    const keyed = attachRowKeys([
      {
        id: 1,
        common_name: "Depurated Oyster",
        category: "live",
        variants: [{ id: 10, size: "4-5", purchasing_price: 90 }],
      },
      {
        id: 1,
        common_name: "Depurated Oyster",
        category: "live",
        variants: [{ id: 11, size: "2-4", purchasing_price: 60 }],
      },
    ]);

    expect(keyed[0]._rowKey).toBe("1::live::0");
    expect(keyed[1]._rowKey).toBe("1::live::1");
    expect(keyed[0].variants[0]._vKey).toBe("v_10");
  });

  test("dirty detection distinguishes master fields vs local pricing fields", () => {
    const [orig] = attachRowKeys([
      {
        id: 5,
        common_name: "Depurated Oyster",
        scientific_name: "Crassostrea rhizophorae",
        category: "live",
        variants: [
          {
            id: 100,
            size: '4" - 5"',
            unit: "pcs",
            purchasing_price: 90,
            profit: 140,
            selling_price: 230,
            profit_margin_percentage: 60.87,
          },
        ],
      },
    ]);

    const cleanClone = cloneReportItems([orig])[0];
    expect(isProductMasterDirty(orig, cleanClone)).toBe(false);
    expect(isProductLocalDirty(orig, cleanClone)).toBe(false);

    const localOnlyEdit = cloneReportItems([orig])[0];
    localOnlyEdit.variants[0].profit = "150";
    localOnlyEdit.variants[0].selling_price = 240;
    expect(isProductMasterDirty(orig, localOnlyEdit)).toBe(false);
    expect(isProductLocalDirty(orig, localOnlyEdit)).toBe(true);

    const masterEdit = cloneReportItems([orig])[0];
    masterEdit.variants[0].purchasing_price = "100";
    masterEdit.variants[0].selling_price = 240;
    expect(isProductMasterDirty(orig, masterEdit)).toBe(true);
    expect(isProductLocalDirty(orig, masterEdit)).toBe(true);

    const summary = getDirtySummary([orig], [masterEdit]);
    expect(summary.masterProductIds.has(5)).toBe(true);
    expect(summary.localProductIds.has(5)).toBe(true);
    expect(summary.modifiedProductCount).toBe(1);
  });

  test("sortItemsByReportConfig honors customOrder and appends new items at end", () => {
    const items = attachRowKeys([
      { id: 1, common_name: "Alpha", category: "fresh", variants: [] },
      { id: 2, common_name: "Beta", category: "fresh", variants: [] },
      { id: 3, common_name: "Gamma", category: "fresh", variants: [] },
    ]);
    const sorted = sortItemsByReportConfig(items, [
      items[2]._rowKey,
      items[0]._rowKey,
    ]);
    expect(sorted.map((p) => p.id)).toEqual([3, 1, 2]);
  });

  test("layout and report drafts persist cleanly in localStorage", () => {
    const cfg = getDefaultReportConfig();
    cfg.title = "Custom Local Report";
    cfg.notes = "Valid today";
    saveActiveReportLayout(cfg);

    const loaded = loadActiveReportLayout();
    expect(loaded.title).toBe("Custom Local Report");
    expect(loaded.notes).toBe("Valid today");

    const draft = { id: "d1", name: "Draft 1", config: cfg, items: [] };
    persistSavedReportDrafts([draft]);
    expect(loadSavedReportDrafts()).toHaveLength(1);
    expect(loadSavedReportDrafts()[0].name).toBe("Draft 1");
  });

  test("generateLocalReportPDF exports selected custom columns and notes", async () => {
    const saveMock = jest.fn();
    jsPDF.mockImplementation(() => ({
      internal: {
        pageSize: { getWidth: () => 297, getHeight: () => 210 },
        getNumberOfPages: () => 1,
      },
      setFillColor: jest.fn(),
      rect: jest.fn(),
      addImage: jest.fn(),
      setTextColor: jest.fn(),
      setFontSize: jest.fn(),
      setFont: jest.fn(),
      text: jest.fn(),
      splitTextToSize: (t) => [t],
      roundedRect: jest.fn(),
      setDrawColor: jest.fn(),
      setLineWidth: jest.fn(),
      setPage: jest.fn(),
      save: saveMock,
    }));

    const cfg = getDefaultReportConfig();
    cfg.title = "Edited Oyster Report";
    cfg.notes = "Updated prices";
    cfg.visibleColumns = {
      picture: false,
      common_name: true,
      scientific_name: false,
      type: true,
      size: true,
      purchasing_price: true,
      profit: true,
      margin_pct: true,
      selling_price: true,
    };

    const products = attachRowKeys([
      {
        id: 1,
        common_name: "Depurated Oyster",
        category: "live",
        variants: [
          {
            id: 10,
            size: '4" - 5"',
            purchasing_price: 90,
            profit: 140,
            profit_margin_percentage: 60.87,
            selling_price: 230,
          },
        ],
      },
    ]);

    await generateLocalReportPDF({
      mode: "custom",
      products,
      reportConfig: cfg,
      API_URL: "http://localhost:5000",
      getSortIndex: () => 0,
    });

    expect(autoTable).toHaveBeenCalledTimes(1);
    const tableOptions = autoTable.mock.calls[0][1];
    expect(tableOptions.head[0].map((h) => h.content)).toEqual([
      "Common Name",
      "Type",
      "Size / Range",
      "Purchase (Rs)",
      "Profit (Rs)",
      "Margin %",
      "Selling Price (Rs)",
    ]);
    expect(tableOptions.body[0]).toEqual([
      "Depurated Oyster",
      "Live",
      '4" - 5"',
      "Rs. 90.00",
      "Rs. 140.00",
      "60.9%",
      "Rs. 230.00",
    ]);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });
});
