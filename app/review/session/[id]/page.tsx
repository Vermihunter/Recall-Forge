import RevisionSessionPlayer from "@/components/RevisionSessionPlayer";

export default async function RevisionSessionPage({ params }:{ params:Promise<{id:string}> }) {
  const {id}=await params;
  return <RevisionSessionPlayer id={id}/>;
}
