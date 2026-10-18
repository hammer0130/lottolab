import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
export function authorized(req:NextRequest){
  const expected=process.env.APP_PASSWORD;
  const provided=req.headers.get('x-app-password')??'';
  if(!expected||!provided)return false;
  const a=Buffer.from(expected),b=Buffer.from(provided);
  return a.length===b.length&&timingSafeEqual(a,b);
}
