import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, getDocumentAccess, getAvatarColorForEmail } from "@/lib/auth";
import { shareDocumentSchema } from "@/lib/validations";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * POST /api/documents/[id]/share
 * Grants or updates sharing permissions for a document.
 * Only the OWNER is authorized to manage shares.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Could not resolve current user" },
        { status: 401 }
      );
    }

    // Verify document existence
    const document = await prisma.document.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check ownership
    const access = await getDocumentAccess(id, user.id);
    if (access !== "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Only the document owner can manage shares" },
        { status: 403 }
      );
    }

    // Validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parseResult = shareDocumentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { email, permission } = parseResult.data;

    // Prevent sharing with oneself
    if (email.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot share a document with yourself" },
        { status: 400 }
      );
    }

    // Find or auto-provision recipient user
    let recipient = await prisma.user.findUnique({
      where: { email },
    });

    if (!recipient) {
      const namePart = email.split("@")[0];
      const formattedName =
        namePart.charAt(0).toUpperCase() + namePart.slice(1);

      recipient = await prisma.user.create({
        data: {
          email,
          name: formattedName,
          avatarColor: getAvatarColorForEmail(email),
        },
      });
    }

    // Upsert DocumentShare record
    const share = await prisma.documentShare.upsert({
      where: {
        documentId_userId: {
          documentId: id,
          userId: recipient.id,
        },
      },
      update: {
        permission,
      },
      create: {
        documentId: id,
        userId: recipient.id,
        permission,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarColor: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Share permission updated successfully",
        share,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/documents/[id]/share error:", error);
    return NextResponse.json(
      {
        error: "Failed to update share permission",
        details: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]/share?userId=...
 * Revokes a team member's access to a document.
 * Only the OWNER is authorized to remove shares.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Could not resolve current user" },
        { status: 401 }
      );
    }

    const document = await prisma.document.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const access = await getDocumentAccess(id, user.id);
    if (access !== "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Only the document owner can remove shares" },
        { status: 403 }
      );
    }

    const targetUserId = req.nextUrl.searchParams.get("userId");
    if (!targetUserId) {
      return NextResponse.json(
        { error: "Missing required query parameter: userId" },
        { status: 400 }
      );
    }

    await prisma.documentShare.deleteMany({
      where: {
        documentId: id,
        userId: targetUserId,
      },
    });

    return NextResponse.json(
      { message: "Access successfully revoked", userId: targetUserId },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/documents/[id]/share error:", error);
    return NextResponse.json(
      {
        error: "Failed to revoke share access",
        details: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

