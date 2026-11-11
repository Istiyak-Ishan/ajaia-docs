"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser, User } from "@/context/UserContext";
import {
  X,
  Share2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Crown,
  Link2,
  Check,
  Lock,
  Edit3,
  Eye,
  ChevronDown,
} from "lucide-react";

interface ShareModalProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onShareUpdated?: () => void;
}

interface ShareItem {
  id: string;
  documentId: string;
  userId: string;
  permission: "VIEW" | "EDIT";
  user: User;
}

interface DocumentShareData {
  id: string;
  title: string;
  effectiveRole: "OWNER" | "EDIT" | "VIEW";
  owner: User;
  shares: ShareItem[];
}

export function ShareModal({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  onShareUpdated,
}: ShareModalProps) {
  const { currentUser, users, fetchWithUser } = useUser();

  const [docData, setDocData] = useState<DocumentShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [permissionInput, setPermissionInput] = useState<"VIEW" | "EDIT">("EDIT");
  const [submitting, setSubmitting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load document shares and permissions
  const loadDocumentDetails = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithUser(`/api/documents/${documentId}`);
      if (!res.ok) {
        throw new Error("Failed to load document shares");
      }
      const data = await res.json();
      setDocData({
        id: data.id,
        title: data.title,
        effectiveRole: data.effectiveRole,
        owner: data.owner,
        shares: data.shares || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading shares");
    } finally {
      setLoading(false);
    }
  }, [documentId, fetchWithUser]);

  useEffect(() => {
    if (isOpen) {
      loadDocumentDetails();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, loadDocumentDetails, onClose]);

  if (!isOpen) return null;

  const isOwner = docData?.effectiveRole === "OWNER";

  // Copy Document Link Handler
  const handleCopyLink = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/documents/${documentId}`
        : `/documents/${documentId}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Add / Grant Share Handler
  const handleGrantShare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetchWithUser(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim(),
          permission: permissionInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update share permission");
      }

      setSuccess(`Access granted to ${emailInput.trim()} (${permissionInput === "EDIT" ? "Can Edit" : "View Only"})`);
      setEmailInput("");

      // Refresh share details
      await loadDocumentDetails();
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share document");
    } finally {
      setSubmitting(false);
    }
  };

  // Update existing share permission in-place
  const handleUpdatePermission = async (
    share: ShareItem,
    newPermission: "VIEW" | "EDIT"
  ) => {
    if (share.permission === newPermission) return;

    setUpdatingUserId(share.userId);
    setError(null);

    try {
      const res = await fetchWithUser(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: share.user.email,
          permission: newPermission,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update permission");
      }

      // Optimistically update local state
      setDocData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          shares: prev.shares.map((s) =>
            s.userId === share.userId ? { ...s, permission: newPermission } : s
          ),
        };
      });

      setSuccess(`Updated ${share.user.name}'s permission to ${newPermission === "EDIT" ? "Can Edit" : "View Only"}`);
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Revoke Share Handler
  const handleRevoke = async (userId: string, userName: string) => {
    if (!confirm(`Revoke document access for ${userName}?`)) return;

    try {
      const res = await fetchWithUser(
        `/api/documents/${documentId}/share?userId=${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke access");
      }

      setDocData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          shares: prev.shares.filter((s) => s.userId !== userId),
        };
      });

      setSuccess(`Access revoked for ${userName}`);
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error revoking share");
    }
  };

  // Quick-select candidates: Seeded teammates not already shared and not the owner
  const quickSelectTeammates = users.filter((u) => {
    const isDocOwner =
      u.email.toLowerCase() === docData?.owner.email.toLowerCase();
    const isCurrentActive =
      u.email.toLowerCase() === currentUser?.email.toLowerCase();
    const isAlreadyShared = docData?.shares.some(
      (s) => s.user.email.toLowerCase() === u.email.toLowerCase()
    );
    return !isDocOwner && !isCurrentActive && !isAlreadyShared;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Share & Permissions
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-xs font-medium">
                {documentTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Share Modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Copy Link Bar */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-1.5 rounded-lg bg-white text-slate-500 border border-slate-200 shadow-xs">
              <Link2 className="w-4 h-4" />
            </div>
            <input
              type="text"
              readOnly
              value={
                typeof window !== "undefined"
                  ? `${window.location.origin}/documents/${documentId}`
                  : `/documents/${documentId}`
              }
              className="flex-1 bg-transparent text-xs text-slate-600 font-mono truncate focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-xs ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                "Copy Link"
              )}
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* 1. Document Owner Display */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Document Owner
            </h4>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs flex-shrink-0"
                  style={{
                    backgroundColor: docData?.owner.avatarColor || "#2563EB",
                  }}
                >
                  {docData?.owner.name
                    ? docData.owner.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "O"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {docData?.owner.name}
                    {docData?.owner.email.toLowerCase() ===
                      currentUser?.email.toLowerCase() && " (You)"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {docData?.owner.email}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Crown className="w-3 h-3 text-blue-600" />
                Owner
              </span>
            </div>
          </div>

          {/* 2. Grant Access Form (Owner Only) */}
          {isOwner ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Grant Access to Teammate
                </h4>
                <span className="text-[11px] text-slate-400">
                  Instant simulated sharing
                </span>
              </div>

              {/* Quick-select pills for seeded reviewers */}
              {quickSelectTeammates.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">
                    1-Click test teammates:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {quickSelectTeammates.map((teammate) => (
                      <button
                        key={teammate.id}
                        type="button"
                        onClick={() => setEmailInput(teammate.email)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          emailInput.toLowerCase() === teammate.email.toLowerCase()
                            ? "bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20"
                            : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: teammate.avatarColor }}
                        />
                        <span>{teammate.name}</span>
                        <span className="text-[10px] text-slate-400">
                          ({teammate.email})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Form */}
              <form onSubmit={handleGrantShare} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="Enter email or click teammate above..."
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />
                  <select
                    value={permissionInput}
                    onChange={(e) =>
                      setPermissionInput(e.target.value as "VIEW" | "EDIT")
                    }
                    className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium text-slate-700"
                  >
                    <option value="EDIT">Can edit</option>
                    <option value="VIEW">View only</option>
                  </select>
                  <button
                    type="submit"
                    disabled={!emailInput.trim() || submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-xs transition-all flex-shrink-0"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    Share
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Non-owner notice banner */
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Permissions Managed by Owner
                </p>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  You are viewing this document with{" "}
                  <strong>
                    {docData?.effectiveRole === "EDIT"
                      ? "Edit Permissions"
                      : "View-Only Access"}
                  </strong>
                  . Only the document owner ({docData?.owner.name}) can add or
                  modify sharing permissions.
                </p>
              </div>
            </div>
          )}

          {/* 3. Collaborators List with Role Modification & Removal */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Collaborators with Access (
              {docData?.shares.length || 0})
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : docData?.shares.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 italic">
                This document is private and not shared with anyone else yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {docData?.shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs flex-shrink-0"
                        style={{
                          backgroundColor:
                            share.user.avatarColor || "#059669",
                        }}
                      >
                        {share.user.name
                          ? share.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()
                          : "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {share.user.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {share.user.email}
                        </p>
                      </div>
                    </div>

                    {/* Actions: In-place Role Selector & Remove */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isOwner ? (
                        <>
                          <div className="relative">
                            <select
                              value={share.permission}
                              disabled={updatingUserId === share.userId}
                              onChange={(e) =>
                                handleUpdatePermission(
                                  share,
                                  e.target.value as "VIEW" | "EDIT"
                                )
                              }
                              className={`text-[11px] font-semibold pl-2.5 pr-7 py-1 rounded-lg border appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer ${
                                share.permission === "EDIT"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              <option value="EDIT">Can edit</option>
                              <option value="VIEW">View only</option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleRevoke(share.userId, share.user.name)
                            }
                            title="Revoke access"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        /* Read-only collaborator pill */
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                            share.permission === "EDIT"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {share.permission === "EDIT" ? (
                            <>
                              <Edit3 className="w-3 h-3" />
                              Can edit
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              View only
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/70">
          <span className="text-[11px] text-slate-500">
            {isOwner ? "Owner controls active" : "View-only access active"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
