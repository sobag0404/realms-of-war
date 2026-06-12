import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Save ID is required' },
        { status: 400 },
      );
    }

    const save = await db.saveGame.findUnique({
      where: { id },
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
    });
  } catch (error) {
    console.error('Load failed:', error);
    return NextResponse.json(
      { error: 'Failed to load game' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Save ID is required' },
        { status: 400 },
      );
    }

    await db.saveGame.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete save failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete save' },
      { status: 500 },
    );
  }
}
