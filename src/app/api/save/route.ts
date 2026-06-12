import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SavePayloadSchema, MAX_SAVE_BYTES } from '@/lib/saveSchemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = SavePayloadSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join('; ');
      return NextResponse.json(
        { error: `Invalid payload: ${issues}` },
        { status: 400 },
      );
    }

    const { name, turn, players, data, checksum, version } = parsed.data;

    if (data.length > MAX_SAVE_BYTES) {
      return NextResponse.json(
        { error: 'Save data exceeds maximum allowed size' },
        { status: 413 },
      );
    }

    const ownerId = 'local';

    const save = await db.saveGame.create({
      data: {
        name,
        turn,
        players,
        data,
        checksum,
        ownerId,
        version: version ?? 1,
      },
    });

    return NextResponse.json({ id: save.id, name: save.name });
  } catch (error) {
    console.error('Save failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
