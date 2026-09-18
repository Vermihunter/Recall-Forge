import { eq, gt, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiSessions, mistakes, questions, roadmapSessions, topics } from "@/db/schema";
import { ensureSeedData } from "@/lib/seed";
const countOf=async(table:any,where?:any)=>Number((await db.select({count:sql<number>`count(*)`}).from(table).where(where))[0]?.count||0);
export async function GET(){await ensureSeedData();const now=new Date();const [topicCount,questionCount,due,reviewed,openMistakes,chatCount,roadmapCount]=await Promise.all([countOf(topics),countOf(questions),countOf(questions,lte(questions.nextReviewAt,now)),countOf(questions,gt(questions.repetitions,0)),countOf(mistakes,eq(mistakes.status,"open")),countOf(aiSessions),countOf(roadmapSessions)]);return NextResponse.json({topics:topicCount,questions:questionCount,due,reviewed,mistakes:openMistakes,sessions:chatCount,roadmapSessions:roadmapCount})}
