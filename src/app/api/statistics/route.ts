import { db } from '@/lib/db';
import { stats } from '@/lib/lotto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const window = Number(new URL(req.url).searchParams.get('window') ?? 100);
  if (!Number.isInteger(window) || window < 1 || window > 2000) {
    return Response.json({ error: 'window 1~2000' }, { status: 400 });
  }
  const draws = await db.draw.findMany({
    orderBy: { drawNo: 'desc' },
    take: window,
    select: { drawNo: true, numbers: true },
  });
  return Response.json(stats(draws, window));
}
