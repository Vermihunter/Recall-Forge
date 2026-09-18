export const dynamic="force-dynamic";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { questions } from "@/db/schema";
import PrintStudio from "@/components/PrintStudio";
export default async function PrintPage(){const rows=await db.select().from(questions).orderBy(asc(questions.topicSlug),asc(questions.difficulty));return <><section className="hero print-page-hero"><div className="eyebrow">Duplex printable recall cards</div><h1>Question on the front. Answer exactly behind it.</h1><p className="lede">Generate A4 or A3 sheets with mirrored backs for long-edge or short-edge duplex printing. The same layout can be printed directly to PDF or downloaded as standalone HTML.</p></section><PrintStudio questions={rows as any}/></>}
