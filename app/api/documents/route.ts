import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { DocumentService } from "@server/webhooks-documents";
import { z } from "zod";

export const dynamic = "force-dynamic";

const GenerateDocumentSchema = z.object({
  templateId: z.string(),
  referenceType: z.enum(["ORDER", "SHIPMENT", "RECEIPT", "TRANSFER", "RMA", "ITEM"]),
  referenceId: z.string(),
  data: z.record(z.any()).optional(),
  format: z.enum(["PDF", "HTML", "ZPL", "EPL", "CSV", "EXCEL"]).optional(),
});

const CreateTemplateSchema = z.object({
  name: z.string(),
  type: z.enum([
    "BOL", "PACKING_SLIP", "COMMERCIAL_INVOICE", "CUSTOMS_DECLARATION",
    "SHIPPING_LABEL", "PICK_LIST", "PACK_LIST", "RECEIPT", "RMA", "COC",
    "SDS", "PRODUCT_LABEL", "LOCATION_LABEL"
  ]),
  format: z.enum(["PDF", "HTML", "ZPL", "EPL", "CSV", "EXCEL"]),
  template: z.string(),
  variables: z.array(z.string()),
});

const GenerateLabelSchema = z.object({
  itemId: z.string(),
  quantity: z.number().min(1),
  includeBarcode: z.boolean().default(true),
  format: z.enum(["ZPL", "PDF"]).optional(),
});

/**
 * Document Management API
 *
 * GET /api/documents - Get document dashboard
 * GET /api/documents?view=templates - Get document templates
 * GET /api/documents?view=generated - Get generated documents
 * GET /api/documents?view=storage - Get stored documents
 * POST /api/documents - Generate document
 * POST /api/documents?action=bol - Generate Bill of Lading
 * POST /api/documents?action=packing-slip - Generate packing slip
 * POST /api/documents?action=invoice - Generate commercial invoice
 * POST /api/documents?action=customs - Generate customs declaration
 * POST /api/documents?action=pick-list - Generate pick list
 * POST /api/documents?action=product-label - Generate product labels
 * POST /api/documents?action=location-label - Generate location labels
 * POST /api/documents?action=template - Create template
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const type = searchParams.get("type") as any;
    const format = searchParams.get("format") as any;

    const service = new DocumentService(context.user.tenantId);

    if (view === "templates") {
      const templates = await service.getDocumentTemplates({
        type: type || undefined,
        format: format || undefined,
      });
      return NextResponse.json({ templates });
    }

    if (view === "generated") {
      const referenceType = searchParams.get("referenceType") as any;
      const referenceId = searchParams.get("referenceId");
      const documents = await service.getGeneratedDocuments({
        referenceType: referenceType || undefined,
        referenceId: referenceId || undefined,
        type: type || undefined,
      });
      return NextResponse.json({ documents });
    }

    if (view === "storage") {
      const category = searchParams.get("category") as any;
      const referenceType = searchParams.get("referenceType");
      const referenceId = searchParams.get("referenceId");
      const documents = await service.getDocuments({
        category: category || undefined,
        referenceType: referenceType || undefined,
        referenceId: referenceId || undefined,
      });
      return NextResponse.json({ documents });
    }

    // Default - dashboard
    const dashboard = await service.getDocumentDashboard();
    return NextResponse.json({ dashboard });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const service = new DocumentService(context.user.tenantId);

    if (action === "bol") {
      const body = await req.json();
      const document = await service.generateBOL(body.shipmentId);

      await createAuditLog(
        context,
        "GENERATE",
        "Document",
        document.id,
        `Generated Bill of Lading for shipment ${body.shipmentId}`
      );

      return NextResponse.json({ success: true, document });
    }

    if (action === "packing-slip") {
      const body = await req.json();
      const document = await service.generatePackingSlip(body.orderId);

      await createAuditLog(
        context,
        "GENERATE",
        "Document",
        document.id,
        `Generated packing slip for order ${body.orderId}`
      );

      return NextResponse.json({ success: true, document });
    }

    if (action === "invoice") {
      const body = await req.json();
      const document = await service.generateCommercialInvoice(body.shipmentId);

      await createAuditLog(
        context,
        "GENERATE",
        "Document",
        document.id,
        `Generated commercial invoice for shipment ${body.shipmentId}`
      );

      return NextResponse.json({ success: true, document });
    }

    if (action === "customs") {
      const body = await req.json();
      const document = await service.generateCustomsDeclaration(body.shipmentId);

      await createAuditLog(
        context,
        "GENERATE",
        "Document",
        document.id,
        `Generated customs declaration for shipment ${body.shipmentId}`
      );

      return NextResponse.json({ success: true, document });
    }

    if (action === "pick-list") {
      const body = await req.json();
      const document = await service.generatePickList(body.waveId);

      await createAuditLog(
        context,
        "GENERATE",
        "Document",
        document.id,
        `Generated pick list for wave ${body.waveId}`
      );

      return NextResponse.json({ success: true, document });
    }

    if (action === "receipt") {
      const body = await req.json();
      const document = await service.generateReceiptDocument(body.receiptId);

      await createAuditLog(
        context,
        "GENERATE",
        "Document",
        document.id,
        `Generated receipt document for ${body.receiptId}`
      );

      return NextResponse.json({ success: true, document });
    }

    if (action === "rma-label") {
      const body = await req.json();
      const document = await service.generateRMALabel(body.rmaId);

      await createAuditLog(
        context,
        "GENERATE",
        "Document",
        document.id,
        `Generated RMA label for ${body.rmaId}`
      );

      return NextResponse.json({ success: true, document });
    }

    if (action === "product-label") {
      const body = await validateBody(req, GenerateLabelSchema);
      if (body instanceof NextResponse) return body;

      const document = await service.generateProductLabel(body);

      await createAuditLog(
        context,
        "GENERATE",
        "Document",
        document.id,
        `Generated ${body.quantity} product labels for ${body.itemId}`
      );

      return NextResponse.json({ success: true, document });
    }

    if (action === "location-label") {
      const body = await req.json();
      const document = await service.generateLocationLabel({
        locationId: body.locationId,
        format: body.format,
      });

      await createAuditLog(
        context,
        "GENERATE",
        "Document",
        document.id,
        `Generated location label for ${body.locationId}`
      );

      return NextResponse.json({ success: true, document });
    }

    if (action === "template") {
      const body = await validateBody(req, CreateTemplateSchema);
      if (body instanceof NextResponse) return body;

      const template = await service.createTemplate(body);

      await createAuditLog(
        context,
        "CREATE",
        "DocumentTemplate",
        template.id,
        `Created document template: ${body.name}`
      );

      return NextResponse.json({ success: true, template });
    }

    if (action === "delete") {
      const body = await req.json();
      await service.deleteDocument(body.id);

      await createAuditLog(
        context,
        "DELETE",
        "Document",
        body.id,
        `Deleted document`
      );

      return NextResponse.json({ success: true });
    }

    // Generate custom document
    const body = await validateBody(req, GenerateDocumentSchema);
    if (body instanceof NextResponse) return body;

    const document = await service.generateDocument(body);

    await createAuditLog(
      context,
      "GENERATE",
      "Document",
      document.id,
      `Generated document using template ${body.templateId}`
    );

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
