"use client";

import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import {
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileCode,
  FileType,
} from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDocumentId?: string;
  defaultMode?: "new" | "append";
  onSuccess?: (document: Record<string, unknown>) => void;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [".txt", ".md", ".docx"];
const SUPPORTED_MESSAGE = "Supported formats are .txt, .md, and .docx (max 5MB).";

export function UploadModal({
  isOpen,
  onClose,
  targetDocumentId,
  defaultMode = "new",
  onSuccess,
}: UploadModalProps) {
  const router = useRouter();
  const { fetchWithUser } = useUser();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"new" | "append">(defaultMode);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateAndSetFile = (file: File) => {
    setError(null);

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(SUPPORTED_MESSAGE);
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError(SUPPORTED_MESSAGE);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", mode);
      if (targetDocumentId && mode === "append") {
        formData.append("targetDocumentId", targetDocumentId);
      }

      const res = await fetchWithUser("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process document upload.");
      }

      // Close modal and navigate/execute callback
      onClose();
      if (mode === "new") {
        const docId = data.id || data.document?.id;
        if (docId) {
          router.push(`/documents/${docId}`);
        }
      }
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : SUPPORTED_MESSAGE);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "md") return <FileCode className="w-8 h-8 text-indigo-600" />;
    if (ext === "docx") return <FileType className="w-8 h-8 text-blue-600" />;
    return <FileText className="w-8 h-8 text-slate-600" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Import Document
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload local files to parse and convert into editable rich text.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Supported Format Badge */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-800 text-xs font-medium">
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Supported: .txt, .md, .docx (Max 5MB)
            </span>
            <span className="text-[11px] text-blue-600/80 bg-blue-100/60 px-2 py-0.5 rounded-md">
              Fast Parsing
            </span>
          </div>

          {/* Mode Selector (if targetDocumentId provided) */}
          {targetDocumentId && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-700">
              <button
                type="button"
                onClick={() => setMode("append")}
                className={`py-1.5 rounded-lg transition-all ${
                  mode === "append"
                    ? "bg-white text-slate-900 font-semibold shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Append to Current Doc
              </button>
              <button
                type="button"
                onClick={() => setMode("new")}
                className={`py-1.5 rounded-lg transition-all ${
                  mode === "new"
                    ? "bg-white text-slate-900 font-semibold shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Create as New Doc
              </button>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
                : "border-slate-300 hover:border-blue-400 bg-slate-50/40 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="h-14 w-14 rounded-2xl bg-blue-100/60 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>

            <p className="text-sm font-semibold text-slate-800">
              Click to browse or drag & drop your file
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Plain text (.txt), Markdown (.md), Word Document (.docx)
            </p>
          </div>

          {/* Selected File Details */}
          {selectedFile && (
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in duration-150">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                  {getFileIcon(selectedFile.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md shadow-blue-500/25 transition-all"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Parsing & Importing...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                {mode === "append" ? "Append to Document" : "Import & Open"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
