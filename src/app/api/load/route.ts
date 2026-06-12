import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SaveIdSchema } from '@/lib/saveSchemas';

const OWNER_ID = 'local';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const parsed = SaveIdSchema.safeParse({ id: id ?? '' });
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join('; ');
      return NextResponse.json(
        { error: `Invalid request: ${issues}` },
        { status: 400 },
      );
    }

    const save = await db.saveGame.findFirst({
      where: { id: parsed.data.id, ownerId: OWNER_ID },
    });

    if (!save) {
      return NextResponse.json(
        { error: 'Save not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: save.id,
      name: save.name,
      turn: save.turn,
      data: save.data,
      checksum: save.checksum,
      version: save.version,
    });
  } catch (error) {
    console.error('Load failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const parsed = SaveIdSchema.safeParse({ id: id ?? '' });
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join('; ');
      return NextResponse.json(
        { error: `Invalid request: ${issues}` },
        { status: 400 },
      );
    }

    const result = await db.saveGame.deleteMany({
      where: { id: parsed.data.id, ownerId: OWNER_ID },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Save not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete save failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
