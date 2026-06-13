import * as z from 'zod';

const MAX_SAVE_BYTES = 2_000_000;

export { MAX_SAVE_BYTES };

export const SavePayloadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  turn: z.number().int().min(0).max(100_000),
  players: z.string().max(500),
  data: z.string().min(2),
  checksum: z.string().regex(/^[a-f0-9]{8,16}$/i),
  version: z.number().int().min(1).max(100).optional(),
});

export const SaveIdSchema = z.object({
  id: z.string().min(1).max(100),
});

export const SavesQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(20).default(20),
});
