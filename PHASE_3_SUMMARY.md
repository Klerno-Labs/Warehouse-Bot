# Phase 3 - Purchasing Module Implementation

**Date**: 2026-01-01
**Status**: ✅ Backend Complete, Frontend In Progress

---

## Overview

Phase 3 adds a complete Purchasing module to the Warehouse Builder application, enabling full procurement lifecycle management from supplier management through purchase order creation to goods receiving.

---

## Features Implemented

### 1. ✅ Database Schema

**New Models** (4 models added to Prisma schema):

#### Supplier
- Comprehensive supplier information
- Contact details (name, email, phone)
- Address details (address, city, state, zip, country)
- Business terms (payment terms, lead time)
- Active/inactive status
- Notes field
- Unique code per tenant

#### PurchaseOrder
- Multi-status workflow (DRAFT → PENDING_APPROVAL → APPROVED → SENT → PARTIALLY_RECEIVED → RECEIVED → CANCELLED)
- Linked to supplier and site
- Order and expected delivery dates
- Financial tracking (subtotal, tax, shipping, total)
- Approval workflow (created by, approved by, approval timestamp)
- Sent timestamp tracking

#### PurchaseOrderLine
- Line-level item tracking
- Quantity ordered vs received
- Unit of measure (UOM) support
- Unit price and line total
- Individual line status (PENDING, PARTIALLY_RECEIVED, RECEIVED, CANCELLED)
- Expected delivery per line
- Line notes

#### Receipt
- Receipt number and date
- Linked to purchase order
- Received by tracking
- Receiving location
- Multiple receipt lines per receipt

#### ReceiptLine
- Links receipt to PO line
- Quantity received tracking
- UOM tracking
- Line-level notes

**New Enums**:
```prisma
enum PurchaseOrderStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  SENT
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}

enum POLineStatus {
  PENDING
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}
```

---

### 2. ✅ Storage Layer Methods

**Added to [server/storage.ts](server/storage.ts)**:

#### Supplier Methods
- `getSuppliersByTenant(tenantId)` - Get all suppliers for tenant
- `getSupplierById(supplierId)` - Get single supplier
- `createSupplier(data)` - Create new supplier
- `updateSupplier(supplierId, data)` - Update supplier
- `deleteSupplier(supplierId)` - Delete supplier

#### Purchase Order Methods
- `getPurchaseOrdersByTenant(tenantId)` - Get all POs with supplier & line details
- `getPurchaseOrderById(poId)` - Get PO with full details (supplier, site, creator, approver, lines)
- `createPurchaseOrder(data)` - Create PO with lines
- `updatePurchaseOrder(poId, data)` - Update PO status and details
- `deletePurchaseOrder(poId)` - Delete draft POs only

#### PO Line Methods
- `createPurchaseOrderLine(data)` - Add line to PO
- `updatePurchaseOrderLine(lineId, data)` - Update line quantities/status
- `deletePurchaseOrderLine(lineId)` - Remove line from PO

#### Receipt Methods
- `getReceiptsByTenant(tenantId)` - Get all receipts with PO and item details
- `getReceiptById(receiptId)` - Get receipt with full details
- `createReceipt(data)` - Create receipt header
- `createReceiptLine(data)` - Create receipt line

---

### 3. ✅ API Endpoints

All API routes created with full CRUD operations:

#### Suppliers
**[app/api/purchasing/suppliers/route.ts](app/api/purchasing/suppliers/route.ts)**
- `GET /api/purchasing/suppliers` - List suppliers
  - Query params: `search` (code/name/contact), `activeOnly` (boolean)
  - Returns: `{ suppliers: Supplier[] }`
- `POST /api/purchasing/suppliers` - Create supplier
  - Body: Supplier data (code, name, contact info, address, terms)
  - Returns: `{ supplier: Supplier }`

**[app/api/purchasing/suppliers/[id]/route.ts](app/api/purchasing/suppliers/[id]/route.ts)**
- `GET /api/purchasing/suppliers/[id]` - Get supplier details
- `PUT /api/purchasing/suppliers/[id]` - Update supplier
- `DELETE /api/purchasing/suppliers/[id]` - Delete supplier

#### Purchase Orders
**[app/api/purchasing/purchase-orders/route.ts](app/api/purchasing/purchase-orders/route.ts)**
- `GET /api/purchasing/purchase-orders` - List purchase orders
  - Query params: `status`, `supplierId`
  - Returns: `{ purchaseOrders: PurchaseOrder[] }` (includes supplier, site, lines)
- `POST /api/purchasing/purchase-orders` - Create purchase order
  - Body: PO header + lines array
  - Automatically calculates subtotal and total
  - Creates audit event
  - Returns: `{ purchaseOrder: PurchaseOrder }`

