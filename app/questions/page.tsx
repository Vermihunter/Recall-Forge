import QuestionBankClient from "./QuestionBankClient";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic = "" } = await searchParams;
  return <>
    <section className="hero qb-page-hero">
      <div className="eyebrow">Question Bank · scoped library</div>
      <h1>Find the questions you actually want to revise.</h1>
      <p className="lede">Browse by track → topic → roadmap session, see new/unprinted counts immediately, combine several sources, hand-pick questions, and build a bounded revision session without loading the whole bank into the browser.</p>
    </section>
    <QuestionBankClient initialTopic={topic} />
  </>;
}
