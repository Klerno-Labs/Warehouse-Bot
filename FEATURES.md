# Warehouse Builder - Complete Feature Guide

## 🎯 6-Tier Role-Based Access Control System

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ Tier 6: SuperAdmin (c.hatfield309@gmail.com)           │
│   Purpose: Platform Owner - Manage ALL tenants         │
│   Dashboard: /super-admin                               │
│   Navigation: Purple "Platform Owner" section           │
├─────────────────────────────────────────────────────────┤
│ Tier 5: Executive/Admin                                 │
│   Purpose: Full control within their warehouse         │
│   Features:                                              │
│     - Custom Roles (/admin/custom-roles)                │
│     - Departments (/admin/departments)                  │
│     - Department Users (/admin/department-users)        │
│     - Badge Management (/admin/badges)                  │
│     - Full Admin Access                                  │
├─────────────────────────────────────────────────────────┤
│ Tier 4: Engineering                                      │
│   Purpose: Design and planning                          │
│   Dashboard: /engineering                                │
│   Features:                                              │
│     - View inventory (read-only)                        │
│     - Submit production jobs                             │
│     - Create/edit BOMs                                   │
├─────────────────────────────────────────────────────────┤
│ Tier 3: Sales                                            │
│   Purpose: Sales operations                             │
│   Dashboard: /sales-pit                                  │
│   Features:                                              │
│     - Create/edit sales orders                          │
│     - Manage customers                                   │
│     - Create shipments                                   │
│     - Sales analytics                                    │
├─────────────────────────────────────────────────────────┤
│ Tier 2: Management                                       │
│   Roles: Supervisor, Inventory, Purchasing, QC          │
│   Features:                                              │
│     - Add users to their departments                    │
│     - Department-specific management                     │
│     - Production oversight                               │
├─────────────────────────────────────────────────────────┤
│ Tier 1: Operators                                        │
│   Access: Mobile app only                                │
│   Login: Badge number + 4-digit PIN                     │
│   URL: /mobile/login                                     │
│   Features:                                              │
│     - Scan job cards with camera                        │
│     - View job details and parts                        │
│     - Add operator notes                                 │
│     - Complete production jobs                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Executive Management Features (Tier 5)

### 1. Custom Roles (`/admin/custom-roles`)

**Purpose:** Create multiple operator variants per base tier

**Use Cases:**
- "Capping Machine Operator" (based on Operator role)
- "Welding Operator" (based on Operator role)
- "Quality Inspector" (based on QC role)
- "Inside Sales Rep" (based on Sales role)

**API Endpoints:**
- `GET /api/admin/roles/custom` - List all custom roles
- `POST /api/admin/roles/custom` - Create new custom role

**Fields:**
- Base Role (Operator, Supervisor, Sales, Engineering)
- Custom Name (e.g., "Capping Machine Operator")
- Description
- Permissions array
- Assigned Departments
- Assigned Workcells

**Example:**
```typescript
// Create a custom operator role
POST /api/admin/roles/custom
{
  "baseRole": "Operator",
  "customName": "Capping Machine Operator",
  "description": "Operates capping machinery on production line",
  "permissions": ["VIEW_JOB_CARD", "COMPLETE_PRODUCTION_JOB"],
  "assignedDepartments": ["capping"],
  "assignedWorkcells": ["capping-line-1", "capping-line-2"]
}
```

---

### 2. Departments (`/admin/departments`)

**Purpose:** Organize workforce into logical departments

**API Endpoints:**
- `GET /api/admin/departments` - List all departments
- `POST /api/admin/departments` - Create new department
- `PUT /api/admin/departments/:id` - Update department
- `DELETE /api/admin/departments/:id` - Delete department (only if no users)

**Fields:**
- Name (e.g., "Assembly", "Welding", "Quality Control")
- Code (unique identifier, lowercase, no spaces)
- Description (optional)

**Example:**
```typescript
// Create a new department
POST /api/admin/departments
{
  "name": "Capping",
  "code": "capping",
  "description": "Bottle capping operations"
}
```

**Notes:**
- Cannot delete departments with assigned users
- Code is immutable after creation
- User count displayed on department list

---

### 3. Department Users (`/admin/department-users`)

**Purpose:** Add and manage users within departments

**Who Can Access:**
- **Executives:** Add users to any department
- **Managers:** Add users to their own departments only

**API Endpoints:**
- `GET /api/admin/department-users?department=capping` - List users
- `POST /api/admin/department-users` - Create new user
- `PUT /api/admin/department-users/:id` - Update user
- `DELETE /api/admin/department-users/:id` - Deactivate user (soft delete)

