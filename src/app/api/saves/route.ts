import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SavesQuerySchema } from '@/lib/saveSchemas';
import { resolveSaveAccess } from '@/lib/saveAccess';

export async function GET(request: NextRequest) {
  try {
    const access = resolveSaveAccess();
    if (!access.enabled) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const query = SavesQuerySchema.safeParse({
      offset: searchParams.get('offset') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!query.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: query.error.flatten() },
        { status: 400 },
      );
    }

    const { offset, limit } = query.data;

    const saves = await db.saveGame.findMany({
      where: { ownerId: access.ownerId },
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
