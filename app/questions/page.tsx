import QuestionBank from "@/components/QuestionBank";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic = "" } = await searchParams;
  return <><section className="hero"><div className="eyebrow">Question Bank · revision sessions</div><h1>Build bounded practice sets instead of loading the whole library.</h1><p className="lede">Combine roadmap sessions, preview only that slice, generate open and 4-option diagnostic questions, then let feedback build a knowledge-neighborhood for smarter follow-up recommendations.</p></section><QuestionBank initialTopic={topic} /></>;
}
