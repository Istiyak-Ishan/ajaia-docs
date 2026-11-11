import { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";

export const DEFAULT_USER_EMAIL = "istiyakishan7@gmail.com";
export const USER_COOKIE_NAME = "ajaia_user_email";
export const USER_HEADER_NAME = "x-user-email";

export type DocumentRole = "OWNER" | "EDIT" | "VIEW";

/**
 * Generate a consistent avatar color for any email address
 */
export function getAvatarColorForEmail(email: string): string {
  const palette = [
    "#2563EB", // Blue
    "#059669", // Emerald
    "#7C3AED", // Violet
    "#D97706", // Amber
    "#DC2626", // Red
    "#0891B2", // Cyan
    "#4F46E5", // Indigo
    "#BE185D", // Pink
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Resolves the currently active user based on:
 * 1. `x-user-email` HTTP header
 * 2. `ajaia_user_email` cookie
 * 3. Fallback default: `istiyakishan7@gmail.com`
 *
 * If the user does not exist in the database, it creates a record on-demand
 * so that simulated multi-user testing never fails with an unseeded user.
 */
export async function getCurrentUser(req?: NextRequest): Promise<User | null> {
  let email: string | undefined;

  if (req) {
    email =
      req.headers.get(USER_HEADER_NAME) ||
      req.cookies.get(USER_COOKIE_NAME)?.value ||
      undefined;
  } else {
    try {
      const headerList = headers();
      const cookieStore = cookies();
      email =
        headerList.get(USER_HEADER_NAME) ||
        cookieStore.get(USER_COOKIE_NAME)?.value ||
        undefined;
    } catch {
      // Catch when called outside of standard request context
      email = undefined;
    }
  }

  const targetEmail = (email && email.trim().toLowerCase()) || DEFAULT_USER_EMAIL;

  try {
    let user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!user) {
      // Auto-provision candidate default or newly switched user
      const namePart = targetEmail.split("@")[0];
      const formattedName =
        targetEmail === DEFAULT_USER_EMAIL
          ? "Istiyak Hossain Ishan"
          : namePart.charAt(0).toUpperCase() + namePart.slice(1);

      user = await prisma.user.create({
        data: {
          email: targetEmail,
          name: formattedName,
          avatarColor:
            targetEmail === DEFAULT_USER_EMAIL
              ? "#2563EB"
              : getAvatarColorForEmail(targetEmail),
        },
      });
    }

    return user;
  } catch (error) {
    console.error("Error resolving current user:", error);
    return null;
  }
}

/**
 * Determines the effective access permission for a given user on a document.
 * Returns:
 * - "OWNER" if the user created and owns the document
 * - "EDIT"  if the document is shared with the user with EDIT permissions
 * - "VIEW"  if the document is shared with the user with VIEW permissions
 * - null    if the document does not exist or the user has no access rights
 */
export async function getDocumentAccess(
  documentId: string,
  userId: string
): Promise<DocumentRole | null> {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        ownerId: true,
        shares: {
          where: { userId },
          select: { permission: true },
        },
      },
    });

    if (!document) {
      return null;
    }

    if (document.ownerId === userId) {
      return "OWNER";
    }

    if (document.shares.length > 0) {
      const perm = document.shares[0].permission.toUpperCase();
      if (perm === "EDIT") return "EDIT";
      if (perm === "VIEW") return "VIEW";
    }

    return null;
  } catch (error) {
    console.error("Error checking document access:", error);
    return null;
  }
}

