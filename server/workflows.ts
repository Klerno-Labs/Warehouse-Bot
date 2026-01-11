/**
 * Workflow Automation & Business Rules Engine
 *
 * Allows users to define automated workflows that trigger based on events
 * Supports conditions, actions, and complex business logic
 */

import { prisma } from "./prisma";
import { EmailService } from "./email";

export type TriggerType =
  | "ITEM_CREATED"
  | "ITEM_UPDATED"
  | "STOCK_BELOW_THRESHOLD"
  | "STOCK_ABOVE_THRESHOLD"
  | "TRANSACTION_CREATED"
  | "ORDER_CREATED"
  | "ORDER_COMPLETED"
  | "CYCLE_COUNT_COMPLETED"
  | "SCHEDULED" // Time-based triggers
  | "MANUAL"; // Manual execution

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null";

export type ActionType =
  | "SEND_EMAIL"
  | "CREATE_PURCHASE_ORDER"
  | "ADJUST_INVENTORY"
  | "UPDATE_ITEM"
  | "CREATE_ALERT"
  | "CALL_WEBHOOK"
  | "RUN_REPORT"
  | "ASSIGN_TO_USER"
  | "UPDATE_STATUS"
  | "EXECUTE_SCRIPT";

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: "AND" | "OR"; // How this condition combines with the next
}

export interface WorkflowAction {
  type: ActionType;
  config: Record<string, any>;
  order: number; // Execution order
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: {
    type: TriggerType;
    config?: Record<string, any>; // e.g., schedule for SCHEDULED triggers
  };
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  executionCount: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggeredBy: string; // User ID or "SYSTEM"
  triggeredAt: Date;
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  results: ActionResult[];
  duration: number; // milliseconds
}

// Type for action results - used by all execute methods
export type ActionResult = {
  action: string;
  success: boolean;
  message?: string;
  error?: string;
};

export class WorkflowEngine {
  /**
   * Execute a workflow based on a trigger event
   */
  static async executeTrigger(
    tenantId: string,
    triggerType: TriggerType,
    context: Record<string, any>
  ): Promise<WorkflowExecution[]> {
    const executions: WorkflowExecution[] = [];

    // Find all enabled workflows for this trigger
    const workflows = await this.getWorkflowsByTrigger(tenantId, triggerType);

    for (const workflow of workflows) {
      try {
        const execution = await this.executeWorkflow(workflow, context);
        executions.push(execution);
      } catch (error) {
        console.error(`Failed to execute workflow ${workflow.id}:`, error);
      }
    }

    return executions;
  }

  /**
   * Execute a specific workflow
   */
  static async executeWorkflow(
    workflow: Workflow,
    context: Record<string, any>
  ): Promise<WorkflowExecution> {
    const startTime = Date.now();

    const execution: WorkflowExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      workflowId: workflow.id,
      triggeredBy: context.userId || "SYSTEM",
      triggeredAt: new Date(),
      status: "SUCCESS",
      results: [],
      duration: 0,
    };

    try {
      // Check conditions
      const conditionsMet = await this.evaluateConditions(workflow.conditions, context);

      if (!conditionsMet) {
        execution.status = "FAILED";
        execution.results.push({
          action: "CONDITIONS_CHECK",
          success: false,
          message: "Workflow conditions not met",
        });
        execution.duration = Date.now() - startTime;
        return execution;
      }

      // Execute actions in order
      const sortedActions = workflow.actions.sort((a, b) => a.order - b.order);

      for (const action of sortedActions) {
        try {
          const result = await this.executeAction(action, context, workflow.tenantId);
          execution.results.push(result);

          if (!result.success) {
            execution.status = "PARTIAL";
          }
        } catch (error: any) {
          execution.results.push({
            action: action.type,
            success: false,
            error: error.message,
          });
          execution.status = "PARTIAL";
        }
      }
    } catch (error: any) {
      execution.status = "FAILED";
      execution.results.push({
        action: "WORKFLOW_EXECUTION",
        success: false,
        error: error.message,
      });
    }

    execution.duration = Date.now() - startTime;

    // Update workflow execution stats
    await this.updateWorkflowStats(workflow.id);

