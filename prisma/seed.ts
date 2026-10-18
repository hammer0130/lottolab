import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  for (const [id,name] of [['random','균등 무작위'],['balanced','균형형'],['frequency','빈도 가중'],['hybrid','복합형']]) {
    await db.strategy.upsert({where:{id},update:{},create:{id,name}});
  }
}
main().finally(()=>db.$disconnect());
