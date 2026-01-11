import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { WorkflowEngine } from "@server/workflows";
import { prisma } from "@server/prisma";

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

    const tenantId = context.user.tenantId;

    // Fetch workflows from database
    const workflowRules = await prisma.workflowRule.findMany({
      where: { tenantId },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to response format
    const workflows = workflowRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      enabled: rule.isActive,
      trigger: { type: rule.triggerType },
      conditions: rule.conditions,
      actions: rule.actions,
      executionCount: rule._count.executions,
      lastExecutedAt: rule.executions[0]?.executedAt || null,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }));

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

    const tenantId = context.user.tenantId;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const workflowId = searchParams.get("id");

    // Manual workflow execution
    if (action === "execute" && workflowId) {
      const body = await req.json();
      const workflowContext = body.context || {};

      // Fetch the workflow
      const workflow = await prisma.workflowRule.findFirst({
        where: { id: workflowId, tenantId },
      });

      if (!workflow) {
        return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      }

      // Execute the workflow
      const startTime = Date.now();
      const executions = await WorkflowEngine.executeTrigger(
        tenantId,
        workflow.triggerType as any,
        workflowContext
      );

      // Record execution
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowRuleId: workflowId,
          triggerData: workflowContext,
          status: executions.length > 0 ? "SUCCESS" : "FAILED",
          result: executions.length > 0 ? executions[0].results : null,
          executedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        execution: {
          id: execution.id,
          workflowId,
          status: execution.status,
          triggeredAt: execution.executedAt,
          results: execution.result,
          duration: Date.now() - startTime,
        },
        message: "Workflow executed successfully",
      });
    }

    // Trigger workflows based on event
    if (action === "trigger") {
      const body = await req.json();
      const { triggerType, context: triggerContext } = body;

      const executions = await WorkflowEngine.executeTrigger(
        tenantId,
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
    const { name, description, trigger, conditions, actions, enabled = true } = body;

    if (!name || !trigger?.type) {
      return NextResponse.json(
        { error: "Name and trigger type are required" },
        { status: 400 }
      );
    }

    const newWorkflow = await prisma.workflowRule.create({
      data: {
        tenantId,
        name,
        description: description || null,
        triggerType: trigger.type,
        conditions: conditions || [],
        actions: actions || [],
        isActive: enabled,
      },
    });

    return NextResponse.json({
      success: true,
      workflowId: newWorkflow.id,
      workflow: newWorkflow,
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

    const tenantId = context.user.tenantId;
    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get("id");

    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
    }

    // Verify workflow exists and belongs to tenant
    const existingWorkflow = await prisma.workflowRule.findFirst({
      where: { id: workflowId, tenantId },
    });

    if (!existingWorkflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, enabled, trigger, conditions, actions } = body;

    // Build update data
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (enabled !== undefined) updateData.isActive = enabled;
    if (trigger?.type !== undefined) updateData.triggerType = trigger.type;
    if (conditions !== undefined) updateData.conditions = conditions;
    if (actions !== undefined) updateData.actions = actions;

    const updatedWorkflow = await prisma.workflowRule.update({
      where: { id: workflowId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      workflow: updatedWorkflow,
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

    const tenantId = context.user.tenantId;
    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get("id");

    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
    }

    // Verify workflow exists and belongs to tenant
    const existingWorkflow = await prisma.workflowRule.findFirst({
      where: { id: workflowId, tenantId },
    });

    if (!existingWorkflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    // Delete workflow (cascades to executions)
    await prisma.workflowRule.delete({
      where: { id: workflowId },
    });

    return NextResponse.json({
      success: true,
      message: "Workflow deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
