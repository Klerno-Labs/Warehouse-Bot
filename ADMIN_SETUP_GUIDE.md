# 🔐 Admin Setup Guide - Complete System Access

## Overview

This guide will help you set up your **Admin account** with full system access to manage users, customize workflows, configure branding, and control all aspects of your Warehouse Builder system.

---

## ✅ What's Been Created

### 1. **Admin Dashboard** ✅
**Location:** `/admin/dashboard`

**Features:**
- System overview with key metrics
- Total users count (active/inactive)
- Department and routing counts
- System health status
- Quick access cards to all admin functions
- Company information display
- Admin privileges help section

**Access Level:** Admin role only

---

### 2. **User Management System** ✅
**Location:** `/admin/users`

**Features:**
- **View all users** in your organization
- **Create new users** with role assignment
- **Edit users** (name, email, role, password)
- **Activate/deactivate** user accounts
- **Search users** by name, email, or role
- **Role badges** with visual indicators
- **Admin indicators** for admin users

**Available Roles:**
- **Admin** - Full system access (you!)
- **Supervisor** - Production management
- **Inventory** - Inventory control
- **Operator** - Production floor
- **Sales** - Order processing
- **Purchasing** - Procurement
- **Maintenance** - Equipment
- **QC** - Quality control
- **Viewer** - Read-only access

**Access Level:** Admin role only

---

### 3. **Admin Stats API** ✅
**Endpoint:** `GET /api/admin/stats`

**Returns:**
- Total users count
- Active users count
- Total departments count
- Total routings count
- Tenant information (name, logo, color)
- Recent activity log

**Access Level:** Admin role only

---

## 🚀 Quick Start - Setting Up Your Admin Account

### Step 1: Verify Your Admin Role

First, check if your user account has Admin role:

```sql
-- Check your current role
SELECT id, email, role, "firstName", "lastName"
FROM "User"
WHERE email = 'your-email@example.com';
```

If you're not an Admin, update your role:

```sql
-- Set yourself as Admin
UPDATE "User"
SET role = 'Admin'
WHERE email = 'your-email@example.com';
```

### Step 2: Log In and Access Admin Dashboard

1. **Log in** to your Warehouse Builder account
2. Navigate to `/admin/dashboard`
3. You should see the **Admin Dashboard** with full system access

If you see "Forbidden" error, your role isn't set to Admin yet.

---

## 🎛️ Complete Admin Feature Overview

### Available Admin Pages:

#### 1. **Admin Dashboard** - `/admin/dashboard`
Your central control panel with:
- System statistics
- Quick access to all admin functions
- Company information
- System health status

#### 2. **User Management** - `/admin/users`
Manage all user accounts:
- Create new users
- Edit existing users
- Change user roles
- Activate/deactivate accounts
- Search and filter users

#### 3. **Department Configuration** - `/admin/departments`
Configure custom departments:
- Create unlimited departments
- Set colors and icons
- Configure concurrent job rules
- Set QC requirements
- Define default durations
- Reorder departments

#### 4. **Production Routings** - `/admin/routings`
Design workflow paths:
- Create production routings
- Build multi-step workflows
- Set item-specific or generic routings
- Configure step requirements
- Set time estimates
- Mark default routings

#### 5. **Workflow Designer** - `/admin/workflow-designer`
Visual workflow tool:
- See horizontal workflow diagrams
- Review step sequences
- Analyze timing
- Identify QC requirements
- View summary statistics

#### 6. **Company Settings** - `/admin/settings/company`
Configure operational rules:
- Regional settings (currency, timezone)
- Date/time formats
- Fiscal year settings
- Work week configuration
- Default lead times
- PO approval limits
- Auto-receive settings

#### 7. **Branding** - `/admin/settings/branding`
Customize appearance:
- Upload company logo
- Set brand colors (primary/secondary)
- Upload favicon
- Add custom CSS
- Live preview

---

## 👥 User Management Guide

### Creating a New User:

1. Navigate to `/admin/users`
2. Click **"Add User"** button
3. Fill in the form:
   - First Name
   - Last Name
   - Email (must be unique)
   - Password (minimum 8 characters recommended)
   - Role (select appropriate role)
