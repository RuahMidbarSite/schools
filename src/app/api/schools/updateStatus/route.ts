import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { schoolId, status } = await request.json();

    if (!schoolId || !status) {
      return NextResponse.json(
        { error: 'Missing schoolId or status' },
        { status: 400 }
      );
    }

    const updated = await prisma.school.update({
      where: { Schoolid: parseInt(schoolId) },
      data: { Status: status }
    });

    return NextResponse.json({ success: true, school: updated });

  } catch (error: any) {
    console.error('Error updating school:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}