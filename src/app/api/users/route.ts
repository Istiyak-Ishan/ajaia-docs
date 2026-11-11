import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed-check";

/**
 * GET /api/users
 * Returns all users in the system for the multi-user switcher dropdown
 * and share autocomplete modal.
 */
export async function GET() {
  try {
    // Auto-seed if database is empty on fresh cloud deployment
    await ensureSeeded();

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        avatarColor: true,
        createdAt: true,
        _count: {
          select: {
            ownedDocuments: true,
            shares: true,
          },
        },
      },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch users",
        details: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

