import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authorized } from '@/lib/auth';
import { recommend, Mode } from '@/lib/lotto';
import { randomInt } from 'node:crypto';
export async function GET(req:NextRequest){if(!authorized(req))return Response.json({error:'Unauthorized'},{status:401});const batches=await db.batch.findMany({orderBy:{createdAt:'desc'},take:30,include:{tickets:{include:{result:true}},strategy:true}});return Response.json(batches,(_,v)=>typeof v==='bigint'?v.toString():v);}
export async function POST(req:NextRequest){
  const body=await req.json().catch(()=>({}));const drawNo=Number(body.drawNo),gameCount=Number(body.gameCount??5),mode=body.mode as Mode;
  if(!Number.isInteger(drawNo)||drawNo<2||!['random','balanced','frequency','hybrid'].includes(mode)||!Number.isInteger(gameCount)||gameCount<1||gameCount>20)return Response.json({error:'Invalid input'},{status:400});
  const latest=await db.draw.findFirst({orderBy:{drawNo:'desc'}});
  if(!latest||drawNo!==latest.drawNo+1)return Response.json({error:'추천 대상은 저장된 최신 회차의 다음 회차여야 합니다.'},{status:400});
  const requestedWindow=Number(body.window??100);
  const sample=Number.isInteger(requestedWindow)&&requestedWindow>=1&&requestedWindow<=2000?requestedWindow:100;
  const previous=await db.draw.findMany({where:{drawNo:{lt:drawNo}},orderBy:{drawNo:'desc'},take:sample,select:{drawNo:true,numbers:true}});
  const seed=randomInt(0,2147483647);
  try{
    const tickets=recommend(previous,{gameCount,mode,seed,exclude:Array.isArray(body.exclude)?body.exclude:[],window:previous.length});
    const batch=await db.$transaction(async (tx)=>{
      const existing=await tx.batch.findUnique({where:{drawNo_strategyId:{drawNo,strategyId:mode}},select:{id:true}});
      if(existing){
        await tx.result.deleteMany({where:{ticket:{batchId:existing.id}}});
        await tx.ticket.deleteMany({where:{batchId:existing.id}});
        await tx.batch.delete({where:{id:existing.id}});
      }
      return tx.batch.create({data:{drawNo,strategyId:mode,seed,tickets:{create:tickets.map((numbers,gameIndex)=>({numbers,gameIndex}))}},include:{tickets:true}});
    });
    return Response.json(batch);
  }catch(e){return Response.json({error:e instanceof Error?e.message:'Generation failed'},{status:409});}
}
