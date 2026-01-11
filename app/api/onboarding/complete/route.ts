import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";
import { emailService } from "@server/email";

interface WizardData {
  company: {
    name: string;
    industry: string;
    size: string;
    address?: string;
  };
  departments: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
  }>;
  devices: Array<{
    id: string;
    name: string;
    type: "tablet" | "workstation" | "tv_board" | "printer";
    departmentId: string;
    location?: string;
  }>;
  firstJob?: {
    orderNumber: string;
    itemName: string;
    quantity: number;
    departmentId: string;
  };
  team?: Array<{
    email: string;
    name: string;
    role: string;
    departmentIds: string[];
  }>;
  contacts?: Array<{
    name: string;
    email: string;
    type: "customer" | "supplier";
    company: string;
  }>;
  roleSettings?: {
    customPermissions: Record<string, string[]>;
  };
}

export async function POST(request: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  try {
    const wizardData: WizardData = await request.json();
    const tenantId = context.user.tenantId;
    const userId = context.user.id;

    // 1. Update tenant settings with company info
    const tenant = await storage.getTenantById(tenantId);
    if (tenant) {
      await storage.updateTenant(tenantId, {
        name: wizardData.company.name,
        industry: wizardData.company.industry,
        companySize: wizardData.company.size,
        address1: wizardData.company.address,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      });
    }

    // 2. Create departments
    const departmentMap = new Map<string, string>();
    for (const dept of wizardData.departments) {
      const department = await storage.createDepartment({
        tenantId,
        name: dept.name,
        type: dept.type,
        description: dept.description,
        isActive: true,
      });
      departmentMap.set(dept.id, department.id);
    }

    // 3. Create device mappings (stations)
    for (const device of wizardData.devices) {
      const realDepartmentId = departmentMap.get(device.departmentId);
      if (realDepartmentId) {
        await storage.createStation({
          tenantId,
          departmentId: realDepartmentId,
          name: device.name,
          type: device.type,
          location: device.location,
          isActive: true,
        });
      }
    }

    // 4. Create sample first job if provided
    if (wizardData.firstJob) {
      const realDepartmentId = departmentMap.get(wizardData.firstJob.departmentId);
      if (realDepartmentId) {
        // Create a sample production order
        const order = await storage.createProductionOrder({
          tenantId,
          orderNumber: wizardData.firstJob.orderNumber,
          itemName: wizardData.firstJob.itemName,
          qtyOrdered: wizardData.firstJob.quantity,
          qtyCompleted: 0,
          departmentId: realDepartmentId,
          status: "PENDING",
          priority: 1,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          createdBy: userId,
        });
      }
    }

    // 5. Send team invitations
    if (wizardData.team && wizardData.team.length > 0) {
      for (const member of wizardData.team) {
        // Map temporary department IDs to real ones
        const realDepartmentIds = member.departmentIds
          .map(id => departmentMap.get(id))
          .filter(Boolean) as string[];

        const invitation = await storage.createUserInvitation({
          tenantId,
          email: member.email,
          name: member.name,
          role: member.role,
          departmentIds: realDepartmentIds,
          invitedBy: userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        // TODO: Send invitation email when sendTeamInvitation method is implemented
        // const inviter = await storage.getUserById(userId);
        // const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation/${invitation.id}`;
        // await emailService.sendTeamInvitation({
        //   recipientName: member.name,
        //   recipientEmail: member.email,
        //   inviterName: `${inviter?.firstName || ""} ${inviter?.lastName || ""}`.trim() || "Team Admin",
        //   companyName: wizardData.company.name,
        //   role: member.role,
        //   invitationLink,
        // });
      }
    }

    // 6. Create contacts if provided
    if (wizardData.contacts && wizardData.contacts.length > 0) {
      for (const contact of wizardData.contacts) {
        await storage.createContact({
          tenantId,
          name: contact.name,
          email: contact.email,
          type: contact.type,
          company: contact.company,
          createdBy: userId,
        });
      }
    }

    // 7. Update role settings if customized
    if (wizardData.roleSettings?.customPermissions) {
      await storage.updateTenantRoleSettings(tenantId, {
        customPermissions: wizardData.roleSettings.customPermissions,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
      departmentMapping: Object.fromEntries(departmentMap),
    });
  } catch (error) {
    console.error("Onboarding completion error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
