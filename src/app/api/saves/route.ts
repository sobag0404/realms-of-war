import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const OWNER_ID = 'local';
const MAX_LIMIT = 20;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, Number(searchParams.get('offset') ?? 0));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(searchParams.get('limit') ?? MAX_LIMIT)),
    );

    const saves = await db.saveGame.findMany({
      where: { ownerId: OWNER_ID },
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        name: true,
        turn: true,
        players: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ saves });
  } catch (error) {
    console.error('List saves failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
