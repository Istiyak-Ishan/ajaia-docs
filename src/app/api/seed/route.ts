import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/seed-check";
import prisma from "@/lib/prisma";

/**
 * GET /api/seed
 * Endpoint to seed or reset the database.
 * Supports query parameter: ?reset=true
 */
export async function GET(req: NextRequest) {
  try {
    const shouldReset = req.nextUrl.searchParams.get("reset") === "true";
    await ensureSeeded(shouldReset);

    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
    });
    const documents = await prisma.document.findMany({
      select: { id: true, title: true, ownerId: true },
    });

    return NextResponse.json({
      message: shouldReset
        ? "Database successfully reset and re-seeded"
        : "Database seed check completed",
      userCount: users.length,
      documentCount: documents.length,
      users,
      documents,
    });
  } catch (error) {
    console.error("GET /api/seed error:", error);
    return NextResponse.json(
      {
        error: "Failed to seed database",
        details: error instanceof Error ? error.message : "Internal Error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seed
 * Allows programmatic trigger to seed the database
 */
export async function POST(req: NextRequest) {
  return GET(req);
}

