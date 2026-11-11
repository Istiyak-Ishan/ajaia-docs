import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import type { User, Document } from "@prisma/client";
import { getDocumentAccess } from "@/lib/auth";
import {
  createDocumentSchema,
  updateDocumentSchema,
  shareDocumentSchema,
} from "@/lib/validations";
import {
  GET as getDocumentByIdRoute,
  PATCH as patchDocumentRoute,
  DELETE as deleteDocumentRoute,
} from "@/app/api/documents/[id]/route";
import {
  POST as shareDocumentRoute,
  DELETE as deleteShareRoute,
} from "@/app/api/documents/[id]/share/route";

describe("Document Access Control & Permission Enforcement (src/lib/auth.ts & APIs)", () => {
  let ownerUser: User;
  let editorUser: User;
  let viewerUser: User;
  let strangerUser: User;
  let testDoc: Document;

  beforeAll(async () => {
    // Clean and initialize dedicated test fixture
    await prisma.documentVersion.deleteMany({});
    await prisma.documentShare.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.user.deleteMany({});

    ownerUser = await prisma.user.create({
      data: {
        email: "istiyakishan7@gmail.com",
        name: "Istiyak Hossain Ishan",
        avatarColor: "#2563EB",
      },
    });

    editorUser = await prisma.user.create({
      data: {
        email: "alex@ajaia.com",
        name: "Alex Rivera",
        avatarColor: "#059669",
      },
    });

    viewerUser = await prisma.user.create({
      data: {
        email: "sam@ajaia.com",
        name: "Sam Chen",
        avatarColor: "#7C3AED",
      },
    });

    strangerUser = await prisma.user.create({
      data: {
        email: "unauthorized@external.com",
        name: "External Stranger",
        avatarColor: "#94A3B8",
      },
    });

    testDoc = await prisma.document.create({
      data: {
        title: "Access Control Benchmark Document",
        content: "<h1>Benchmark Spec</h1><p>Confidential product data.</p>",
        ownerId: ownerUser.id,
        shares: {
          create: [
            { userId: editorUser.id, permission: "EDIT" },
            { userId: viewerUser.id, permission: "VIEW" },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("1. Zod Validation Schemas", () => {
    it("createDocumentSchema applies default title and validates boundaries", () => {
      // Empty input falls back to default title
      const defaultCheck = createDocumentSchema.safeParse({});
      expect(defaultCheck.success).toBe(true);
      if (defaultCheck.success) {
        expect(defaultCheck.data.title).toBe("Untitled Document");
        expect(defaultCheck.data.content).toBe("");
      }

      // Rejects overlong title (>150 chars)
      const overlongCheck = createDocumentSchema.safeParse({
        title: "A".repeat(151),
      });
      expect(overlongCheck.success).toBe(false);
    });

    it("updateDocumentSchema validates title updates and snapshot flag", () => {
      const validUpdate = updateDocumentSchema.safeParse({
        title: "Refined Architecture Title",
        content: "<p>Updated draft content</p>",
        createVersionSnapshot: true,
      });
      expect(validUpdate.success).toBe(true);
    });

    it("shareDocumentSchema validates email format and permission values", () => {
      const validShare = shareDocumentSchema.safeParse({
        email: "teammate@ajaia.com",
        permission: "EDIT",
      });
      expect(validShare.success).toBe(true);

      const invalidEmail = shareDocumentSchema.safeParse({
        email: "invalid-email-string",
        permission: "VIEW",
      });
      expect(invalidEmail.success).toBe(false);

      const invalidPerm = shareDocumentSchema.safeParse({
        email: "teammate@ajaia.com",
        permission: "SUPERUSER",
      });
      expect(invalidPerm.success).toBe(false);
    });
  });

  describe("2. getDocumentAccess Helper Evaluation", () => {
    it("returns 'OWNER' for the document author", async () => {
      const role = await getDocumentAccess(testDoc.id, ownerUser.id);
      expect(role).toBe("OWNER");
    });

    it("returns 'EDIT' for an authorized collaborator", async () => {
      const role = await getDocumentAccess(testDoc.id, editorUser.id);
      expect(role).toBe("EDIT");
    });

    it("returns 'VIEW' for a read-only collaborator", async () => {
      const role = await getDocumentAccess(testDoc.id, viewerUser.id);
      expect(role).toBe("VIEW");
    });

    it("returns null for an unshared / unauthorized user", async () => {
      const role = await getDocumentAccess(testDoc.id, strangerUser.id);
      expect(role).toBeNull();
    });

    it("returns null for non-existent document ID", async () => {
      const role = await getDocumentAccess("cmw-non-existent-doc", ownerUser.id);
      expect(role).toBeNull();
    });
  });

  describe("3. OWNER Role Privileges", () => {
    it("allows OWNER to read document and returns effectiveRole='OWNER'", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}`,
        {
          headers: { "x-user-email": ownerUser.email },
        }
      );
      const res = await getDocumentByIdRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.effectiveRole).toBe("OWNER");
      expect(body.owner.email).toBe(ownerUser.email);
    });

    it("allows OWNER to edit title and content", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}`,
        {
          method: "PATCH",
          headers: {
            "x-user-email": ownerUser.email,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            title: "Owner Updated Title",
            content: "<p>Updated by owner</p>",
          }),
        }
      );
      const res = await patchDocumentRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(200);
      const updated = await res.json();
      expect(updated.title).toBe("Owner Updated Title");
    });

    it("allows OWNER to grant new share access and revoke existing share", async () => {
      // Grant share
      const shareReq = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}/share`,
        {
          method: "POST",
          headers: {
            "x-user-email": ownerUser.email,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email: "newinvitee@ajaia.com",
            permission: "VIEW",
          }),
        }
      );
      const shareRes = await shareDocumentRoute(shareReq, {
        params: { id: testDoc.id },
      });
      expect(shareRes.status).toBe(200);
      const shareData = await shareRes.json();
      expect(shareData.share.permission).toBe("VIEW");

      // Revoke share
      const deleteReq = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}/share?userId=${shareData.share.userId}`,
        {
          method: "DELETE",
          headers: { "x-user-email": ownerUser.email },
        }
      );
      const deleteRes = await deleteShareRoute(deleteReq, {
        params: { id: testDoc.id },
      });
      expect(deleteRes.status).toBe(200);
    });

    it("prevents OWNER from sharing a document with themselves", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}/share`,
        {
          method: "POST",
          headers: {
            "x-user-email": ownerUser.email,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email: ownerUser.email,
            permission: "EDIT",
          }),
        }
      );
      const res = await shareDocumentRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("cannot share a document with yourself");
    });
  });

  describe("4. EDIT Role Privileges & Boundaries", () => {
    it("allows EDIT collaborator to read document with effectiveRole='EDIT'", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}`,
        {
          headers: { "x-user-email": editorUser.email },
        }
      );
      const res = await getDocumentByIdRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.effectiveRole).toBe("EDIT");
    });

    it("allows EDIT collaborator to update document content", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}`,
        {
          method: "PATCH",
          headers: {
            "x-user-email": editorUser.email,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            content: "<p>Content edited by Alex.</p>",
          }),
        }
      );
      const res = await patchDocumentRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.content).toContain("Content edited by Alex.");
    });

    it("blocks EDIT collaborator from managing shares (403 Forbidden)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}/share`,
        {
          method: "POST",
          headers: {
            "x-user-email": editorUser.email,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email: "guest@ajaia.com",
            permission: "EDIT",
          }),
        }
      );
      const res = await shareDocumentRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Only the document owner");
    });

    it("blocks EDIT collaborator from deleting the document (403 Forbidden)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}`,
        {
          method: "DELETE",
          headers: { "x-user-email": editorUser.email },
        }
      );
      const res = await deleteDocumentRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Only the document owner can delete");
    });
  });

  describe("5. VIEW Role Privileges & Boundaries", () => {
    it("allows VIEW collaborator to read document with effectiveRole='VIEW'", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}`,
        {
          headers: { "x-user-email": viewerUser.email },
        }
      );
      const res = await getDocumentByIdRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.effectiveRole).toBe("VIEW");
    });

    it("blocks VIEW collaborator from editing document (403 Forbidden)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}`,
        {
          method: "PATCH",
          headers: {
            "x-user-email": viewerUser.email,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            title: "Viewer Trying to Overwrite Title",
          }),
        }
      );
      const res = await patchDocumentRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("view-only access");
    });

    it("blocks VIEW collaborator from managing shares (403 Forbidden)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}/share`,
        {
          method: "POST",
          headers: {
            "x-user-email": viewerUser.email,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email: "guest@ajaia.com",
            permission: "VIEW",
          }),
        }
      );
      const res = await shareDocumentRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(403);
    });

    it("blocks VIEW collaborator from deleting document (403 Forbidden)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}`,
        {
          method: "DELETE",
          headers: { "x-user-email": viewerUser.email },
        }
      );
      const res = await deleteDocumentRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(403);
    });
  });

  describe("6. Unauthorized / Unshared User Boundaries", () => {
    it("blocks unshared user from viewing document (403 Forbidden)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}`,
        {
          headers: { "x-user-email": strangerUser.email },
        }
      );
      const res = await getDocumentByIdRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("permission to view this document");
    });

    it("blocks unshared user from editing document (403 Forbidden)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}`,
        {
          method: "PATCH",
          headers: {
            "x-user-email": strangerUser.email,
            "content-type": "application/json",
          },
          body: JSON.stringify({ title: "Stranger Edit Attempt" }),
        }
      );
      const res = await patchDocumentRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(403);
    });

    it("blocks unshared user from deleting document (403 Forbidden)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${testDoc.id}`,
        {
          method: "DELETE",
          headers: { "x-user-email": strangerUser.email },
        }
      );
      const res = await deleteDocumentRoute(req, {
        params: { id: testDoc.id },
      });
      expect(res.status).toBe(403);
    });
  });
});

