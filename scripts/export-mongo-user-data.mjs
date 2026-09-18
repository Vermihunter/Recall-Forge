import { MongoClient } from "mongodb";
import fs from "node:fs/promises";
import path from "node:path";

const uri=process.env.MIGRATION_MONGODB_URI||process.env.MONGODB_URI||"mongodb://localhost:27017/recall_forge";
const client=new MongoClient(uri);
await client.connect();
try{
  const db=client.db();
  const rows=await db.collection("questions").find({}).sort({createdAt:1}).toArray();
  const questions=rows.filter(q=>!String(q.externalId||"").startsWith("sample-")).map(q=>({
    id:q.externalId||String(q._id),topic:q.topicSlug,session:q.sessionSlug||null,subtopics:q.subtopics||[],prerequisites:q.prerequisites||[],type:q.type,difficulty:q.difficulty,questionMd:q.questionMd,answerMd:q.answerMd,keyPoints:q.keyPoints||[],hints:q.hints||[],commonMistakes:q.commonMistakes||[],expectedMinutes:q.expectedMinutes||2,tags:q.tags||[],review:q.review||{},createdAt:q.createdAt||null
  }));
  const out={exportedAt:new Date().toISOString(),source:"Recall Forge MongoDB v0.1",note:"Seeded sample-* questions intentionally excluded.",questions};
  const dir=path.resolve("exports");await fs.mkdir(dir,{recursive:true});const filename=path.join(dir,`user-questions-${new Date().toISOString().slice(0,10)}.json`);await fs.writeFile(filename,JSON.stringify(out,null,2));console.log(`Exported ${questions.length} user questions to ${filename}`);
}finally{await client.close()}