4. Click **"Create User"**

### Editing a User:

1. Find the user in the table
2. Click the **three dots menu** (⋯)
3. Select **"Edit"**
4. Update information:
   - Change name or email
   - Update role
   - Reset password (leave blank to keep current)
5. Click **"Update User"**

### Changing User Roles:

**Method 1: Via Edit Dialog**
- Click edit on user
- Select new role from dropdown
- Save changes

**Method 2: Quick Role Change**
- Click three dots menu
- Hover over "Change Role"
- Select new role (coming soon)

### Deactivating Users:

1. Find user in table
2. Click three dots menu
3. Select **"Deactivate"**
4. User status changes to "Inactive"
5. User can no longer log in

**Reactivate:** Same process, select "Activate"

---

## 🏢 Initial System Configuration

### Recommended Setup Order:

#### 1. **Configure Company Settings** (5 minutes)
Navigate to `/admin/settings/company`
- Set your currency (USD, EUR, etc.)
- Choose timezone
- Set date format preference
- Configure fiscal year start
- Set PO approval rules

#### 2. **Apply Branding** (5 minutes)
Navigate to `/admin/settings/branding`
- Upload company logo
- Set primary brand color
- Set secondary color
- Upload favicon
- Add custom CSS (optional)

#### 3. **Create Departments** (10 minutes)
Navigate to `/admin/departments`
- Create 3-5 core departments:
  - Example: Receiving, Assembly, QC, Packaging, Shipping
- Set different colors for each
- Add emoji icons (optional but helpful!)
- Configure settings per department

#### 4. **Define Production Routings** (15 minutes)
Navigate to `/admin/routings`
- Create a standard routing workflow
- Add steps from your departments
- Set estimated times
- Mark one as default
- Create item-specific routings as needed

#### 5. **Add Users** (10 minutes)
Navigate to `/admin/users`
- Add production managers (Supervisor role)
- Add inventory staff (Inventory role)
- Add operators (Operator role)
- Add QC inspectors (QC role)
- Assign appropriate roles

---

## 🔐 Admin Security Best Practices

### 1. **Protect Your Admin Account**
- Use a strong password (12+ characters)
- Don't share admin credentials
- Consider creating separate admin accounts if multiple administrators needed

### 2. **Principle of Least Privilege**
- Only assign Admin role to trusted users who need full system access
- Use Supervisor role for production managers who don't need user management
- Assign specific roles (Inventory, Operator, etc.) to staff who only need those functions

### 3. **Regular User Audits**
- Periodically review user list
- Deactivate accounts for users who left the company
- Update roles when responsibilities change

### 4. **Monitor System Changes**
- Check recent activity (coming soon on admin dashboard)
- Review who's making configuration changes
- Audit routing and department modifications

---

## 📊 Understanding System Statistics

### Dashboard Metrics Explained:

**Total Users**
- Count of all user accounts
- Includes both active and inactive

**Active Users**
- Currently active accounts
- These users can log in

**Departments**
- Custom departments you've configured
- Used in production routings

**Routings**
- Production workflow paths
- Used to guide jobs through departments

**System Status**
- Green/Healthy: All systems operational
- Monitor for issues

---

## 🎯 Common Admin Tasks

### Task 1: Add a New Production User

**Scenario:** New operator joining the team

1. Go to `/admin/users`
2. Click "Add User"
3. Enter details:
   - Name: John Smith
   - Email: john.smith@company.com
   - Password: (generate secure password)
   - Role: **Operator**
4. Create user
5. Share login credentials with John
6. John sees Operator-specific dashboard when logging in

---

### Task 2: Create a Custom Department

**Scenario:** Adding a new "Welding" department

