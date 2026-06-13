import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SavesQuerySchema } from '@/lib/saveSchemas';

const OWNER_ID = 'local';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = SavesQuerySchema.safeParse({
      offset: searchParams.get('offset') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join('; ');
      return NextResponse.json(
        { error: `Invalid request: ${issues}` },
        { status: 400 },
      );
    }

    const { offset, limit } = parsed.data;

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
