import type { Metadata } from "next";
import EntitySeoLayout from "../../components/seo/EntitySeoLayout";
import { entityMetadata, getEntity } from "../../lib/seo/service";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return entityMetadata(await getEntity("event", id), "Seattle Community Event");
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EntitySeoLayout kind="event" id={id}>{children}</EntitySeoLayout>;
}