1. Go to `/admin/departments`
2. Click "Add Department"
3. Configure:
   - Name: Welding
   - Code: WELD (unique identifier)
   - Color: Orange (#f59e0b)
   - Icon: 🔥
   - Allow concurrent: Yes (multiple jobs)
   - Require QC: Yes (inspection after welding)
   - Default duration: 45 minutes
4. Save department

---

### Task 3: Build a Production Routing

**Scenario:** Creating workflow for "Filter Assembly"

1. Go to `/admin/routings`
2. Click "Add Routing"
3. Configure:
   - Name: Filter Assembly Process
   - Description: Standard filter production
   - Item: Select specific filter item OR leave blank for generic
   - Default routing: Check if this is standard workflow
4. Add steps:
   - Step 1: Picking (15 min)
   - Step 2: Assembly (30 min, required)
   - Step 3: QC (10 min, required)
   - Step 4: Packaging (5 min)
5. Save routing
6. View in Workflow Designer to verify

---

### Task 4: Customize Company Branding

**Scenario:** Apply your company's visual identity

1. Go to `/admin/settings/branding`
2. Upload logo:
   - Use logo URL or upload to cloud storage
   - Recommended: PNG with transparent background, 200x50px
3. Set colors:
   - Primary: #3b82f6 (your brand blue)
   - Secondary: #64748b (supporting gray)
4. Upload favicon (optional):
   - 32x32px or 64x64px
5. Add custom CSS (advanced):
   ```css
   .header { font-family: 'Your Custom Font'; }
   ```
6. Save and refresh page to see changes

---

### Task 5: Change User Role

**Scenario:** Promoting operator to supervisor

1. Go to `/admin/users`
2. Find user in list
3. Click three dots menu
4. Select "Edit"
5. Change role from "Operator" to "Supervisor"
6. Save
7. User now sees Supervisor dashboard on next login

---

## 🆘 Troubleshooting

### Issue: "Forbidden" Error on Admin Pages

**Cause:** Your account doesn't have Admin role

**Solution:**
```sql
UPDATE "User"
SET role = 'Admin'
WHERE email = 'your-email@example.com';
```

---

### Issue: Can't See Admin Dashboard

**Cause:** Navigation not showing admin link

**Solution:**
- Manually navigate to `/admin/dashboard`
- Check your role is Admin
- Update navigation menu to include admin link

---

### Issue: Changes Not Appearing

**Cause:** Browser cache

**Solution:**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Try in incognito/private window

---

### Issue: User Can't Log In After Creation

**Possible Causes:**
1. Account set to inactive
2. Wrong password
3. Email typo

**Solutions:**
1. Check user status in users table - set to Active
2. Reset password via Edit user
3. Verify email spelling

---

## 📱 Admin Access Levels Summary

| Page/Feature | Admin | Supervisor | Other Roles |
|-------------|-------|------------|-------------|
| Admin Dashboard | ✅ Full | ❌ No | ❌ No |
| User Management | ✅ Full | ❌ No | ❌ No |
| Departments | ✅ Create/Edit/Delete | ✅ View Only | ❌ No |
| Routings | ✅ Create/Edit/Delete | ✅ Create/Edit | ❌ View Only |
| Workflow Designer | ✅ Full | ✅ View | ✅ View |
| Company Settings | ✅ Full | ❌ No | ❌ No |
| Branding | ✅ Full | ❌ No | ❌ No |
| Kanban Board | ✅ View All | ✅ View All | ✅ View Assigned |

---

## 🎉 You're All Set!

As an **Admin**, you now have complete control over your Warehouse Builder system:

✅ **User Management** - Add, edit, deactivate users
✅ **Department Configuration** - Unlimited custom departments
✅ **Workflow Design** - Flexible production routings
✅ **Company Customization** - Branding and settings
✅ **System Monitoring** - Dashboard statistics
✅ **Full Access** - All features and functions

### Next Steps:

1. ✅ Verify your Admin role
2. ✅ Log in and access `/admin/dashboard`
3. ✅ Configure company settings
4. ✅ Apply your branding
5. ✅ Create departments
6. ✅ Build production routings
7. ✅ Add your team members

**You're ready to manage your enterprise warehouse system! 🚀**

---

## 📞 Quick Reference

### Key URLs:
- Admin Dashboard: `/admin/dashboard`
- User Management: `/admin/users`
- Departments: `/admin/departments`
- Routings: `/admin/routings`
- Workflow Designer: `/admin/workflow-designer`
- Company Settings: `/admin/settings/company`
- Branding: `/admin/settings/branding`
- Kanban Board: `/manufacturing/kanban-board`

### Admin API Endpoints:
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

---

**Welcome to full system administration! 🎯**