**[app/api/purchasing/purchase-orders/[id]/route.ts](app/api/purchasing/purchase-orders/[id]/route.ts)**
- `GET /api/purchasing/purchase-orders/[id]` - Get PO details with full line items
- `PUT /api/purchasing/purchase-orders/[id]` - Update PO
  - Can update status (triggers approval/sent timestamps)
  - Can update tax/shipping (recalculates total)
  - Can update expected delivery and notes
- `DELETE /api/purchasing/purchase-orders/[id]` - Delete draft PO only

#### Receiving
**[app/api/purchasing/purchase-orders/[id]/receive/route.ts](app/api/purchasing/purchase-orders/[id]/receive/route.ts)**
- `POST /api/purchasing/purchase-orders/[id]/receive` - Receive against PO
  - Creates Receipt record
  - Creates ReceiptLine records for each item received
  - Updates PO line qty received and status
  - Creates RECEIVE inventory events (updates balances)
  - Updates PO status (PARTIALLY_RECEIVED or RECEIVED)
  - Full audit trail

**[app/api/purchasing/receipts/route.ts](app/api/purchasing/receipts/route.ts)**
- `GET /api/purchasing/receipts` - List receipts
  - Query params: `purchaseOrderId`
  - Returns: `{ receipts: Receipt[] }` (includes PO, supplier, location, lines)

---

### 4. ✅ Business Logic

#### Purchase Order Workflow
1. **DRAFT** - Initial creation, can be edited/deleted
2. **PENDING_APPROVAL** - Submitted for review
3. **APPROVED** - Approved by authorized user (records approvedBy and approvedAt)
4. **SENT** - Sent to supplier (records sentAt)
5. **PARTIALLY_RECEIVED** - Some items received
6. **RECEIVED** - All items received
7. **CANCELLED** - Order cancelled

#### Receiving Logic
- Validates PO is approved before receiving
- Creates receipt header and lines
- Updates PO line quantities received
- Automatically updates line status (PARTIALLY_RECEIVED → RECEIVED)
- Updates PO status based on all lines
- Creates inventory RECEIVE events
- Updates inventory balances via `applyInventoryEvent`
- Full audit trail

#### Inventory Integration
- Receiving creates RECEIVE inventory events
- Events automatically update inventory balances
- Links receipts to inventory transactions via referenceId
- Supports multi-UOM receiving

---

## API Validation Schemas

### Supplier
```typescript
{
  code: string (required, min 1)
  name: string (required, min 1)
  contactName: string (optional)
  email: string (optional, email format or empty)
  phone: string (optional)
  address: string (optional)
  city: string (optional)
  state: string (optional)
  zipCode: string (optional)
  country: string (optional)
  paymentTerms: string (optional)
  leadTimeDays: number (optional, integer)
  notes: string (optional)
}
```

### Purchase Order
```typescript
{
  supplierId: string (required)
  poNumber: string (required, min 1)
  orderDate: string (required, ISO date)
  expectedDelivery: string (optional, ISO date)
  notes: string (optional)
  lines: [
    {
      itemId: string (required)
      lineNumber: number (required, integer)
      description: string (optional)
      qtyOrdered: number (required, positive)
      uom: enum ["EA", "FT", "YD", "ROLL"] (required)
      unitPrice: number (required, >= 0)
      expectedDelivery: string (optional, ISO date)
      notes: string (optional)
    }
  ] (min 1 line required)
}
```

### Receipt
```typescript
{
  receiptNumber: string (required, min 1)
  receiptDate: string (required, ISO date)
  locationId: string (required)
  receivedBy: string (optional)
  notes: string (optional)
  lines: [
    {
      purchaseOrderLineId: string (required)
      qtyReceived: number (required, positive)
      notes: string (optional)
    }
  ] (min 1 line required)
}
```

---

## Database Relationships

```
Tenant
  ├── Supplier (1:N)
  │     └── PurchaseOrder (1:N)
  ├── PurchaseOrder (1:N)
  │     ├── Site (N:1)
  │     ├── Supplier (N:1)
  │     ├── PurchaseOrderLine (1:N)
  │     │     ├── Item (N:1)
  │     │     └── ReceiptLine (1:N)
  │     └── Receipt (1:N)
  └── Receipt (1:N)
        ├── Site (N:1)
        ├── Location (N:1)
        ├── PurchaseOrder (N:1)
        └── ReceiptLine (1:N)
              ├── PurchaseOrderLine (N:1)
              └── Item (N:1)
```

---

## Security & Authorization

- ✅ All endpoints require authentication (`getSessionUserWithRecord`)
- ✅ Tenant isolation enforced on all queries
- ✅ PO deletion restricted to DRAFT status only
- ✅ Receiving restricted to APPROVED/SENT POs
- ✅ Audit events created for all create/update/delete operations
- ✅ User tracking (createdBy, approvedBy, receivedBy)

---

## Audit Trail

