import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SavePayloadSchema } from '@/lib/saveSchemas';
import { calculateChecksum } from '@/engine/save/saveGame';
import { loadSaveFile } from '@/lib/saveService';
import { resolveSaveAccess } from '@/lib/saveAccess';

const MAX_REQUEST_BYTES = 2_200_000; // slightly above MAX_SAVE_BYTES for JSON overhead

export async function POST(request: NextRequest) {
  try {
    // Pre-parse body size guard — check BEFORE JSON.parse to avoid
    // allocating memory for oversized payloads.
    const access = resolveSaveAccess();
    if (!access.enabled) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Zod schema validation
    const parsed = SavePayloadSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join('; ');
      return NextResponse.json(
        { error: `Invalid payload: ${issues}` },
        { status: 400 },
      );
    }

    const { name, turn, players, data, checksum, version } = parsed.data;

    // Server-side checksum verification
    const actualChecksum = calculateChecksum(data);
    if (actualChecksum !== checksum) {
      return NextResponse.json(
        { error: 'Checksum mismatch' },
        { status: 400 },
      );
    }

    // Validate the SaveFile structure before persisting
    const loadResult = loadSaveFile(data);
    if (!loadResult.success) {
      return NextResponse.json(
        { error: `Invalid save format: ${loadResult.error}` },
        { status: 400 },
      );
    }

    const save = await db.saveGame.create({
      data: {
        name,
        turn,
        players,
        data,
        checksum,
        ownerId: access.ownerId,
        version: version ?? 1,
      },
    });

    return NextResponse.json({ id: save.id, name: save.name });
  } catch (error) {
    console.error('Save failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
