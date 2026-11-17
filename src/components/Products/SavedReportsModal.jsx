import React, { useEffect, useState } from "react";

const SavedReportsModal = ({
  isOpen,
  initialTab = "list", // "list" | "save"
  onClose,
  drafts = [],
  activeDraft,
  reportConfig,
  includedCount,
  totalCount,
  modifiedCount,
  onSaveDraft,
  onLoadDraft,
  onDeleteDraft,
  onExportDraftPDF,
}) => {
  const [tab, setTab] = useState(initialTab);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTab(initialTab);
    if (activeDraft) {
      setDraftName(activeDraft.name);
    } else {
      const today = reportConfig?.reportDate || new Date().toISOString().split("T")[0];
      setDraftName(`${reportConfig?.title || "Local Product Report"} — ${today}`);
    }
  }, [isOpen, initialTab, activeDraft, reportConfig]);

  if (!isOpen) return null;

  const handleSave = (asNew = false) => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      alert("Please enter a name for the report draft.");
      return;
    }
    onSaveDraft({
      name: trimmed,
      overwriteId: !asNew && activeDraft ? activeDraft.id : null,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5, 8, 16, 0.78)",
        backdropFilter: "blur(4px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0d1424",
          border: "1px solid rgba(0, 212, 255, 0.25)",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "740px",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
          color: "#f0f4ff",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#111828",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", color: "#00d4ff" }}>
              📑 Saved Report Drafts
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#8899bb" }}>
              Save customized report layouts, notes, and product snapshots locally to reopen or export later.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#8899bb",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "12px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "#080c18",
          }}
        >
          <button
            type="button"
            className={`lp-mini-btn ${tab === "list" ? "lp-mini-btn-active" : ""}`}
            onClick={() => setTab("list")}
          >
            📂 Saved Drafts ({drafts.length})
          </button>
          <button
            type="button"
            className={`lp-mini-btn ${tab === "save" ? "lp-mini-btn-active" : ""}`}
            onClick={() => setTab("save")}
          >
            📌 Save Current Report as Draft
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
          {tab === "save" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="lp-field-label">Draft Name *</label>
                <input
                  type="text"
                  className="lp-field-input"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g., Weekly Hotel Price List — Nov 2026"
                  autoFocus
                />
              </div>

              <div
                style={{
                  background: "#111828",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "14px",
                  fontSize: "13px",
                  color: "#cbd5e1",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                <div>
                  <span style={{ color: "#8899bb" }}>Report Title: </span>
                  <strong>{reportConfig?.title || "Local Product List"}</strong>
                </div>
                <div>
                  <span style={{ color: "#8899bb" }}>Included Products: </span>
                  <strong>
                    {includedCount} / {totalCount}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#8899bb" }}>Report Date: </span>
                  <strong>{reportConfig?.reportDate || "—"}</strong>
                </div>
                <div>
                  <span style={{ color: "#8899bb" }}>Edited Products: </span>
                  <strong>{modifiedCount} modified</strong>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  className="lp-btn lp-btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                {activeDraft && (
                  <button
                    type="button"
                    className="lp-btn lp-btn-draft"
                    onClick={() => handleSave(false)}
                  >
                    💾 Update "{activeDraft.name}"
                  </button>
                )}
                <button
                  type="button"
                  className="lp-btn lp-btn-save-db"
                  onClick={() => handleSave(true)}
                >
                  ➕ Save as New Draft
                </button>
              </div>
            </div>
          ) : drafts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 16px",
                color: "#8899bb",
                fontSize: "14px",
              }}
            >
              No saved report drafts yet. Click{" "}
              <strong>Save Current Report as Draft</strong> to save your first
              customized report.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {drafts.map((d) => {
                const isActive = activeDraft?.id === d.id;
                const excludedSet = new Set(d.config?.excludedKeys || []);
                const total = (d.items || []).length;
                const included = (d.items || []).filter(
                  (p) => !excludedSet.has(p._rowKey),
                ).length;

                return (
                  <div
                    key={d.id}
                    style={{
                      background: isActive ? "rgba(0, 212, 255, 0.08)" : "#111828",
                      border: isActive
                        ? "1px solid rgba(0, 212, 255, 0.45)"
                        : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "220px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "15px", color: "#f0f4ff" }}>
                          {d.name}
                        </strong>
                        {isActive && (
                          <span className="lp-draft-chip">Active</span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#8899bb", marginTop: "4px" }}>
                        Title: {d.config?.title || "Local Product List"} ·{" "}
                        {included}/{total} products · Saved{" "}
                        {new Date(d.savedAt).toLocaleString()}
                      </div>
                      {d.config?.notes && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#94a3b8",
                            marginTop: "4px",
                            fontStyle: "italic",
                          }}
                        >
                          "{d.config.notes.slice(0, 90)}
                          {d.config.notes.length > 90 ? "…" : ""}"
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="lp-mini-btn lp-mini-btn-active"
                        onClick={() => onLoadDraft(d, false)}
                      >
                        📂 Open
                      </button>
                      <button
                        type="button"
                        className="lp-mini-btn"
                        onClick={() => onLoadDraft(d, true)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="lp-mini-btn"
                        onClick={() => onExportDraftPDF(d)}
                      >
                        📄 PDF
                      </button>
                      <button
                        type="button"
                        className="lp-mini-btn lp-mini-btn-danger"
                        onClick={() => onDeleteDraft(d.id, d.name)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedReportsModal;