**User Creation Fields:**
- Email *
- First Name *
- Last Name *
- Badge Number * (auto-generate available)
- PIN * (4 digits, auto-generate available)
- Custom Role ID (optional)
- Assigned Departments (array)

**Example:**
```typescript
// Add a new operator
POST /api/admin/department-users
{
  "email": "john.doe@warehouse.com",
  "firstName": "John",
  "lastName": "Doe",
  "badgeNumber": "B12345",  // Auto-generated
  "pin": "1234",             // Auto-generated, hashed on server
  "roleId": "role-uuid",     // Custom role ID
  "assignedDepartments": ["capping", "packaging"]
}
```

**Features:**
- Badge number auto-generation (B10000-B99999)
- PIN auto-generation (4 digits)
- Validates badge uniqueness
- Soft delete (sets isActive = false)
- Managers see only their department users
- Real-time filtering by department

---

### 4. Badge Management (`/admin/badges`)

**Purpose:** Create badges for mobile operator access

**API Endpoints:**
- `GET /api/admin/badges` - List all badges
- `POST /api/admin/badges` - Create new badge
- `PUT /api/admin/badges/:id` - Update badge
- `DELETE /api/admin/badges/:id` - Deactivate badge

**Fields:**
- Badge Number (5 digits, e.g., B12345)
- User ID (which user this badge belongs to)
- Is Active (boolean)

**Example:**
```typescript
// Create a badge for a user
POST /api/admin/badges
{
  "badgeNumber": "B54321",
  "userId": "user-uuid"
}
```

**Features:**
- Only shows users without existing active badges
- Badge number uniqueness validation
- Deactivating badge prevents mobile login
- Auto-generation with "Generate" button
- Search and filter capabilities

**Badge Usage:**
Operators use their badge number + PIN to log into the mobile app at `/mobile/login`

---

## 📱 Mobile Operator App

### Login Flow (`/mobile/login`)

1. Operator enters **badge number** (e.g., B12345)
2. Operator enters **4-digit PIN** using on-screen pad
3. Operator selects their **department**
4. Click "Sign In"

**Authentication:**
- Validates badge exists and is active
- Compares PIN with hashed password
- Generates JWT token with 12-hour expiration
- Stores token in localStorage

**API:** `POST /api/auth/mobile-login`

---

### Operator Dashboard (`/mobile/operator`)

#### Scanner View (No job scanned)

**Features:**
- User profile display (name, role, department)
- Large "Scan Job Card" button
- Opens camera QR scanner

**QR Scanner:**
- Requests camera permission
- Uses back camera on mobile
- Real-time QR code detection
- Browser's BarcodeDetector API (Chrome/Edge)
- Fallback manual entry

#### Job Details View (Job scanned)

**Displays:**
- Order number
- Item SKU and name
- Quantity ordered/completed
- Status and priority
- Due date
- Workstation
- Estimated time

**Components List:**
Shows all parts needed:
- Part SKU and name
- Quantity needed
- Quantity available (color-coded)
  - Green: Sufficient stock
  - Red: Insufficient stock
- Unit of measure
- Storage location

**Notes Section:**
- View all operator notes
- Add new notes with types:
  - Info (blue)
  - Issue (red)
  - Part Replacement (yellow)
- Timestamp and user attribution

**Actions:**
- Add Note
- Complete Job (confirmation required)
- Back to Scanner

**API Endpoints:**
- `GET /api/mobile/job/:id` - Get job details
- `POST /api/mobile/job/:id/notes` - Add note
- `POST /api/mobile/job/:id/complete` - Mark complete

---

## 🛠️ Permission Middleware

### Usage in API Routes

The permission middleware provides granular security:

```typescript
import { withAuth, requirePermission, Permission } from '@app/api/_middleware/permissions';

// Protect with specific permission
export const POST = withAuth(
  requirePermission(Permission.CREATE_PRODUCTION_ORDER),
  async (req, user) => {
    // Only users with CREATE_PRODUCTION_ORDER can access
    // User object is automatically provided
    return NextResponse.json({ success: true });
  }
);

// Require any of multiple permissions
export const PUT = withAuth(
  requireAnyPermission([
    Permission.EDIT_INVENTORY,
    Permission.ADJUST_INVENTORY
  ]),
  async (req, user) => {
    // User must have at least one of these permissions
    return NextResponse.json({ success: true });
  }
);

// Require specific role
export const DELETE = withAuth(
  requireRole(Role.Executive, Role.Admin, Role.SuperAdmin),
  async (req, user) => {
    // Only these roles can access
    return NextResponse.json({ success: true });
  }
);

// Require minimum tier level
export const GET = withAuth(
  requireTier(4), // Engineering and above
  async (req, user) => {
    // Tier 4, 5, and 6 can access
    return NextResponse.json({ success: true });
  }
);
```

