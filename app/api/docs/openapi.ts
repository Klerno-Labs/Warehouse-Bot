/**
 * OpenAPI/Swagger Documentation
 * 
 * This file defines the OpenAPI specification for the Warehouse Core API.
 * Access the documentation at /api/docs
 */

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Warehouse Core API",
    version: "1.0.0",
    description: `
# Warehouse Core Platform API

A comprehensive API for inventory management, manufacturing operations, and supply chain workflows.

## Authentication

All API endpoints require authentication via session cookies. Login at \`/api/auth/login\` to obtain a session.

## Rate Limiting

- Standard endpoints: 100 requests per minute
- Dashboard endpoints: 30 requests per minute
- Authentication endpoints: 10 requests per minute

## Versioning

Current API version: **v1**

All endpoints are prefixed with \`/api\` and follow REST conventions.
    `,
    contact: {
      name: "API Support",
      email: "support@warehousecore.com",
    },
    license: {
      name: "Proprietary",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
    {
      url: "https://app.warehousecore.com",
      description: "Production server",
    },
  ],
  tags: [
    { name: "Authentication", description: "User authentication and session management" },
    { name: "Dashboard", description: "Dashboard statistics and analytics" },
    { name: "Inventory", description: "Inventory management operations" },
    { name: "Items", description: "Item master data management" },
    { name: "Transactions", description: "Inventory transaction operations" },
    { name: "Jobs", description: "Job and work order management" },
    { name: "Purchasing", description: "Purchase orders and receipts" },
    { name: "Manufacturing", description: "Production orders and BOMs" },
    { name: "Cycle Counts", description: "Inventory cycle counting" },
    { name: "Admin", description: "Administrative operations" },
  ],
  paths: {
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "User login",
        description: "Authenticate a user and create a session",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "admin@example.com" },
                  password: { type: "string", minLength: 6, example: "password123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current user",
        description: "Get the currently authenticated user's information",
        security: [{ sessionAuth: [] }],
        responses: {
          200: {
            description: "Current user information",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          401: { description: "Not authenticated" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "User logout",
        description: "End the current session",
        security: [{ sessionAuth: [] }],
        responses: {
          200: { description: "Logout successful" },
        },
      },
    },
    "/api/dashboard/stats": {
      get: {
        tags: ["Dashboard"],
        summary: "Get dashboard statistics",
        description: "Retrieve comprehensive dashboard statistics including inventory health, alerts, activity, and analytics",
        security: [{ sessionAuth: [] }],
        responses: {
          200: {
            description: "Dashboard statistics",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DashboardStats" },
              },
            },
          },
          401: { description: "Not authenticated" },
        },
      },
    },
    "/api/inventory/balances": {
      get: {
        tags: ["Inventory"],
        summary: "Get inventory balances",
        description: "Retrieve current inventory balances for all items",
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: "siteId", in: "query", schema: { type: "string" }, description: "Filter by site ID" },
          { name: "itemId", in: "query", schema: { type: "string" }, description: "Filter by item ID" },
          { name: "locationId", in: "query", schema: { type: "string" }, description: "Filter by location ID" },
        ],
        responses: {
          200: {
            description: "Inventory balances",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/InventoryBalance" },
                },
              },
            },
          },
        },
      },
    },
    "/api/items": {
      get: {
        tags: ["Items"],
        summary: "List all items",
        description: "Retrieve all items for the current tenant",
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by SKU or name" },
          { name: "category", in: "query", schema: { type: "string" }, description: "Filter by category" },
          { name: "limit", in: "query", schema: { type: "integer", default: 100 }, description: "Maximum results" },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 }, description: "Results offset" },
        ],
        responses: {
          200: {
            description: "List of items",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Item" } },
                    total: { type: "integer" },
                    limit: { type: "integer" },
                    offset: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Items"],
        summary: "Create an item",
        description: "Create a new item in the system",
        security: [{ sessionAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ItemCreate" },
            },
          },
        },
        responses: {
          201: {
            description: "Item created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Item" },
              },
            },
          },
          400: { description: "Invalid request body" },
        },
      },
    },
    "/api/items/{id}": {
      get: {
        tags: ["Items"],
        summary: "Get an item",
        description: "Retrieve a specific item by ID",
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Item ID" },
        ],
        responses: {
          200: {
            description: "Item details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Item" },
              },
            },
          },
          404: { description: "Item not found" },
        },
      },
      patch: {
        tags: ["Items"],
        summary: "Update an item",
        description: "Update an existing item",
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ItemUpdate" },
            },
          },
        },
        responses: {
          200: { description: "Item updated" },
          404: { description: "Item not found" },
        },
      },
      delete: {
        tags: ["Items"],
        summary: "Delete an item",
        description: "Delete an item (if not referenced by transactions)",
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          204: { description: "Item deleted" },
          404: { description: "Item not found" },
          409: { description: "Cannot delete - item has transactions" },
        },
      },
    },
    "/api/txns": {
      get: {
        tags: ["Transactions"],
        summary: "List transactions",
        description: "Retrieve inventory transactions/events",
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: "siteId", in: "query", schema: { type: "string" } },
          { name: "itemId", in: "query", schema: { type: "string" } },
          { name: "eventType", in: "query", schema: { type: "string", enum: ["RECEIVE", "MOVE", "ISSUE_TO_WORKCELL", "RETURN", "SCRAP", "HOLD", "RELEASE", "COUNT", "ADJUST"] } },
          { name: "startDate", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: {
            description: "List of transactions",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/InventoryEvent" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Transactions"],
        summary: "Create a transaction",
        description: "Record a new inventory transaction",
        security: [{ sessionAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TransactionCreate" },
            },
          },
        },
        responses: {
          201: { description: "Transaction created" },
          400: { description: "Invalid transaction" },
        },
      },
    },
    "/api/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "List jobs",
        description: "Retrieve all jobs",
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "assignedTo", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "List of jobs",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Job" } },
              },
            },
          },
        },
      },
    },
    "/api/purchasing/purchase-orders": {
      get: {
        tags: ["Purchasing"],
        summary: "List purchase orders",
        security: [{ sessionAuth: [] }],
        responses: {
          200: {
            description: "List of purchase orders",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/PurchaseOrder" } },
              },
            },
          },
        },
      },
    },
    "/api/cycle-counts": {
      get: {
        tags: ["Cycle Counts"],
        summary: "List cycle counts",
        security: [{ sessionAuth: [] }],
        responses: {
          200: {
            description: "List of cycle counts",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/CycleCount" } },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionAuth: {
        type: "apiKey",
        in: "cookie",
        name: "session",
        description: "Session cookie obtained from /api/auth/login",
      },
    },
    schemas: {
      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          token: { type: "string" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          role: { type: "string", enum: ["Admin", "Supervisor", "Inventory", "Manufacturing", "Purchasing", "Operator", "Viewer"] },
          tenantId: { type: "string", format: "uuid" },
          tenantName: { type: "string" },
          siteIds: { type: "array", items: { type: "string" } },
        },
      },
      DashboardStats: {
        type: "object",
        properties: {
          overview: {
            type: "object",
            properties: {
              totalItems: { type: "integer" },
              totalSkus: { type: "integer" },
              totalStock: { type: "number" },
              healthScore: { type: "number", minimum: 0, maximum: 100 },
              turnoverRate: { type: "number" },
              totalStockValue: { type: "number" },
            },
          },
          alerts: {
            type: "object",
            properties: {
              lowStock: { type: "integer" },
              outOfStock: { type: "integer" },
              deadStock: { type: "integer" },
              deadStockValue: { type: "number" },
            },
          },
          activity: {
            type: "object",
            properties: {
              recentTransactions: { type: "integer" },
              topMovingItems: { type: "array", items: { type: "object" } },
              recentActivity: { type: "array", items: { type: "object" } },
            },
          },
          production: {
            type: "object",
            properties: {
              active: { type: "integer" },
              planned: { type: "integer" },
              completed: { type: "integer" },
              total: { type: "integer" },
            },
          },
          analytics: {
            type: "object",
            properties: {
              inventoryAging: { type: "object" },
              abcAnalysis: { type: "object" },
              topValueItems: { type: "array", items: { type: "object" } },
            },
          },
          transactionsByDay: { type: "array", items: { type: "object" } },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      Item: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          sku: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string", enum: ["PRODUCTION", "PACKAGING", "FACILITY", "CHEMICAL_MRO"] },
          baseUom: { type: "string", enum: ["EA", "FT", "YD", "ROLL"] },
          reorderPointBase: { type: "number" },
          costBase: { type: "number" },
          avgCostBase: { type: "number" },
          barcode: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ItemCreate: {
        type: "object",
        required: ["sku", "name", "category", "baseUom"],
        properties: {
          sku: { type: "string", minLength: 1, maxLength: 50 },
          name: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string" },
          category: { type: "string", enum: ["PRODUCTION", "PACKAGING", "FACILITY", "CHEMICAL_MRO"] },
          baseUom: { type: "string", enum: ["EA", "FT", "YD", "ROLL"] },
          reorderPointBase: { type: "number" },
          costBase: { type: "number" },
          barcode: { type: "string" },
        },
      },
      ItemUpdate: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          reorderPointBase: { type: "number" },
          costBase: { type: "number" },
          barcode: { type: "string" },
        },
      },
      InventoryBalance: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          siteId: { type: "string", format: "uuid" },
          itemId: { type: "string", format: "uuid" },
          locationId: { type: "string", format: "uuid" },
          qtyBase: { type: "number" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      InventoryEvent: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          siteId: { type: "string", format: "uuid" },
          eventType: { type: "string", enum: ["RECEIVE", "MOVE", "ISSUE_TO_WORKCELL", "RETURN", "SCRAP", "HOLD", "RELEASE", "COUNT", "ADJUST"] },
          itemId: { type: "string", format: "uuid" },
          qtyEntered: { type: "number" },
          uomEntered: { type: "string" },
          qtyBase: { type: "number" },
          fromLocationId: { type: "string", format: "uuid" },
          toLocationId: { type: "string", format: "uuid" },
          notes: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TransactionCreate: {
        type: "object",
        required: ["siteId", "eventType", "itemId", "qtyEntered", "uomEntered"],
        properties: {
          siteId: { type: "string", format: "uuid" },
          eventType: { type: "string", enum: ["RECEIVE", "MOVE", "ISSUE_TO_WORKCELL", "RETURN", "SCRAP", "HOLD", "RELEASE", "COUNT", "ADJUST"] },
          itemId: { type: "string", format: "uuid" },
          qtyEntered: { type: "number" },
          uomEntered: { type: "string", enum: ["EA", "FT", "YD", "ROLL"] },
          fromLocationId: { type: "string", format: "uuid" },
          toLocationId: { type: "string", format: "uuid" },
          reasonCodeId: { type: "string", format: "uuid" },
          notes: { type: "string" },
        },
      },
      Job: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          siteId: { type: "string", format: "uuid" },
          jobNumber: { type: "string" },
          description: { type: "string" },
          status: { type: "string" },
          scheduledDate: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      PurchaseOrder: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          poNumber: { type: "string" },
          status: { type: "string", enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"] },
          orderDate: { type: "string", format: "date-time" },
          total: { type: "number" },
        },
      },
      CycleCount: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          name: { type: "string" },
          type: { type: "string", enum: ["FULL", "ABC", "RANDOM", "LOCATION", "ITEM"] },
          status: { type: "string", enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
          scheduledDate: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          details: { type: "object" },
        },
      },
    },
  },
};

export default openApiSpec;
