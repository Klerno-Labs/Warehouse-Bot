import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { MaintenanceWorkOrderService } from '@server/iot-predictive-maintenance';

const maintenanceService = new MaintenanceWorkOrderService();

/**
 * GET /api/iot/maintenance
 * Get maintenance tasks
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const equipmentId = searchParams.get('equipmentId') || undefined;
    const view = searchParams.get('view');

    if (view === 'dashboard') {
      const dashboard = await maintenanceService.getMaintenanceDashboard();
      return NextResponse.json(dashboard);
    }

    const tasks = await maintenanceService.getMaintenanceTasks(status, priority, equipmentId);

    return NextResponse.json({
      tasks,
      total: tasks.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Maintenance tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/iot/maintenance
 * Create a new maintenance task
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskData = await req.json();

    if (!taskData.equipmentId || !taskData.description || !taskData.scheduledDate) {
      return NextResponse.json(
        { error: 'equipmentId, description, and scheduledDate are required' },
        { status: 400 }
      );
    }

    const newTask = await maintenanceService.createMaintenanceTask({
      ...taskData,
      type: taskData.type || 'corrective',
      priority: taskData.priority || 'medium',
      status: 'scheduled',
      estimatedDuration: taskData.estimatedDuration || 60,
      parts: taskData.parts || [],
    });

    return NextResponse.json({
      task: newTask,
      message: 'Maintenance task created successfully',
    });
  } catch (error) {
    console.error('Create maintenance task error:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/iot/maintenance
 * Update a maintenance task
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, ...updates } = await req.json();

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    const updatedTask = await maintenanceService.updateMaintenanceTask(taskId, updates);
    if (!updatedTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({
      task: updatedTask,
      message: 'Maintenance task updated successfully',
    });
  } catch (error) {
    console.error('Update maintenance task error:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance task' },
      { status: 500 }
    );
  }
}
