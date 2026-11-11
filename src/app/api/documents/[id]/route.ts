import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, getDocumentAccess } from "@/lib/auth";
import { updateDocumentSchema } from "@/lib/validations";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * GET /api/documents/[id]
 * Retrieves a document by ID with permission checks.
 * Returns the document, owner, shares, versions, and caller's effectiveRole.
 */
export async function GET(req: NextRequest, context: RouteContext) {
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
          include: {
            savedBy: {
              select: { id: true, email: true, name: true, avatarColor: true },
            },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const effectiveRole = await getDocumentAccess(id, user.id);
    if (!effectiveRole) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this document" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        ...document,
        effectiveRole,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/documents/[id] error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch document",
        details: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/documents/[id]
 * Updates document title and/or content.
 * Allowed for: OWNER, EDIT.
 * Forbidden for: VIEW, null.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
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
    const existingDoc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, title: true, content: true },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify permission
    const access = await getDocumentAccess(id, user.id);
    if (!access) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to access this document" },
        { status: 403 }
      );
    }

    if (access === "VIEW") {
      return NextResponse.json(
        { error: "Forbidden: You only have view-only access to this document" },
        { status: 403 }
      );
    }

    // Validate update payload
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parseResult = updateDocumentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { title, content, createVersionSnapshot } = parseResult.data;

    // Build update data
    const updateData: { title?: string; content?: string } = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: updateData,
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
          include: {
            savedBy: {
              select: { id: true, email: true, name: true, avatarColor: true },
            },
          },
        },
      },
    });

    // Optionally create a version snapshot
    if (createVersionSnapshot) {
      await prisma.documentVersion.create({
        data: {
          documentId: id,
          title: updatedDocument.title,
          content: updatedDocument.content,
          savedById: user.id,
        },
      });
    }

    return NextResponse.json(
      {
        ...updatedDocument,
        effectiveRole: access,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH /api/documents/[id] error:", error);
    return NextResponse.json(
      {
        error: "Failed to update document",
        details: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]
 * Deletes a document.
 * Only the OWNER is authorized to delete a document.
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

    const existingDoc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const access = await getDocumentAccess(id, user.id);
    if (access !== "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Only the document owner can delete this document" },
        { status: 403 }
      );
    }

    // Cascade delete handles DocumentShare and DocumentVersion
    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Document deleted successfully", id },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/documents/[id] error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete document",
        details: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

