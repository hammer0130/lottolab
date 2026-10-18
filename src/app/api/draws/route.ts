import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [total, draws] = await Promise.all([
    db.draw.count(),
    db.draw.findMany({
      orderBy: { drawNo: 'desc' },
      take: 30,
      select: { drawNo: true, drawDate: true, numbers: true, bonus: true, verified: true },
    }),
  ]);
  return Response.json({ total, draws });
}
