"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { UploadModal } from "@/components/UploadModal";
import { ShareModal } from "@/components/ShareModal";
import { useUser } from "@/context/UserContext";
import {
  Plus,
  UploadCloud,
  Search,
  FileText,
  Clock,
  Trash2,
  Share2,
  Users,
  Eye,
  Edit3,
  Loader2,
  FileType,
  Sparkles,
  ArrowRight,
  FolderOpen,
} from "lucide-react";

interface DocumentItem {
  id: string;
  title: string;
  content: string;
  sourceFileName: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  currentUserPermission?: string;
  owner: {
    id: string;
    email: string;
    name: string;
    avatarColor: string;
  };
  shares: Array<{
    id: string;
    userId: string;
    permission: "VIEW" | "EDIT";
    user: {
      id: string;
      email: string;
      name: string;
      avatarColor: string;
    };
  }>;
  _count?: {
    versions?: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, fetchWithUser } = useUser();

  const [ownedDocs, setOwnedDocs] = useState<DocumentItem[]>([]);
  const [sharedDocs, setSharedDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [sharingDoc, setSharingDoc] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetchWithUser("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setOwnedDocs(data.owned || []);
        setSharedDocs(data.shared || []);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchWithUser]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Create new blank document
  const handleCreateNewDoc = async () => {
    setCreating(true);
    try {
      const res = await fetchWithUser("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Document",
          content: "<p></p>",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create document");
      }

      const newDoc = await res.json();
      router.push(`/documents/${newDoc.id}`);
    } catch (err) {
      console.error("Error creating document:", err);
      alert("Could not create document. Please try again.");
      setCreating(false);
    }
  };

  // Delete document
  const handleDeleteDoc = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      return;
    }

    try {
      const res = await fetchWithUser(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete document");
      }

      setOwnedDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting document");
    }
  };

  // Format relative timestamp
  const formatTimeAgo = (isoDate: string) => {
    const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(isoDate).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Extract plain text snippet
  const extractSnippet = (html: string) => {
    if (!html) return "No content in this document yet.";
    const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return plain.length > 120 ? plain.slice(0, 120) + "..." : plain;
  };

  // Filter documents by search
  const filteredOwned = ownedDocs.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredShared = sharedDocs.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Collaborative Document Studio
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back,{" "}
              <span className="text-blue-600">
                {currentUser?.name || "Reviewer"}
              </span>
            </h1>
            <p className="text-sm text-slate-500 max-w-xl">
              Create, edit, and share documents with role-based permissions
              (Owner, Editor, Viewer). Switch test accounts anytime from the top bar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all hover:border-slate-400"
            >
              <UploadCloud className="w-4 h-4 text-slate-500" />
              Upload File (.txt, .md, .docx)
            </button>

            <button
              type="button"
              onClick={handleCreateNewDoc}
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 stroke-[2.5]" />
              )}
              New Blank Document
            </button>
          </div>
        </div>

        {/* Search & Statistics Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 self-end sm:self-center">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <strong>{ownedDocs.length}</strong> Owned
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <strong>{sharedDocs.length}</strong> Shared with you
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs font-medium">Loading documents...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* SECTION 1: Owned by Me */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    Owned by Me ({filteredOwned.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Documents you created and administer
                </span>
              </div>

              {filteredOwned.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      {searchQuery
                        ? "No owned documents match your search"
                        : "You don't own any documents yet"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Create a new blank document or upload a Word / Markdown file
                      to start writing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateNewDoc}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create First Document
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredOwned.map((doc) => (
                    <div
                      key={doc.id}
                      className="group bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Badges & Actions row */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            Owner
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setSharingDoc({ id: doc.id, title: doc.title })
                              }
                              title="Manage Sharing & Permissions"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteDoc(doc.id, doc.title)
                              }
                              title="Delete Document"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <Link
                          href={`/documents/${doc.id}`}
                          className="block group-hover:text-blue-600 transition-colors"
                        >
                          <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                            {doc.title}
                          </h3>
                        </Link>

                        {/* Content Snippet */}
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                          {extractSnippet(doc.content)}
                        </p>

                        {/* Source File Badge if imported */}
                        {doc.sourceFileName && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-medium">
                            <FileType className="w-3 h-3 text-slate-500" />
                            <span className="truncate max-w-[200px]">
                              Imported from {doc.sourceFileName}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Footer: Collaborators & Timestamp */}
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        {/* Collaborator Avatars */}
                        <div className="flex items-center gap-1.5">
                          {doc.shares.length > 0 ? (
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {doc.shares.map((share) => (
                                <div
                                  key={share.id}
                                  title={`${share.user.name} (${
                                    share.permission === "EDIT"
                                      ? "Can Edit"
                                      : "View Only"
                                  })`}
                                  className="w-5 h-5 rounded-full ring-2 ring-white flex items-center justify-center text-white text-[9px] font-bold"
                                  style={{
                                    backgroundColor:
                                      share.user.avatarColor || "#059669",
                                  }}
                                >
                                  {share.user.name[0]}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">
                              Private (Only you)
                            </span>
                          )}

                          {doc.shares.length > 0 && (
                            <span className="text-[10px] text-slate-400">
                              {doc.shares.length} collaborator
                              {doc.shares.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(doc.updatedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 2: Shared with Me */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                    <Users className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    Shared with Me ({filteredShared.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Documents authored by other team members
                </span>
              </div>

              {filteredShared.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-800">
                    {searchQuery
                      ? "No shared documents match your search"
                      : "No documents shared with you yet"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Switch to Alex or Sam using the account switcher above to see
                    documents shared across accounts.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredShared.map((doc) => {
                    const isEditor = doc.currentUserPermission === "EDIT";

                    return (
                      <div
                        key={doc.id}
                        className="group bg-white rounded-2xl border border-slate-200/90 hover:border-purple-400 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Role Badge row */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isEditor
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {isEditor ? (
                                <>
                                  <Edit3 className="w-3 h-3" />
                                  Can Edit
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" />
                                  View Only
                                </>
                              )}
                            </span>

                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                                style={{
                                  backgroundColor:
                                    doc.owner.avatarColor || "#2563EB",
                                }}
                              >
                                {doc.owner.name[0]}
                              </div>
                              <span className="truncate max-w-[120px]">
                                {doc.owner.name}
                              </span>
                            </div>
                          </div>

                          {/* Title */}
                          <Link
                            href={`/documents/${doc.id}`}
                            className="block group-hover:text-purple-600 transition-colors"
                          >
                            <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                              {doc.title}
                            </h3>
                          </Link>

                          {/* Snippet */}
                          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                            {extractSnippet(doc.content)}
                          </p>

                          {/* Source File Badge if imported */}
                          {doc.sourceFileName && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-medium">
                              <FileType className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[200px]">
                                {doc.sourceFileName}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Footer: Timestamp & Action */}
                        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(doc.updatedAt)}
                          </span>

                          <Link
                            href={`/documents/${doc.id}`}
                            className="inline-flex items-center gap-1 font-semibold text-purple-600 hover:text-purple-700 text-xs"
                          >
                            Open Doc
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={(docData) => {
          fetchDocuments();
          const docId = (docData as Record<string, unknown>)?.id as string | undefined;
          if (docId) {
            router.push(`/documents/${docId}`);
          }
        }}
      />

      {/* Share Modal */}
      {sharingDoc && (
        <ShareModal
          documentId={sharingDoc.id}
          documentTitle={sharingDoc.title}
          isOpen={true}
          onClose={() => setSharingDoc(null)}
          onShareUpdated={() => fetchDocuments()}
        />
      )}
    </div>
  );
}
