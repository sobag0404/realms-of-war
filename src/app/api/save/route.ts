import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, turn, players, data, checksum } = body;

    if (!name || !data) {
      return NextResponse.json(
        { error: 'Name and data are required' },
        { status: 400 },
      );
    }

    const save = await db.saveGame.create({
      data: {
        name,
        turn: turn ?? 0,
        players: players ?? '',
        data: typeof data === 'string' ? data : JSON.stringify(data),
        checksum: checksum ?? '',
      },
    });

    return NextResponse.json({ id: save.id, name: save.name });
  } catch (error) {
    console.error('Save failed:', error);
    return NextResponse.json(
      { error: 'Failed to save game' },
      { status: 500 },
    );
  }
}
