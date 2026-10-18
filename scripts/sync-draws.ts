import { fetchAllDraws } from '../src/lib/collector';
import { db } from '../src/lib/db';
import { saveDraws } from '../src/lib/sync';

async function main() {
  const draws = await fetchAllDraws();
  const saved = await saveDraws(draws);
  const stored = await db.draw.count();
  const latest = await db.draw.findFirst({ orderBy: { drawNo: 'desc' } });
  const earliest = await db.draw.findFirst({ orderBy: { drawNo: 'asc' } });
  console.log(JSON.stringify({
    fetched: draws.length,
    saved,
    stored,
    earliest: earliest ? { drawNo: earliest.drawNo, drawDate: earliest.drawDate } : null,
    latest: latest ? { drawNo: latest.drawNo, drawDate: latest.drawDate, numbers: latest.numbers, bonus: latest.bonus } : null,
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
