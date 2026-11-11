"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Editor } from "@/components/Editor";
import { UploadModal } from "@/components/UploadModal";
import { ShareModal } from "@/components/ShareModal";
import { useUser, User } from "@/context/UserContext";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Share2,
  UploadCloud,
  Download,
  History,
  Crown,
  Edit3,
  Eye,
  AlertTriangle,
  RotateCcw,
  X,
  Printer,
  FileCode,
  FileText,
  Save,
} from "lucide-react";

interface VersionItem {
  id: string;
  documentId: string;
  title: string;
  content: string;
  savedById: string;
  createdAt: string;
  savedBy: User;
}

interface DocumentDetail {
  id: string;
  title: string;
  content: string;
  sourceFileName: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  effectiveRole: "OWNER" | "EDIT" | "VIEW";
  owner: User;
  shares: Array<{
    id: string;
    userId: string;
    permission: "VIEW" | "EDIT";
    user: User;
  }>;
  versions: VersionItem[];
}

type SaveStatus = "saved" | "unsaved" | "saving" | "error";

export default function DocumentEditorPage() {
  const params = useParams();
  const documentId = params.id as string;

  const { currentUser, fetchWithUser } = useUser();

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Editor states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Modals & Drawers
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Auto-save debounce timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestContentRef = useRef(content);
  latestContentRef.current = content;

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setIsExportMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch document details
  const fetchDocument = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    setLoadError(null);

    try {
      const res = await fetchWithUser(`/api/documents/${documentId}`);
      if (res.status === 404) {
        setLoadError("Document not found");
        return;
      }
      if (res.status === 403) {
        setLoadError(
          "Access denied. You do not have permission to view this document."
        );
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load document");
      }

      const data: DocumentDetail = await res.json();
      setDocument(data);
      setTitle(data.title);
      setContent(data.content || "");
      setSaveStatus("saved");
      setLastSavedAt(new Date(data.updatedAt));
    } catch (err) {
      console.error("Error loading document:", err);
      setLoadError(err instanceof Error ? err.message : "Error loading document");
    } finally {
      setLoading(false);
    }
  }, [documentId, fetchWithUser]);

  // Refetch document whenever the active reviewer changes or on mount
  useEffect(() => {
    fetchDocument();
  }, [fetchDocument, currentUser?.email]);

  // Save Document API call
  const saveDocument = useCallback(
    async (
      fields: { title?: string; content?: string },
      createSnapshot = false
    ) => {
      if (!document) return;
      if (document.effectiveRole === "VIEW") return;

      setSaveStatus("saving");

      try {
        const res = await fetchWithUser(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...fields,
            createVersionSnapshot: createSnapshot,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save document");
        }

        const updated: DocumentDetail = await res.json();
        setDocument((prev) => (prev ? { ...prev, ...updated } : updated));
        setSaveStatus("saved");
        setLastSavedAt(new Date());

        // If snapshot created, refresh version list
        if (createSnapshot) {
          fetchDocument();
        }
      } catch (err) {
        console.error("Save error:", err);
        setSaveStatus("error");
      }
    },
    [document, documentId, fetchWithUser, fetchDocument]
  );

  // Content change handler with 1.5s debounced auto-save
  const handleContentChange = useCallback(
    (newHtml: string) => {
      if (!document || document.effectiveRole === "VIEW") return;

      setContent(newHtml);
      setSaveStatus("unsaved");

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        saveDocument({ content: newHtml }, false);
      }, 1500); // 1.5 seconds debounce
    },
    [document, saveDocument]
  );

  // Title change handler
  const handleTitleBlur = () => {
    if (!document || document.effectiveRole === "VIEW") return;
    const trimmed = title.trim() || "Untitled Document";
    setTitle(trimmed);
    if (trimmed !== document.title) {
      saveDocument({ title: trimmed }, false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + S to create an explicit snapshot
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (document && document.effectiveRole !== "VIEW") {
          saveDocument({ content: latestContentRef.current, title }, true);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [document, saveDocument, title]);

  // Restore previous version
  const handleRestoreVersion = async (version: VersionItem) => {
    if (!document || document.effectiveRole === "VIEW") return;

    if (
      !confirm(
        `Are you sure you want to restore the snapshot "${version.title}" from ${new Date(
          version.createdAt
        ).toLocaleString()}?`
      )
    ) {
      return;
    }

    setContent(version.content);
    await saveDocument(
      {
        content: version.content,
      },
      true // also creates snapshot of restoration
    );
    setIsHistoryDrawerOpen(false);
  };

  // Export handlers
  const handleExportMarkdown = () => {
    const md = htmlToMarkdown(content);
    downloadFile(
      `${title.replace(/[^a-zA-Z0-9-_]/g, "_")}.md`,
      md,
      "text/markdown;charset=utf-8"
    );
    setIsExportMenuOpen(false);
  };

  const handleExportHtml = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1 { font-size: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin-top: 1.5rem; }
    h3 { font-size: 1.25rem; }
    code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-family: monospace; }
    blockquote { border-left: 3px solid #93c5fd; margin: 1em 0; padding-left: 1em; color: #64748b; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 2em 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${content}
</body>
</html>`;
    downloadFile(
      `${title.replace(/[^a-zA-Z0-9-_]/g, "_")}.html`,
      fullHtml,
      "text/html;charset=utf-8"
    );
    setIsExportMenuOpen(false);
  };

  const handlePrintPdf = () => {
    setIsExportMenuOpen(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const isEditable =
    document?.effectiveRole === "OWNER" || document?.effectiveRole === "EDIT";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-slate-500">
            Loading document workspace...
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !document) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200 shadow-sm">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Unable to Open Document
          </h2>
          <p className="text-xs text-slate-500 mb-6">{loadError}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Top Document Header Bar */}
      <div className="no-print sticky top-16 z-30 w-full bg-white border-b border-slate-200/90 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Back & Editable Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/"
              title="Return to Dashboard"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={title}
                disabled={!isEditable}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                placeholder="Untitled Document"
                className="w-full text-base sm:text-lg font-extrabold text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 -ml-2 focus:outline-none transition-all truncate disabled:hover:border-transparent disabled:cursor-default"
              />
            </div>
          </div>

          {/* Right: Role Pill, Save Status, & Action Buttons */}
          <div className="flex items-center flex-wrap gap-2 self-end md:self-auto">
            {/* Role Status Pill */}
            {document.effectiveRole === "OWNER" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Crown className="w-3.5 h-3.5 text-blue-600" />
                Owner
              </span>
            )}
            {document.effectiveRole === "EDIT" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                Editor
              </span>
            )}
            {document.effectiveRole === "VIEW" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                Read-Only Viewer
              </span>
            )}

            {/* Save Status Indicator */}
            {isEditable && (
              <div
                title={
                  lastSavedAt
                    ? `Last saved at ${lastSavedAt.toLocaleTimeString()}`
                    : "Auto-saves as you type"
                }
                className="flex items-center gap-1.5 text-xs text-slate-500 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200"
              >
                {saveStatus === "saving" && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span className="text-blue-600 font-medium">Saving...</span>
                  </>
                )}
                {saveStatus === "unsaved" && (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-600 font-medium">Unsaved</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-slate-600">Saved</span>
                  </>
                )}
                {saveStatus === "error" && (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-red-600 font-medium">Save error</span>
                  </>
                )}
              </div>
            )}

            {/* Save Snapshot Button */}
            {isEditable && (
              <button
                type="button"
                onClick={() =>
                  saveDocument({ content, title }, true)
                }
                title="Save Snapshot (Cmd/Ctrl + S)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition-all"
              >
                <Save className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Snapshot</span>
              </button>
            )}

            {/* Import File into Draft (Append) */}
            {isEditable && (
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                title="Import content from Word or Markdown file"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition-all"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Import File</span>
              </button>
            )}

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                title="Export Document"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export</span>
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white border border-slate-200 shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg text-left transition-colors"
                  >
                    <FileCode className="w-4 h-4 text-indigo-600" />
                    Export as Markdown (.md)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportHtml}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg text-left transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    Export as HTML (.html)
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg text-left transition-colors"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    Print / Save as PDF
                  </button>
                </div>
              )}
            </div>

            {/* Version History Button */}
            <button
              type="button"
              onClick={() => setIsHistoryDrawerOpen(true)}
              title="View Version History"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition-all"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">History</span>
              {document.versions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                  {document.versions.length}
                </span>
              )}
            </button>

            {/* Share Button (Owner only or viewer info) */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Read-Only Banner for VIEW role */}
      {document.effectiveRole === "VIEW" && (
        <div className="no-print bg-amber-50 border-b border-amber-200 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2.5 text-xs text-amber-900 font-medium">
            <Eye className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              You have <strong>view-only access</strong> to this document. Ask the
              owner ({document.owner.name}) for edit permissions to make changes.
            </span>
          </div>
        </div>
      )}

      {/* Main Document Content Canvas */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Editor
          content={content}
          onChange={handleContentChange}
          editable={isEditable}
          placeholder="Start writing or typing / to insert content..."
        />
      </main>

      {/* Version History Drawer */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Version History
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {document.versions.length} saved snapshot
                    {document.versions.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                aria-label="Close Version History"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body: Timeline */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {document.versions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No version snapshots created yet. Use the &quot;Snapshot&quot;
                  button or press Cmd+S to create one.
                </div>
              ) : (
                document.versions.map((ver, idx) => (
                  <div
                    key={ver.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 bg-white shadow-sm transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {ver.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(ver.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      {idx === 0 && (
                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                          Latest
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                          style={{
                            backgroundColor:
                              ver.savedBy?.avatarColor || "#2563EB",
                          }}
                        >
                          {ver.savedBy?.name?.[0] || "U"}
                        </div>
                        <span className="text-[11px] truncate max-w-[140px]">
                          {ver.savedBy?.name || "System"}
                        </span>
                      </div>

                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(ver)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500 text-center">
              Snapshots preserve document contents permanently.
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <ShareModal
          documentId={document.id}
          documentTitle={document.title}
          isOpen={true}
          onClose={() => setIsShareModalOpen(false)}
          onShareUpdated={fetchDocument}
        />
      )}

      {/* Import / Upload Modal */}
      {isUploadModalOpen && (
        <UploadModal
          isOpen={true}
          onClose={() => setIsUploadModalOpen(false)}
          targetDocumentId={document.id}
          defaultMode="append"
          onSuccess={(res: Record<string, unknown>) => {
            const doc = res.document as { content?: string } | undefined;
            if (doc?.content) {
              setContent(doc.content);
            }
            fetchDocument();
          }}
        />
      )}
    </div>
  );
}

/**
 * Pure HTML to Markdown converter for document exports
 */
function htmlToMarkdown(html: string): string {
  let md = html;

  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<hr\s*\/?>/gi, "---\n\n");
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, "<u>$1</u>");
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "$1\n");
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "$1\n");
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1\n\n");
  md = md.replace(/<[^>]+>/g, "");

  md = md
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");

  return md.trim();
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Helper to trigger client-side file downloads
 */
function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
