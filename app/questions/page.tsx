import QuestionBank from "@/components/QuestionBank";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic = "" } = await searchParams;
  return <><section className="hero"><div className="eyebrow">Retrieval library</div><h1>Questions should expose what notes can hide.</h1><p className="lede">Filter by topic, question type and L1–L6 difficulty. Say your answer before revealing. Grade retrieval—not familiarity.</p></section><QuestionBank initialTopic={topic} /></>;
}
