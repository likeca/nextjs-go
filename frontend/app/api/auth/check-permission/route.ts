import { NextRequest, NextResponse } from 'next/server';

import { checkPermission, getSession } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resource, action } = await request.json();
    if (!resource || !action) {
      return NextResponse.json(
        { error: 'Resource and action are required' },
        { status: 400 },
      );
    }

    const allowed = await checkPermission(resource, action);
    return NextResponse.json({ hasPermission: allowed });
  } catch (error) {
    console.error('Error checking permission:', error);
    return NextResponse.json(
      { error: 'Failed to check permission', hasPermission: false },
      { status: 500 },
    );
  }
}
