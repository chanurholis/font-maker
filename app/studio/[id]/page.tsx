import { Studio } from "@/components/Studio";

export default async function StudioPage({ params }: PageProps<"/studio/[id]">) {
  const { id } = await params;
  return <Studio id={id} />;
}
