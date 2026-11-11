import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createDocumentSchema } from "@/lib/validations";
import { ensureSeeded } from "@/lib/seed-check";

/**
 * GET /api/documents
 * Returns owned and shared documents for the currently authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    // Auto-seed if database is empty on fresh cloud deployment
    await ensureSeeded();

    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Could not resolve current user" },
        { status: 401 }
      );
    }

    // Fetch documents owned by the active user
    const owned = await prisma.document.findMany({
      where: { ownerId: user.id },
      include: {
        owner: {
          select: { id: true, email: true, name: true, avatarColor: true },
        },
        shares: {
          include: {
            user: {
              select: { id: true, email: true, name: true, avatarColor: true },
            },
          },
        },
        _count: {
          select: { versions: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Fetch documents shared with the active user
    const sharedShares = await prisma.documentShare.findMany({
      where: { userId: user.id },
      include: {
        document: {
          include: {
            owner: {
              select: { id: true, email: true, name: true, avatarColor: true },
            },
            shares: {
              include: {
                user: {
                  select: { id: true, email: true, name: true, avatarColor: true },
                },
              },
            },
            _count: {
              select: { versions: true },
            },
          },
        },
      },
      orderBy: { document: { updatedAt: "desc" } },
    });

    const shared = sharedShares.map((share) => ({
      ...share.document,
      currentUserPermission: share.permission,
    }));

    return NextResponse.json({ owned, shared }, { status: 200 });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch documents",
        details: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents
 * Creates a new document owned by the currently active user,
 * along with an initial version snapshot.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Could not resolve current user" },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parseResult = createDocumentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { title, content, sourceFileName } = parseResult.data;
    const documentContent = content ?? "";

    const newDocument = await prisma.document.create({
      data: {
        title,
        content: documentContent,
        sourceFileName: sourceFileName ?? null,
        ownerId: user.id,
        versions: {
          create: [
            {
              title: `${title} (Initial Snapshot)`,
              content: documentContent,
              savedById: user.id,
            },
          ],
        },
      },
      include: {
        owner: {
          select: { id: true, email: true, name: true, avatarColor: true },
        },
        shares: {
          include: {
            user: {
              select: { id: true, email: true, name: true, avatarColor: true },
            },
          },
        },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json(
      {
        error: "Failed to create document",
        details: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

