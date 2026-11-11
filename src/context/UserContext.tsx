"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  createdAt?: string | Date;
  _count?: {
    ownedDocuments?: number;
    shares?: number;
  };
}

interface UserContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  switchUser: (email: string) => Promise<void>;
  fetchWithUser: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  refreshUsers: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const DEFAULT_EMAIL = "istiyakishan7@gmail.com";
const COOKIE_NAME = "ajaia_user_email";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Authenticated fetch wrapper that attaches x-user-email header
  const fetchWithUser = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const email = currentUser?.email || getCookie(COOKIE_NAME) || DEFAULT_EMAIL;
      const headers = new Headers(init?.headers || {});
      if (!headers.has("x-user-email")) {
        headers.set("x-user-email", email);
      }
      return fetch(input, {
        ...init,
        headers,
      });
    },
    [currentUser]
  );

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data: User[] = await res.json();
        setUsers(data);
        return data;
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
    return [];
  }, []);

  useEffect(() => {
    let active = true;

    async function initUser() {
      setLoading(true);
      const userList = await fetchUsers();
      if (!active) return;

      const storedEmail = getCookie(COOKIE_NAME) || DEFAULT_EMAIL;
      let matched = userList.find(
        (u) => u.email.toLowerCase() === storedEmail.toLowerCase()
      );

      // If user isn't found in list, fall back to default or first user
      if (!matched) {
        matched =
          userList.find(
            (u) => u.email.toLowerCase() === DEFAULT_EMAIL.toLowerCase()
          ) || userList[0];
      }

      if (matched) {
        setCurrentUser(matched);
        setCookie(COOKIE_NAME, matched.email);
      }
      setLoading(false);
    }

    initUser();

    return () => {
      active = false;
    };
  }, [fetchUsers]);

  const switchUser = async (email: string) => {
    setCookie(COOKIE_NAME, email);

    // Look for local match or refetch
    let target = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!target) {
      const updatedList = await fetchUsers();
      target = updatedList.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
    }

    if (target) {
      setCurrentUser(target);
    } else {
      // Temporary fallback user state while page refreshes
      const namePart = email.split("@")[0];
      setCurrentUser({
        id: "temp-" + Date.now(),
        email,
        name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
        avatarColor: "#2563EB",
      });
    }

    // Refresh current route to trigger server components & client re-renders
    router.refresh();
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        users,
        loading,
        switchUser,
        fetchWithUser,
        refreshUsers: async () => {
          await fetchUsers();
        },
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