    return execution;
  }

  /**
   * Evaluate workflow conditions
   */
  private static async evaluateConditions(
    conditions: WorkflowCondition[],
    context: Record<string, any>
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogic: "AND" | "OR" = "AND";

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionMet = this.evaluateCondition(condition, context);

      if (i === 0) {
        result = conditionMet;
      } else {
        if (currentLogic === "AND") {
          result = result && conditionMet;
        } else {
          result = result || conditionMet;
        }
      }

      currentLogic = condition.logicalOperator || "AND";
    }

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(
    condition: WorkflowCondition,
    context: Record<string, any>
  ): boolean {
    const fieldValue = this.getNestedValue(context, condition.field);

    switch (condition.operator) {
      case "equals":
        return fieldValue === condition.value;
      case "not_equals":
        return fieldValue !== condition.value;
      case "greater_than":
        return fieldValue > condition.value;
      case "less_than":
        return fieldValue < condition.value;
      case "contains":
        return String(fieldValue).includes(String(condition.value));
      case "starts_with":
        return String(fieldValue).startsWith(String(condition.value));
      case "ends_with":
        return String(fieldValue).endsWith(String(condition.value));
      case "in":
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case "not_in":
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case "is_null":
        return fieldValue === null || fieldValue === undefined;
      case "is_not_null":
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  }

  /**
   * Execute a workflow action
   */
  private static async executeAction(
    action: WorkflowAction,
    context: Record<string, any>,
    tenantId: string
  ): Promise<{ action: string; success: boolean; message?: string; error?: string }> {
    switch (action.type) {
      case "SEND_EMAIL":
        return await this.executeSendEmail(action.config, context);

      case "CREATE_PURCHASE_ORDER":
        return await this.executeCreatePurchaseOrder(action.config, context, tenantId);

      case "ADJUST_INVENTORY":
        return await this.executeAdjustInventory(action.config, context, tenantId);

      case "UPDATE_ITEM":
        return await this.executeUpdateItem(action.config, context, tenantId);

      case "CREATE_ALERT":
        return await this.executeCreateAlert(action.config, context, tenantId);

      case "CALL_WEBHOOK":
        return await this.executeCallWebhook(action.config, context);

      case "UPDATE_STATUS":
        return await this.executeUpdateStatus(action.config, context, tenantId);

      default:
        return {
          action: action.type,
          success: false,
          error: `Unsupported action type: ${action.type}`,
        };
    }
  }

  /**
   * Action: Send Email
   */
  private static async executeSendEmail(
    config: Record<string, any>,
    context: Record<string, any>
  ): Promise<ActionResult> {
    try {
      const { to, subject, template } = config;

      // Replace template variables
      const replacedSubject = this.replaceVariables(subject, context);
      const replacedBody = this.replaceVariables(template, context);

      await EmailService.sendEmail({
        to,
        subject: replacedSubject,
        html: replacedBody,
      });

      return {
        action: "SEND_EMAIL",
        success: true,
        message: `Email sent to ${to}`,
      };
    } catch (error: any) {
      return {
        action: "SEND_EMAIL",
        success: false,
        message: `Email failed: ${error.message}`,
      };
    }
  }

  /**
   * Action: Create Purchase Order
   */
  private static async executeCreatePurchaseOrder(
    config: Record<string, any>,
    context: Record<string, any>,
    tenantId: string
  ): Promise<ActionResult> {
    try {
      const { supplierId, items, siteId } = config;

      // In production, create actual PO
      const poNumber = `AUTO-PO-${Date.now()}`;

      console.log("Creating auto-generated PO:", {
        poNumber,
        supplierId,
        items,
        tenantId,
        siteId,
      });

      return {
        action: "CREATE_PURCHASE_ORDER",
        success: true,
        message: `Created PO ${poNumber} for supplier ${supplierId}`,
      };
    } catch (error: any) {
      return {
        action: "CREATE_PURCHASE_ORDER",
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Action: Adjust Inventory
   */
  private static async executeAdjustInventory(
    config: Record<string, any>,
    context: Record<string, any>,
    tenantId: string
  ): Promise<ActionResult> {
    try {
      const { itemId, locationId, adjustment, reason } = config;

      // In production, create inventory adjustment event
      console.log("Auto-adjusting inventory:", {
        itemId,
        locationId,
        adjustment,
        reason,
        tenantId,
      });

      return {
        action: "ADJUST_INVENTORY",
        success: true,
        message: `Adjusted inventory for item ${itemId} by ${adjustment}`,
      };
    } catch (error: any) {
      return {
        action: "ADJUST_INVENTORY",
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Action: Update Item
   */
  private static async executeUpdateItem(
    config: Record<string, any>,
    context: Record<string, any>,
    tenantId: string
  ): Promise<ActionResult> {
    try {
      const { itemId, updates } = config;

      await prisma.item.update({
        where: { id: itemId, tenantId },
        data: updates,
      });

      return {
        action: "UPDATE_ITEM",
        success: true,
        message: `Updated item ${itemId}`,
      };
    } catch (error: any) {
      return {
        action: "UPDATE_ITEM",
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Action: Create Alert
   */
  private static async executeCreateAlert(
    config: Record<string, any>,
    context: Record<string, any>,
    tenantId: string
  ): Promise<ActionResult> {
    try {
      const { title, message, severity } = config;

      // In production, create alert record
      console.log("Creating workflow alert:", {
        title: this.replaceVariables(title, context),
        message: this.replaceVariables(message, context),
        severity,
        tenantId,
      });

      return {
        action: "CREATE_ALERT",
        success: true,
        message: "Alert created",
      };
    } catch (error: any) {
      return {
        action: "CREATE_ALERT",
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Action: Call Webhook
   */
  private static async executeCallWebhook(
    config: Record<string, any>,
    context: Record<string, any>
  ): Promise<ActionResult> {
    try {
      const { url, method = "POST", headers = {}, body } = config;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(this.replaceVariables(body, context)),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned status ${response.status}`);
      }

      return {
        action: "CALL_WEBHOOK",
        success: true,
        message: `Webhook called successfully: ${url}`,
      };
    } catch (error: any) {
      return {
        action: "CALL_WEBHOOK",
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Action: Update Status
   */
  private static async executeUpdateStatus(
    config: Record<string, any>,
    context: Record<string, any>,
    tenantId: string
  ): Promise<ActionResult> {
    try {
      const { entityType, entityId, newStatus } = config;

      // In production, update status based on entity type
      console.log("Updating status:", {
        entityType,
        entityId,
        newStatus,
        tenantId,
      });

      return {
        action: "UPDATE_STATUS",
        success: true,
        message: `Updated ${entityType} ${entityId} status to ${newStatus}`,
      };
    } catch (error: any) {
      return {
        action: "UPDATE_STATUS",
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Helper: Replace template variables with context values
   */
  private static replaceVariables(template: string, context: Record<string, any>): string {
    let result = template;

    // Replace {{variable}} patterns
    const matches = template.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      for (const match of matches) {
        const variable = match.replace(/\{\{|\}\}/g, "").trim();
        const value = this.getNestedValue(context, variable);
        result = result.replace(match, String(value || ""));
      }
    }

    return result;
  }

  /**
   * Helper: Get nested value from object
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get workflows by trigger type
   */
  private static async getWorkflowsByTrigger(
    tenantId: string,
    triggerType: TriggerType
  ): Promise<Workflow[]> {
    // Fetch active workflows from database
    const workflowRules = await prisma.workflowRule.findMany({
      where: {
        tenantId,
        isActive: true,
        triggerType: triggerType,
      },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { executions: true },
        },
      },
    });

    // Map database records to Workflow interface
    return workflowRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description || undefined,
      enabled: rule.isActive,
      trigger: {
        type: rule.triggerType as TriggerType,
      },
      conditions: (rule.conditions as WorkflowCondition[]) || [],
      actions: (rule.actions as WorkflowAction[]) || [],
      tenantId: rule.tenantId,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      lastExecutedAt: rule.executions[0]?.executedAt,
      executionCount: rule._count.executions,
    }));
  }

  /**
   * Update workflow execution statistics
   */
  private static async updateWorkflowStats(workflowId: string): Promise<void> {
    // In production, update execution count and last executed timestamp
    console.log(`Updated stats for workflow ${workflowId}`);
  }
}