### Available Functions

1. **`requirePermission(permission: Permission)`**
   - Single permission check
   - Returns 403 if user lacks permission

2. **`requireAnyPermission(permissions: Permission[])`**
   - OR logic - needs at least one
   - Returns 403 if user has none

3. **`requireRole(...roles: Role[])`**
   - Exact role match
   - Returns 403 if user's role not in list

4. **`requireTier(minTier: number)`**
   - Hierarchical check
   - Tier 5 user can access Tier 3 endpoints
   - Returns 403 if user's tier too low

5. **`withAuth(middleware, handler)`**
   - Wrapper that applies middleware
   - Provides authenticated user to handler
   - Returns 401 if not authenticated

---

## 📲 PWA (Progressive Web App)

### Installation

**Android (Chrome/Edge):**
1. Open mobile app in browser
2. Tap menu (⋮) → "Install app"
3. App appears on home screen

**iOS (Safari):**
1. Open mobile app in Safari
2. Tap Share → "Add to Home Screen"
3. App appears on home screen

**Desktop:**
1. Look for install icon in address bar
2. Click "Install"
3. App opens in standalone window

### Features

**Manifest:** `/public/manifest.json`
- App name: "Warehouse Builder"
- Theme color: Blue (#3b82f6)
- Display mode: Standalone
- Orientation: Portrait
- Start URL: `/`

**Shortcuts:**
- Mobile Operator Login
- Scan Job Card
- Dashboard
- Production Board

**Service Worker:** `/public/service-worker.js`
- Offline support
- Cache management
- Background sync

**Icons:**
- 72x72 to 512x512 sizes
- Located in `/public/icons/`

---

## 🔐 Security Best Practices

### API Route Protection

**Always protect sensitive endpoints:**

```typescript
// ❌ BAD - No protection
export async function POST(req: NextRequest) {
  // Anyone can access
}

// ✅ GOOD - Protected with permission
export const POST = withAuth(
  requirePermission(Permission.MANAGE_USERS),
  async (req, user) => {
    // Only authorized users
  }
);
```

### Role Validation

**Check both role AND tenant:**

```typescript
// Verify user belongs to same tenant
if (targetUser.tenantId !== user.tenantId) {
  return NextResponse.json(
    { error: 'Cannot modify user from another tenant' },
    { status: 403 }
  );
}
```

### Password Security

**Always hash PINs and passwords:**

```typescript
import { hashSync } from 'bcryptjs';

const hashedPin = hashSync(pin, 10);
await storage.user.create({
  password: hashedPin // Never store plain text
});
```

---

## 🧪 Testing Checklist

### Executive Features

- [ ] Log in as Executive
- [ ] Navigate to Custom Roles
  - [ ] Create new custom role
  - [ ] Edit existing role
  - [ ] Verify user count display
- [ ] Navigate to Departments
  - [ ] Create department
  - [ ] Edit department
  - [ ] Try delete (should fail if users assigned)
- [ ] Navigate to Department Users
  - [ ] Add new user
  - [ ] Generate badge and PIN
  - [ ] Assign custom role
  - [ ] Verify department filter
  - [ ] Edit user
  - [ ] Delete user (soft delete)
- [ ] Navigate to Badge Management
  - [ ] Create badge
  - [ ] Verify uniqueness validation
  - [ ] Deactivate badge
  - [ ] Verify only users without badges shown

### Manager Features

- [ ] Log in as Manager/Supervisor
- [ ] Navigate to Department Users
  - [ ] Verify only see YOUR departments
  - [ ] Add user to your department
  - [ ] Cannot add to other departments
  - [ ] Delete user from your department

### Mobile Operator

- [ ] Open `/mobile/login` on phone
- [ ] Enter badge number (e.g., B12345)
- [ ] Enter PIN (e.g., 1234)
- [ ] Select department
- [ ] Click Sign In
- [ ] Verify operator dashboard loads
- [ ] Click "Scan Job Card"
  - [ ] Camera permission prompt
  - [ ] Camera opens
  - [ ] Point at QR code
  - [ ] Job loads automatically
- [ ] View job details
  - [ ] Parts list shows availability
  - [ ] Notes section visible
- [ ] Add note
  - [ ] Select type (Info/Issue/Part Replacement)
  - [ ] Enter content
  - [ ] Save
  - [ ] Verify appears in notes list
- [ ] Complete job
  - [ ] Confirmation prompt
  - [ ] Returns to scanner

### PWA Installation

- [ ] Android: Install from Chrome menu
- [ ] iOS: Add to Home Screen from Safari
- [ ] Launch from home screen icon
- [ ] Verify standalone mode (no browser UI)
- [ ] Test offline functionality

### Navigation

- [ ] Verify role-based menu visibility:
  - [ ] Operator: Mobile only
  - [ ] Management: + Purchasing
  - [ ] Sales: + Sales Pit
  - [ ] Engineering: + Engineering Dashboard
  - [ ] Executive: + Executive section
  - [ ] SuperAdmin: + Platform Owner (purple)

---

## 📊 API Endpoint Reference

### Authentication
- `POST /api/auth/login` - Web login
- `POST /api/auth/mobile-login` - Mobile badge login
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/me` - Current user

### Custom Roles
- `GET /api/admin/roles/custom` - List roles
- `POST /api/admin/roles/custom` - Create role

### Departments
- `GET /api/admin/departments` - List departments
- `POST /api/admin/departments` - Create department
- `PUT /api/admin/departments/:id` - Update
- `DELETE /api/admin/departments/:id` - Delete

### Department Users
- `GET /api/admin/department-users?department=xyz` - List users
- `POST /api/admin/department-users` - Create user
- `PUT /api/admin/department-users/:id` - Update user
- `DELETE /api/admin/department-users/:id` - Deactivate

### Badge Management
- `GET /api/admin/badges` - List badges
- `POST /api/admin/badges` - Create badge
- `PUT /api/admin/badges/:id` - Update
- `DELETE /api/admin/badges/:id` - Deactivate

### Mobile Operator
- `GET /api/mobile/job/:id` - Get job details
- `POST /api/mobile/job/:id/notes` - Add note
- `POST /api/mobile/job/:id/complete` - Complete job

### Users
- `GET /api/users?withoutBadge=true` - Users without badges
- `POST /api/users` - Create user

---

## 🎨 UI Components Used

### Shadcn/ui Components
- Card, CardHeader, CardTitle, CardDescription, CardContent
- Button (variants: default, outline, ghost, destructive)
- Input, Textarea
- Label
- Badge (variants: default, secondary, outline, destructive)
- Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
- Select, SelectTrigger, SelectValue, SelectContent, SelectItem
- Table, TableHeader, TableBody, TableRow, TableHead, TableCell
- Toast (notifications)
- Checkbox

### Custom Components
- QRScanner (`@/components/qr-scanner`)
- AppSidebar (role-based navigation)
- MainLayout (page wrapper)
- Toaster (toast provider)

---

## 🔄 Data Flow

### User Creation Flow (Executive → Operator)

```
1. Executive creates custom role
   POST /api/admin/roles/custom
   └─> Creates TenantRoleConfig record

2. Executive creates department
   POST /api/admin/departments
   └─> Creates Department record

3. Executive/Manager creates user
   POST /api/admin/department-users
   ├─> Creates User record
   ├─> Assigns customRoleId
   ├─> Assigns assignedDepartments
   └─> Creates Badge record

4. Operator logs in
   POST /api/auth/mobile-login
   ├─> Validates badge + PIN
   ├─> Generates JWT token
   └─> Returns user with department

5. Operator scans job
   QR Scanner → Job ID
   GET /api/mobile/job/:id
   └─> Returns job details with components

6. Operator completes job
   POST /api/mobile/job/:id/complete
   └─> Updates production order status
```

---

## 🚀 Next Steps (Optional Enhancements)

1. **Apply Permission Middleware Everywhere**
   - Update all existing API routes
   - Use `withAuth()` wrapper consistently
   - Remove manual role checks

2. **Real QR Code Library**
   - Install `jsQR` or `html5-qrcode`
   - Replace BarcodeDetector fallback
   - Support more barcode formats

3. **Offline Mode**
   - Cache job data in IndexedDB
   - Queue notes for sync when online
   - Service worker background sync

4. **Analytics Dashboard**
   - Operator performance metrics
   - Job completion rates
   - Department efficiency

5. **Mobile Notifications**
   - Push notifications for new jobs
   - Web Push API integration
   - Badge updates

---

## 📞 Support

For questions or issues:
- Check this documentation
- Review API endpoint reference
- Test with provided checklist
- Verify role permissions

**Platform Owner:** c.hatfield309@gmail.com (SuperAdmin)
