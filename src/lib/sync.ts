import type { Prisma } from '@prisma/client';
import type { DrawRecord } from './collector';
import { db } from './db';

const CHUNK = 200;

export async function saveDraws(draws: DrawRecord[]): Promise<number> {
  let saved = 0;
  for (let offset = 0; offset < draws.length; offset += CHUNK) {
    const slice = draws.slice(offset, offset + CHUNK);
    await db.$transaction(
      async (tx) => {
        for (const draw of slice) {
          await tx.draw.upsert({
            where: { drawNo: draw.drawNo },
            create: {
              drawNo: draw.drawNo,
              drawDate: draw.drawDate,
              numbers: draw.numbers,
              bonus: draw.bonus,
              prizeJson: draw.prize as Prisma.InputJsonValue,
              source: draw.source,
              verified: false,
            },
            update: {
              drawDate: draw.drawDate,
              numbers: draw.numbers,
              bonus: draw.bonus,
              prizeJson: draw.prize as Prisma.InputJsonValue,
              source: draw.source,
            },
          });
        }
      },
      { timeout: 30_000 },
    );
    saved += slice.length;
  }
  return saved;
}
