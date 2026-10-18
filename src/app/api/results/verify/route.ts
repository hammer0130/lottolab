import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authorized } from '@/lib/auth';
import { evaluate } from '@/lib/lotto';
export async function POST(req:NextRequest){
  if(!authorized(req))return Response.json({error:'Unauthorized'},{status:401});
  const drawNo=Number((await req.json().catch(()=>({}))).drawNo);
  if(!Number.isInteger(drawNo))return Response.json({error:'Invalid drawNo'},{status:400});
  const draw=await db.draw.findUnique({where:{drawNo}});
  if(!draw||!draw.verified)return Response.json({error:'Draw not verified'},{status:409});
  const tickets=await db.ticket.findMany({where:{batch:{drawNo}}});
  for(const t of tickets){const result=evaluate(t.numbers,draw.numbers,draw.bonus);
    await db.result.upsert({where:{ticketId:t.id},create:{ticketId:t.id,drawNo,...result},update:{...result}});
  }
  return Response.json({drawNo,checked:tickets.length,note:'당첨금은 공식 회차별 지급액을 확인한 뒤 별도로 반영합니다.'});
}
