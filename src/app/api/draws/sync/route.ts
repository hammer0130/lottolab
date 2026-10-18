import { NextRequest } from 'next/server';
import { fetchAllDraws, fetchDraw } from '@/lib/collector';
import { saveDraws } from '@/lib/sync';

const WARNING = '수집 데이터는 공식 발표와 교차검증 후 verified=true로 승인해야 합니다.';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    if (body.all === true) {
      const draws = await fetchAllDraws();
      const saved = await saveDraws(draws);
      return Response.json({
        saved,
        fetched: draws.length,
        first: draws[0]?.drawNo ?? null,
        last: draws.at(-1)?.drawNo ?? null,
        warning: WARNING,
      });
    }
    const start = Number(body.start);
    const end = Number(body.end);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end - start > 49) {
      return Response.json({ error: 'start/end: 최대 50회씩 동기화하거나 {"all":true}' }, { status: 400 });
    }
    let saved = 0;
    const missing: number[] = [];
    for (let drawNo = start; drawNo <= end; drawNo++) {
      const draw = await fetchDraw(drawNo);
      if (!draw) {
        missing.push(drawNo);
        continue;
      }
      saved += await saveDraws([draw]);
    }
    return Response.json({ saved, missing, warning: WARNING });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
