"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useUser, User } from "@/context/UserContext";
import {
  FileText,
  ChevronDown,
  Check,
  ShieldCheck,
  UserCheck,
  Eye,
  Edit3,
  Crown,
} from "lucide-react";

export function Navbar() {
  const { currentUser, users, switchUser, loading } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRoleHint = (email: string) => {
    switch (email.toLowerCase()) {
      case "istiyakishan7@gmail.com":
        return {
          role: "Owner / Candidate",
          desc: "Full permissions on Q4 Roadmap",
          badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
          icon: Crown,
        };
      case "alex@ajaia.com":
        return {
          role: "Editor Collaborator",
          desc: "Edit on Roadmap, Owner of Sprint Notes",
          badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
          icon: Edit3,
        };
      case "sam@ajaia.com":
        return {
          role: "Viewer Collaborator",
          desc: "View on Roadmap, Owner of Onboarding",
          badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
          icon: Eye,
        };
      default:
        return {
          role: "Teammate",
          desc: "Custom test account",
          badgeColor: "bg-gray-100 text-gray-800 border-gray-200",
          icon: UserCheck,
        };
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-slate-900 tracking-tight">
                  Ajaia
                </span>
                <span className="font-semibold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Docs
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                AI-Native Document Workspace
              </span>
            </div>
          </Link>
        </div>

        {/* Reviewer Account Switcher */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Reviewer Mode
            </span>

            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              disabled={loading}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/80 transition-all text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              aria-label="Switch Test User"
            >
              {/* Avatar circle */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-inner"
                style={{
                  backgroundColor: currentUser?.avatarColor || "#2563EB",
                }}
              >
                {currentUser?.name
                  ? currentUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "U"}
              </div>

              {/* User details */}
              <div className="hidden md:flex flex-col pr-1">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser?.name || "Loading..."}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight">
                  {currentUser?.email || "Resolving..."}
                </span>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Switcher Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">
                  Switch Active Reviewer Account
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click any account below to instantly switch session context and
                  test Owner, Editor, and Viewer permission boundaries.
                </p>
              </div>

              <div className="mt-1 space-y-1">
                {users.map((user: User) => {
                  const isSelected =
                    currentUser?.email.toLowerCase() ===
                    user.email.toLowerCase();
                  const hint = getRoleHint(user.email);
                  const IconComponent = hint.icon;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        switchUser(user.email);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all text-left ${
                        isSelected
                          ? "bg-blue-50/70 border border-blue-200/80"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm mt-0.5"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {user.name}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${hint.badgeColor}`}
                          >
                            <IconComponent className="w-3 h-3" />
                            {hint.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {user.email}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 italic">
                          {hint.desc}
                        </p>
                      </div>

                      {/* Checkmark */}
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-1">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 px-3 py-1 bg-slate-50/70 rounded-xl text-[11px] text-slate-500 flex items-center justify-between">
                <span>Active Cookie:</span>
                <code className="font-mono text-[10px] bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-700">
                  ajaia_user_email
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

