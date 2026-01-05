import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { WorkflowEngine } from "@server/workflows";

/**
 * Workflow Automation API
 *
 * GET /api/workflows
 * - Get all workflows for the tenant
 *
 * POST /api/workflows
 * - Create a new workflow
 *
 * PUT /api/workflows/:id
 * - Update a workflow
 *
 * DELETE /api/workflows/:id
 * - Delete a workflow
 *
 * POST /api/workflows/:id/execute
 * - Manually execute a workflow
 *
 * POST /api/workflows/trigger
 * - Trigger workflows based on an event
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // In production, fetch workflows from database
    const workflows = [
      {
        id: "workflow-1",
        name: "Auto-Reorder on Low Stock",
        description: "Automatically create PO when stock falls below reorder point",
        enabled: true,
        trigger: { type: "STOCK_BELOW_THRESHOLD" },
        conditions: [
          {
            field: "currentStock",
            operator: "less_than",
            value: "{{reorderPoint}}",
          },
        ],
        actions: [
          {
            type: "CREATE_PURCHASE_ORDER",
            config: {
              supplierId: "{{item.defaultSupplierId}}",
              items: [{ itemId: "{{item.id}}", quantity: "{{item.reorderQtyBase}}" }],
            },
            order: 1,
          },
          {
            type: "SEND_EMAIL",
            config: {
              to: "purchasing@company.com",
              subject: "Auto-PO Created: {{item.name}}",
              template: "A purchase order has been automatically created for {{item.name}}.",
            },
            order: 2,
          },
        ],
        executionCount: 45,
        lastExecutedAt: new Date(Date.now() - 3600000),
        createdAt: new Date(Date.now() - 86400000 * 30),
      },
      {
        id: "workflow-2",
        name: "Cycle Count Variance Notification",
        description: "Alert managers when cycle count variance exceeds threshold",
        enabled: true,
        trigger: { type: "CYCLE_COUNT_COMPLETED" },
        conditions: [
          {
            field: "variance",
            operator: "greater_than",
            value: 100,
          },
        ],
        actions: [
          {
            type: "SEND_EMAIL",
            config: {
              to: "manager@company.com",
              subject: "High Cycle Count Variance: {{item.name}}",
              template:
                "Cycle count for {{item.name}} shows variance of {{variance}}. Please review.",
            },
            order: 1,
          },
          {
            type: "CREATE_ALERT",
            config: {
              title: "High Variance: {{item.name}}",
              message: "Variance: {{variance}}",
              severity: "warning",
            },
            order: 2,
          },
        ],
        executionCount: 12,
        lastExecutedAt: new Date(Date.now() - 7200000),
        createdAt: new Date(Date.now() - 86400000 * 15),
      },
      {
        id: "workflow-3",
        name: "Production Order Completion",
        description: "Update inventory and notify on production order completion",
        enabled: true,
        trigger: { type: "ORDER_COMPLETED" },
        conditions: [
          {
            field: "orderType",
            operator: "equals",
            value: "PRODUCTION",
          },
        ],
        actions: [
          {
            type: "ADJUST_INVENTORY",
            config: {
              itemId: "{{order.itemId}}",
              locationId: "{{order.outputLocationId}}",
              adjustment: "{{order.qtyCompleted}}",
              reason: "Production completion",
            },
            order: 1,
          },
          {
            type: "UPDATE_STATUS",
            config: {
              entityType: "ProductionOrder",
              entityId: "{{order.id}}",
              newStatus: "COMPLETED",
            },
            order: 2,
          },
          {
            type: "SEND_EMAIL",
            config: {
              to: "production@company.com",
              subject: "Production Order Completed: {{order.orderNumber}}",
              template:
                "Production order {{order.orderNumber}} completed. Quantity: {{order.qtyCompleted}}",
            },
            order: 3,
          },
        ],
        executionCount: 234,
        lastExecutedAt: new Date(Date.now() - 1800000),
        createdAt: new Date(Date.now() - 86400000 * 60),
      },
      {
        id: "workflow-4",
        name: "Expiring Inventory Alert",
        description: "Send alerts for inventory expiring within 7 days",
        enabled: true,
        trigger: { type: "SCHEDULED", config: { schedule: "0 9 * * *" } },
        conditions: [
          {
            field: "daysUntilExpiration",
            operator: "less_than",
            value: 7,
          },
        ],
        actions: [
          {
            type: "SEND_EMAIL",
            config: {
              to: "warehouse@company.com",
              subject: "Expiring Inventory Alert",
              template:
                "Lot {{lotNumber}} of {{item.name}} expires in {{daysUntilExpiration}} days.",
            },
            order: 1,
          },
          {
            type: "CREATE_ALERT",
            config: {
              title: "Expiring: {{item.name}}",
              message: "Lot {{lotNumber}} expires {{expirationDate}}",
              severity: "warning",
            },
            order: 2,
          },
        ],
        executionCount: 89,
        lastExecutedAt: new Date(Date.now() - 86400000),
        createdAt: new Date(Date.now() - 86400000 * 45),
      },
      {
        id: "workflow-5",
        name: "Quality Issue Escalation",
        description: "Escalate quality issues to QA manager",
        enabled: true,
        trigger: { type: "TRANSACTION_CREATED" },
        conditions: [
          {
            field: "eventType",
            operator: "equals",
            value: "SCRAP",
          },
          {
            field: "quantity",
            operator: "greater_than",
            value: 50,
            logicalOperator: "AND",
          },
        ],
        actions: [
          {
            type: "SEND_EMAIL",
            config: {
              to: "qa@company.com",
              subject: "High Scrap Quantity: {{item.name}}",
              template: "High scrap quantity detected: {{quantity}} units of {{item.name}}",
            },
            order: 1,
          },
          {
            type: "CREATE_ALERT",
            config: {
              title: "High Scrap: {{item.name}}",
              message: "{{quantity}} units scrapped",
              severity: "critical",
            },
            order: 2,
          },
        ],
        executionCount: 8,
        lastExecutedAt: new Date(Date.now() - 172800000),
        createdAt: new Date(Date.now() - 86400000 * 20),
      },
    ];

    return NextResponse.json({
      workflows,
      total: workflows.length,
      enabled: workflows.filter((w) => w.enabled).length,
    });
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
    const workflowId = searchParams.get("id");

    // Manual workflow execution
    if (action === "execute" && workflowId) {
      const body = await req.json();
      const workflowContext = body.context || {};

      // In production, fetch workflow and execute
      const execution = {
        id: `exec-${Date.now()}`,
        workflowId,
        status: "SUCCESS",
        triggeredAt: new Date(),
        results: [
          {
            action: "SEND_EMAIL",
            success: true,
            message: "Email sent successfully",
          },
        ],
        duration: 1250,
      };

      return NextResponse.json({
        success: true,
        execution,
        message: "Workflow executed successfully",
      });
    }

    // Trigger workflows based on event
    if (action === "trigger") {
      const body = await req.json();
      const { triggerType, context: triggerContext } = body;

      const executions = await WorkflowEngine.executeTrigger(
        context.user.tenantId,
        triggerType,
        triggerContext
      );

      return NextResponse.json({
        success: true,
        executions,
        message: `Triggered ${executions.length} workflows`,
      });
    }

    // Create new workflow
    const body = await req.json();
    const { name, description, trigger, conditions, actions } = body;

    const newWorkflowId = `workflow-${Date.now()}`;

    // In production, save to database
    console.log("Creating workflow:", { workflowId: newWorkflowId, name, trigger, conditions, actions });

    return NextResponse.json({
      success: true,
      workflowId: newWorkflowId,
      message: "Workflow created successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get("id");

    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, enabled, trigger, conditions, actions } = body;

    // In production, update workflow in database
    console.log("Updating workflow:", { workflowId, name, enabled });

    return NextResponse.json({
      success: true,
      message: "Workflow updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get("id");

    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
    }

    // In production, delete workflow from database
    console.log("Deleting workflow:", workflowId);

    return NextResponse.json({
      success: true,
      message: "Workflow deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
