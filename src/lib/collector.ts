import { validNumbers } from './lotto';

const DEFAULT_ENDPOINT = 'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd={drawNo}';

export type PrizeRank = {
  rank: number;
  winners: number;
  amount: number;
  totalAmount: number;
};

export type DrawPrize = {
  ranks: PrizeRank[];
  totalWinners: number;
  drawSalesAmount: number;
  cumulativeSalesAmount: number;
  winType: number[];
};

export type DrawRecord = {
  drawNo: number;
  drawDate: Date;
  numbers: number[];
  bonus: number;
  source: string;
  prize: DrawPrize;
};

function endpoint(drawNo: number | 'all'): string {
  const template = process.env.LOTTO_ENDPOINT || DEFAULT_ENDPOINT;
  if (!template.includes('{drawNo}')) throw new Error('LOTTO_ENDPOINT must include {drawNo}');
  return template.replaceAll('{drawNo}', String(drawNo));
}

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function asInt(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(message);
  return value;
}

function parseDate(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) throw new Error('invalid draw date');
  const date = new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) throw new Error('invalid draw date');
  return date;
}

export function parseDrawItem(item: unknown, expectedDrawNo?: number): DrawRecord {
  const row = asRecord(item, 'unexpected draw item');
  const drawNo = asInt(row.ltEpsd, 'invalid draw number');
  if (expectedDrawNo !== undefined && drawNo !== expectedDrawNo) throw new Error(`draw number mismatch: expected ${expectedDrawNo}, got ${drawNo}`);
  const numbers = [1, 2, 3, 4, 5, 6].map((index) => asInt(row[`tm${index}WnNo`], `invalid winning number ${index}`));
  const bonus = asInt(row.bnsWnNo, 'invalid bonus number');
  if (!validNumbers(numbers, bonus)) throw new Error(`invalid numbers for draw ${drawNo}`);
  const ranks = [1, 2, 3, 4, 5].map((rank) => ({
    rank,
    winners: asInt(row[`rnk${rank}WnNope`], `invalid rank ${rank} winner count`),
    amount: asInt(row[`rnk${rank}WnAmt`], `invalid rank ${rank} prize`),
    totalAmount: asInt(row[`rnk${rank}SumWnAmt`], `invalid rank ${rank} prize total`),
  }));
  return {
    drawNo,
    drawDate: parseDate(row.ltRflYmd),
    numbers: [...numbers].sort((a, b) => a - b),
    bonus,
    source: endpoint(drawNo),
    prize: {
      ranks,
      totalWinners: asInt(row.sumWnNope, 'invalid total winners'),
      drawSalesAmount: asInt(row.rlvtEpsdSumNtslAmt, 'invalid draw sales'),
      cumulativeSalesAmount: asInt(row.wholEpsdSumNtslAmt, 'invalid cumulative sales'),
      winType: [0, 1, 2, 3].map((index) => asInt(row[`winType${index}`], `invalid winType${index}`)),
    },
  };
}

function listFromPayload(raw: unknown): unknown[] {
  const payload = asRecord(raw, 'unexpected source payload');
  const data = asRecord(payload.data, 'unexpected source payload');
  if (!Array.isArray(data.list)) throw new Error('unexpected source payload');
  return data.list;
}

async function fetchPayload(drawNo: number | 'all'): Promise<unknown> {
  const url = endpoint(drawNo);
  const res = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(drawNo === 'all' ? 30_000 : 10_000),
    headers: {
      accept: 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      referer: 'https://www.dhlottery.co.kr/lt645/result',
    },
  });
  if (!res.ok) throw new Error(`source HTTP ${res.status}`);
  return res.json();
}

export async function fetchDraw(drawNo: number): Promise<DrawRecord | null> {
  if (!Number.isInteger(drawNo) || drawNo < 1) throw new Error('drawNo must be a positive integer');
  const list = listFromPayload(await fetchPayload(drawNo));
  if (list.length === 0) return null;
  const match = list.find((item) => {
    const row = item as Record<string, unknown> | null;
    return !!row && row.ltEpsd === drawNo;
  });
  if (!match) return null;
  return parseDrawItem(match, drawNo);
}

export async function fetchAllDraws(): Promise<DrawRecord[]> {
  const draws = listFromPayload(await fetchPayload('all')).map((item) => parseDrawItem(item));
  draws.sort((a, b) => a.drawNo - b.drawNo);
  const seen = new Set<number>();
  for (const draw of draws) {
    if (seen.has(draw.drawNo)) throw new Error(`duplicate draw ${draw.drawNo}`);
    seen.add(draw.drawNo);
  }
  for (let drawNo = 1; drawNo <= draws.length; drawNo++) {
    if (draws[drawNo - 1]?.drawNo !== drawNo) throw new Error(`missing draw ${drawNo}`);
  }
  if (draws.length === 0) throw new Error('source returned no draws');
  return draws;
}