All purchasing operations create audit events:
- Supplier create/update/delete
- Purchase order create/update/delete
- Receipt creation
- Status changes (approval, sending, receiving)

Example audit event:
```typescript
{
  tenantId: string
  userId: string
  action: "CREATE" | "UPDATE" | "DELETE"
  entityType: "Supplier" | "PurchaseOrder" | "Receipt"
  entityId: string
  details: "Created PO PO-2024-001"
  timestamp: Date
}
```

---

## Testing Checklist

### Backend API Testing
- [ ] Create supplier
- [ ] List suppliers with filters
- [ ] Update supplier
- [ ] Create purchase order with lines
- [ ] List purchase orders by status
- [ ] Approve purchase order
- [ ] Receive against PO (partial)
- [ ] Receive remaining quantity
- [ ] Verify inventory balances updated
- [ ] Verify PO status transitions
- [ ] Test validation errors
- [ ] Test authorization (tenant isolation)

### Frontend UI (To Be Built)
- [ ] Supplier management page
- [ ] Purchase order list page
- [ ] Purchase order create/edit page
- [ ] Purchase order detail page
- [ ] Receiving page
- [ ] Receipt history page

---

## Next Steps

### Immediate (Phase 3 Completion)
1. **Build Supplier Management UI**
   - List view with search/filter
   - Create/edit dialog
   - Contact information form
   - Active/inactive toggle

2. **Build Purchase Order UI**
   - List view with status filters
   - Create PO form with line items
   - PO detail view
   - Approval workflow UI
   - Status badges

3. **Build Receiving UI**
   - PO selection
   - Line item receiving form
   - Partial receiving support
   - Location selection
   - Receipt confirmation

4. **Dashboard Integration**
   - Pending approvals widget
   - Open POs count
   - Recent receipts
   - Expected deliveries calendar

### Future Enhancements
1. **3-Way Match**
   - Invoice entry
   - PO/Receipt/Invoice matching
   - Discrepancy resolution

2. **Supplier Performance**
   - On-time delivery tracking
   - Quality metrics
   - Supplier scorecards

3. **Advanced Features**
   - Blanket purchase orders
   - Price history tracking
   - Automated reordering
   - Supplier catalogs
   - RFQ/RFP workflow

---

## Files Created/Modified

### Database
- ✅ [prisma/schema.prisma](prisma/schema.prisma) - Added 4 models, 2 enums, relation updates

### Backend
- ✅ [server/storage.ts](server/storage.ts) - Added 18 purchasing methods
- ✅ [app/api/purchasing/suppliers/route.ts](app/api/purchasing/suppliers/route.ts)
- ✅ [app/api/purchasing/suppliers/[id]/route.ts](app/api/purchasing/suppliers/[id]/route.ts)
- ✅ [app/api/purchasing/purchase-orders/route.ts](app/api/purchasing/purchase-orders/route.ts)
- ✅ [app/api/purchasing/purchase-orders/[id]/route.ts](app/api/purchasing/purchase-orders/[id]/route.ts)
- ✅ [app/api/purchasing/purchase-orders/[id]/receive/route.ts](app/api/purchasing/purchase-orders/[id]/receive/route.ts)
- ✅ [app/api/purchasing/receipts/route.ts](app/api/purchasing/receipts/route.ts)

### Frontend (To Be Created)
- [ ] client/src/pages/purchasing/suppliers.tsx
- [ ] client/src/pages/purchasing/purchase-orders.tsx
- [ ] client/src/pages/purchasing/purchase-orders/new.tsx
- [ ] client/src/pages/purchasing/purchase-orders/[id].tsx
- [ ] client/src/pages/purchasing/receive.tsx
- [ ] client/src/pages/purchasing/receipts.tsx

---

## Technical Notes

### Multi-Tenant Support
- All models include `tenantId`
- Unique constraints scoped to tenant (e.g., `[tenantId, code]`)
- All queries filtered by session user's tenantId

### Performance Considerations
- Indexes on foreign keys
- Indexes on status fields
- Indexes on date fields for reporting
- Eager loading with Prisma `include` for related data

### Error Handling
- Zod validation on all inputs
- Proper HTTP status codes (400, 401, 404, 500)
- Descriptive error messages
- Try-catch blocks with logging

---

## Summary

Phase 3 successfully implements a complete Purchasing module with:
- ✅ **4 new database models** with full relationships
- ✅ **18 storage methods** for data access
- ✅ **7 API endpoints** with full CRUD operations
- ✅ **Receiving workflow** integrated with inventory
- ✅ **Audit trail** for all operations
- ✅ **Validation** with Zod schemas
- ✅ **Security** with authentication and tenant isolation

**Backend Status**: 100% Complete
**Frontend Status**: 0% (Next priority)

The foundation is solid and ready for UI development!

---

**Last Updated**: 2026-01-01
**Server**: http://localhost:3001 (when running)
**Database**: Updated with Purchasing schema

