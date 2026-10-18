'use client';

import { useEffect, useState } from 'react';

type Stat = { sampleSize: number; frequency: number[]; missing: number[] };
type Draw = { drawNo: number; drawDate: string; numbers: number[]; bonus: number };
type Batch = { id: string; drawNo: number; tickets: { numbers: number[] }[] };
type DrawsResponse = { total: number; draws: Draw[] };

const windows = [
  { value: 100, label: '최근 100회' },
  { value: 500, label: '최근 500회' },
  { value: 2000, label: '전체' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

export default function Home() {
  const [total, setTotal] = useState(0);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [stat, setStat] = useState<Stat | null>(null);
  const [windowSize, setWindowSize] = useState(100);
  const [mode, setMode] = useState('hybrid');
  const [batch, setBatch] = useState<Batch | null>(null);
  const [message, setMessage] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/draws').then(async (response) => {
        if (!response.ok) throw new Error('draws');
        return response.json() as Promise<DrawsResponse>;
      }),
      fetch(`/api/statistics?window=${windowSize}`).then(async (response) => {
        if (!response.ok) throw new Error('statistics');
        return response.json() as Promise<Stat>;
      }),
    ]).then(([drawsBody, statsBody]) => {
      if (cancelled) return;
      setTotal(drawsBody.total);
      setDraws(drawsBody.draws);
      setStat(statsBody);
    }).catch(() => {
      if (!cancelled) setSyncMessage('저장된 당첨 데이터를 불러오지 못했습니다.');
    });
    return () => {
      cancelled = true;
    };
  }, [windowSize, reloadKey]);

  const latest = draws[0];
  const peak = stat ? Math.max(...stat.frequency, 1) : 1;
  const frequent = stat
    ? stat.frequency
        .map((count, index) => ({ number: index + 1, count }))
        .sort((a, b) => b.count - a.count || a.number - b.number)
        .slice(0, 6)
    : [];
  const frequentNumbers = new Set(frequent.map((item) => item.number));
  const quiet = stat
    ? stat.missing.map((gap, index) => ({ number: index + 1, gap })).sort((a, b) => b.gap - a.gap).slice(0, 8)
    : [];

  async function syncDraws() {
    setSyncing(true);
    setSyncMessage('동행복권에서 당첨번호를 가져오는 중');
    try {
      const response = await fetch('/api/draws/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const json = await response.json();
      if (!response.ok) {
        setSyncMessage(json.error ?? '당첨번호를 가져오지 못했습니다.');
        return;
      }
      setSyncMessage(`${Number(json.last).toLocaleString('ko-KR')}회까지 ${Number(json.fetched).toLocaleString('ko-KR')}회를 반영했습니다.`);
      setReloadKey((value) => value + 1);
    } catch {
      setSyncMessage('당첨번호를 가져오지 못했습니다.');
    } finally {
      setSyncing(false);
    }
  }

  async function generate() {
    if (!latest) {
      setMessage('저장된 당첨 데이터가 없습니다.');
      return;
    }
    setMessage('추천 생성 중');
    const response = await fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ drawNo: latest.drawNo + 1, gameCount: 5, mode, window: windowSize }),
    });
    const json = await response.json();
    if (!response.ok) {
      setMessage(json.error ?? '추천 생성에 실패했습니다.');
      return;
    }
    setBatch(json);
    setMessage(`${latest.drawNo + 1}회 추천 번호가 저장되었습니다.`);
  }

  return (
    <main>
      <header>
        <h1>🍀 LottoLab</h1>
        <p>저장된 로또 6/45 당첨 기록으로 빈도와 다음 회차 번호를 봅니다.</p>
        <div className="controls">
          <button type="button" onClick={syncDraws} disabled={syncing}>{syncing ? '가져오는 중' : '당첨번호 가져오기'}</button>
        </div>
        <p role="status">{syncMessage}</p>
      </header>
      <section className="cards">
        <article>
          <small>저장 회차</small>
          <strong>{total ? `${total.toLocaleString('ko-KR')}회` : '데이터 없음'}</strong>
        </article>
        <article>
          <small>최신 회차</small>
          <strong>{latest ? `${latest.drawNo}회` : '-'}</strong>
          {latest ? <small>{formatDate(latest.drawDate)}</small> : null}
        </article>
        <article>
          <small>통계 표본</small>
          <strong>{stat?.sampleSize ?? 0}회</strong>
        </article>
      </section>
      <section>
        <h2>번호 출현 빈도</h2>
        <div className="controls">
          <select value={windowSize} onChange={(event) => setWindowSize(Number(event.target.value))} aria-label="통계 구간">
            {windows.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="chart">
          {stat?.frequency.map((count, index) => (
            <div key={index} className={frequentNumbers.has(index + 1) ? 'hot' : undefined} title={`${index + 1}번: ${count}회`}>
              <div style={{ height: `${(count / peak) * 110}px` }} />
              <small>{index + 1}</small>
            </div>
          ))}
        </div>
        {frequent.length > 0 ? (
          <div className="quiet">
            <span>많이 나온 번호</span>
            {frequent.map((item) => <b key={item.number} className={`ball c${Math.ceil(item.number / 10)}`} title={`${item.count}회 출현`}>{item.number}</b>)}
          </div>
        ) : null}
        {quiet.length > 0 ? (
          <div className="quiet">
            <span>오래 나오지 않은 번호</span>
            {quiet.map((item) => <b key={item.number} className={`ball c${Math.ceil(item.number / 10)}`} title={`${item.gap}회 미출현`}>{item.number}</b>)}
          </div>
        ) : null}
      </section>
      <section>
        <h2>번호 추천</h2>
        <p className="muted">분석 패턴은 당첨 확률을 높이지 않습니다. 추천은 저장된 최신 회차의 다음 회차에 저장됩니다.</p>
        <div className="controls">
          <select value={mode} onChange={(event) => setMode(event.target.value)} aria-label="추천 방식">
            <option value="hybrid">복합형</option>
            <option value="balanced">균형형</option>
            <option value="frequency">빈도 가중</option>
            <option value="random">균등 무작위</option>
          </select>
          <button onClick={generate} disabled={!latest}>5게임 추천 생성</button>
        </div>
        <p role="status">{message}</p>
        {batch?.tickets.map((ticket, index) => (
          <div className="ticket" key={`${batch.id}-${index}`}>
            <span>{index + 1}게임</span>
            {ticket.numbers.map((number) => <b key={number} className={`ball c${Math.ceil(number / 10)}`}>{number}</b>)}
          </div>
        ))}
      </section>
      <section>
        <h2>최근 당첨 회차</h2>
        {draws.slice(0, 10).map((draw) => (
          <div className="ticket" key={draw.drawNo}>
            <span>{draw.drawNo}회<br />{formatDate(draw.drawDate)}</span>
            {draw.numbers.map((number) => <b key={number} className={`ball c${Math.ceil(number / 10)}`}>{number}</b>)}
            <span className="bonus">+ {draw.bonus}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
