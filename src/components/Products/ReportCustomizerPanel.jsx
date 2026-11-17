import React, { useState } from "react";
import { REPORT_COLUMN_DEFS } from "./localReportUtils";

const ReportCustomizerPanel = ({
  reportConfig,
  onUpdateConfig,
  onResetLayout,
  onSortDefaultOrder,
  onIncludeAll,
  onExcludeAll,
  includedCount,
  totalCount,
  modifiedCount,
  savingDb,
  saveStatus,
  onSaveToDatabase,
  onDiscardAllEdits,
  onExitEditMode,
  onOpenSaveDraft,
  onOpenSavedDrafts,
  savedDraftsCount,
  onDownloadCustomPDF,
  searchQuery,
  onSearchChange,
  activeDraft,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const vis = reportConfig.visibleColumns || {};

  const toggleColumn = (colKey) => {
    const currentlyVisibleCount = Object.values(vis).filter(Boolean).length;
    if (vis[colKey] && currentlyVisibleCount <= 1) {
      alert("At least one column must remain visible.");
      return;
    }
    onUpdateConfig({
      ...reportConfig,
      visibleColumns: {
        ...vis,
        [colKey]: !vis[colKey],
      },
    });
  };

  return (
    <div className="lp-edit-panel-wrap">
      {/* ── Sticky Action Bar ── */}
      <div className="lp-edit-bar">
        <div className="lp-edit-bar-left">
          <span className="lp-edit-badge">✏️ Edit Report Mode</span>
          {activeDraft && (
            <span className="lp-draft-chip">Draft: {activeDraft.name}</span>
          )}
          <span className="lp-edit-stat">
            {modifiedCount > 0 ? (
              <strong style={{ color: "#fbbf24" }}>
                {modifiedCount} product{modifiedCount !== 1 ? "s" : ""} modified
              </strong>
            ) : (
              <span>No unsaved DB changes</span>
            )}
            <span className="lp-edit-sep">·</span>
            <span>
              {includedCount}/{totalCount} included in report
            </span>
          </span>
        </div>

        <div className="lp-edit-bar-actions">
          <button
            type="button"
            className="lp-btn lp-btn-save-db"
            onClick={onSaveToDatabase}
            disabled={savingDb || modifiedCount === 0}
          >
            {savingDb
              ? "Saving to DB…"
              : `💾 Save to Database${modifiedCount > 0 ? ` (${modifiedCount})` : ""}`}
          </button>

          <button
            type="button"
            className="lp-btn lp-btn-draft"
            onClick={onOpenSaveDraft}
            disabled={savingDb}
          >
            📌 Save Report Draft
          </button>

          <button
            type="button"
            className="lp-btn lp-btn-secondary"
            onClick={onOpenSavedDrafts}
            disabled={savingDb}
          >
            📑 Saved Drafts ({savedDraftsCount})
          </button>

          <button
            type="button"
            className="lp-btn lp-btn-pdf"
            onClick={onDownloadCustomPDF}
            disabled={savingDb}
          >
            📊 Export Report PDF
          </button>

          <button
            type="button"
            className={`lp-btn ${showSettings ? "lp-btn-accent-active" : "lp-btn-secondary"}`}
            onClick={() => setShowSettings((p) => !p)}
          >
            ⚙️ {showSettings ? "Hide Layout & Header" : "Layout & Header"}
          </button>

          {modifiedCount > 0 && (
            <button
              type="button"
              className="lp-btn lp-btn-warn"
              onClick={onDiscardAllEdits}
              disabled={savingDb}
            >
              ↺ Undo Edits
            </button>
          )}

          <button
            type="button"
            className="lp-btn lp-btn-exit"
            onClick={onExitEditMode}
            disabled={savingDb}
          >
            ✕ Exit Edit
          </button>
        </div>
      </div>

      {/* ── Inline Save Feedback Banner ── */}
      {saveStatus && (
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

      {/* ── Quick Filter Row ── */}
      <div className="lp-quick-row">
        <input
          type="text"
          className="lp-search-input"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="🔍 Filter products by common name, scientific name, or size…"
        />
        <div className="lp-quick-row-btns">
          <button
            type="button"
            className="lp-mini-btn"
            onClick={onIncludeAll}
            title="Include all filtered products in the report"
          >
            ☑ Include All
          </button>
          <button
            type="button"
            className="lp-mini-btn"
            onClick={onExcludeAll}
            title="Exclude all filtered products from the report"
          >
            ☐ Exclude All
          </button>
          <button
            type="button"
            className="lp-mini-btn"
            onClick={() =>
              onUpdateConfig({
                ...reportConfig,
                groupBySection: !reportConfig.groupBySection,
              })
            }
          >
            {reportConfig.groupBySection
              ? "📂 Grouped by Category"
              : "📋 Flat List (Free Order)"}
          </button>
        </div>
      </div>

      {/* ── Collapsible Layout, Header & Columns Customizer ── */}
      {showSettings && (
        <div className="lp-customizer-card">
          <div className="lp-customizer-grid">
            <div>
              <label className="lp-field-label">Report Title</label>
              <input
                type="text"
                className="lp-field-input"
                value={reportConfig.title}
                onChange={(e) =>
                  onUpdateConfig({ ...reportConfig, title: e.target.value })
                }
                placeholder="Local Product List"
              />
            </div>

            <div>
              <label className="lp-field-label">Report Date</label>
              <input
                type="date"
                className="lp-field-input"
                value={reportConfig.reportDate}
                onChange={(e) =>
                  onUpdateConfig({
                    ...reportConfig,
                    reportDate: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="lp-field-label">Company Header (PDF)</label>
              <input
                type="text"
                className="lp-field-input"
                value={reportConfig.companyName}
                onChange={(e) =>
                  onUpdateConfig({
                    ...reportConfig,
                    companyName: e.target.value,
                  })
                }
                placeholder="Tropical Shellfish (Pvt) Ltd"
              />
            </div>

            <div>
              <label className="lp-field-label">Subtitle (PDF)</label>
              <input
                type="text"
                className="lp-field-input"
                value={reportConfig.subtitle}
                onChange={(e) =>
                  onUpdateConfig({ ...reportConfig, subtitle: e.target.value })
                }
                placeholder="Fresh & Frozen Seafood Exporters"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="lp-field-label">
                Report Notes / Remarks (Shown on Report &amp; PDF)
              </label>
              <textarea
                rows={2}
                className="lp-field-input"
                value={reportConfig.notes}
                onChange={(e) =>
                  onUpdateConfig({ ...reportConfig, notes: e.target.value })
                }
                placeholder="Optional notes, validity dates, delivery terms, or special remarks…"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="lp-field-label">Footer Note (PDF)</label>
              <input
                type="text"
                className="lp-field-input"
                value={reportConfig.footerNote}
                onChange={(e) =>
                  onUpdateConfig({
                    ...reportConfig,
                    footerNote: e.target.value,
                  })
                }
                placeholder="Tropical Shellfish (Pvt) Ltd | Prices subject to change without prior notice"
              />
            </div>
          </div>

          <div className="lp-columns-section">
            <span className="lp-field-label" style={{ marginBottom: 0 }}>
              Visible Columns:
            </span>
            <div className="lp-col-pills">
              {REPORT_COLUMN_DEFS.map((col) => {
                const active = vis[col.key] !== false;
                return (
                  <button
                    key={col.key}
                    type="button"
                    className={`lp-col-pill ${active ? "active" : ""}`}
                    onClick={() => toggleColumn(col.key)}
                  >
                    {active ? "✓ " : "+ "}
                    {col.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lp-customizer-footer">
            <button
              type="button"
              className="lp-mini-btn"
              onClick={onSortDefaultOrder}
            >
              ↕ Apply Default Seafood Sort Order
            </button>
            <button
              type="button"
              className="lp-mini-btn lp-mini-btn-danger"
              onClick={onResetLayout}
            >
              ↺ Reset Layout &amp; Columns to Default
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportCustomizerPanel;
