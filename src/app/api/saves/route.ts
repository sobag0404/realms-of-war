import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const saves = await db.saveGame.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        turn: true,
        players: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ saves });
  } catch (error) {
    console.error('List saves failed:', error);
    return NextResponse.json(
      { error: 'Failed to list saves' },
      { status: 500 },
    );
  }
}
