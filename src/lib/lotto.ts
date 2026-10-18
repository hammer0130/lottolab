export type DrawData = {drawNo:number;drawDate:Date;numbers:number[];bonus:number;source:string};
export function validNumbers(nums:number[], bonus?:number):boolean {
  return nums.length===6 && nums.every(n=>Number.isInteger(n)&&n>=1&&n<=45) && new Set(nums).size===6 && (bonus===undefined || (Number.isInteger(bonus)&&bonus>=1&&bonus<=45&&!nums.includes(bonus)));
}
export function stats(draws:{drawNo:number;numbers:number[]}[],window=100) {
  const sorted=[...draws].sort((a,b)=>b.drawNo-a.drawNo);
  const selected=sorted.slice(0,window);
  const counts=Array(46).fill(0) as number[];
  const lastSeen=Array(46).fill(null) as (number|null)[];
  selected.forEach((d,index)=>d.numbers.forEach(n=>{counts[n]++;if(lastSeen[n]===null)lastSeen[n]=index;}));
  return {sampleSize:selected.length,frequency:counts.slice(1),missing:lastSeen.slice(1).map(v=>v===null?selected.length:v)};
}
export type Mode='random'|'balanced'|'frequency'|'hybrid';
export type Options={gameCount:number;mode:Mode;seed:number;exclude?:number[];window?:number};
function rng(seed:number){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function weightedPick(pool:number[],weights:number[],rand:()=>number):number{
  const total=weights.reduce((a,b)=>a+b,0);let r=rand()*total;
  for(let i=0;i<pool.length;i++){r-=weights[i];if(r<0)return i;}
  return pool.length-1;
}
export function recommend(draws:{drawNo:number;numbers:number[]}[],options:Options):number[][]{
  const {gameCount,mode,seed}=options;
  if(!Number.isInteger(gameCount)||gameCount<1||gameCount>20)throw new Error('gameCount 1~20');
  const excluded=new Set(options.exclude??[]);
  if([...excluded].some(n=>!Number.isInteger(n)||n<1||n>45)||excluded.size>39)throw new Error('invalid exclude');
  const available=Array.from({length:45},(_,i)=>i+1).filter(n=>!excluded.has(n));
  const rand=rng(seed);const {frequency}=stats(draws,options.window??100);
  const result:number[][]=[];const seen=new Set<string>();
  function generate(m:Mode){
    const pool=[...available];const picked:number[]=[];
    while(picked.length<6){
      const weights=pool.map(n=>m==='frequency'?frequency[n-1]+1:1);
      const idx=weightedPick(pool,weights,rand);picked.push(pool[idx]);pool.splice(idx,1);
    }
    return picked.sort((a,b)=>a-b);
  }
  function balanced(nums:number[]){const odd=nums.filter(n=>n%2).length;const sum=nums.reduce((a,b)=>a+b,0);return odd>=2&&odd<=4&&sum>=100&&sum<=175;}
  for(let i=0;i<gameCount;i++){
    let ticket:number[]|undefined;
    for(let attempt=0;attempt<20000;attempt++){
      const strategy=mode==='hybrid'?(i%2?'frequency':'balanced'):mode;
      const candidate=generate(strategy);
      if((strategy==='balanced'&&!balanced(candidate))||seen.has(candidate.join(',')))continue;
      ticket=candidate;break;
    }
    if(!ticket)throw new Error('조건을 충족하는 고유 조합 생성 실패: 제외번호를 줄여주세요');
    seen.add(ticket.join(','));result.push(ticket);
  }
  return result;
}
export function evaluate(ticket:number[],win:number[],bonus:number):{matchCount:number;bonusMatch:boolean;rank:number|null}{
  const matchCount=ticket.filter(n=>win.includes(n)).length;
  const bonusMatch=ticket.includes(bonus);
  const rank=matchCount===6?1:matchCount===5&&bonusMatch?2:matchCount===5?3:matchCount===4?4:matchCount===3?5:null;
  return {matchCount,bonusMatch,rank};
}
