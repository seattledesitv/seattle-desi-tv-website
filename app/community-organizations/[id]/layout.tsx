import type { Metadata } from "next";
import { redirect } from "next/navigation";
import EntitySeoLayout from "../../components/seo/EntitySeoLayout";
import { entityMetadata, getEntity } from "../../lib/seo/service";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return entityMetadata(await getEntity("organization", id), "Seattle Community Organization");
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = await getEntity("organization", id);
  if (entity && `/community-organizations/${id}` !== entity.path) redirect(entity.path);
  return <EntitySeoLayout kind="organization" id={id}>{children}</EntitySeoLayout>;
}
