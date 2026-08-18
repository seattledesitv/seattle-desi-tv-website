import type { Metadata } from "next";
import { redirect } from "next/navigation";
import EntitySeoLayout from "../../components/seo/EntitySeoLayout";
import { entityMetadata, getEntity } from "../../lib/seo/service";

export async function generateMetadata({ params }: { params: Promise<{ publicationId: string }> }): Promise<Metadata> {
  const { publicationId } = await params;
  return entityMetadata(await getEntity("publication", publicationId), "Seattle Desi TV Publication");
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ publicationId: string }> }) {
  const { publicationId } = await params;
  const entity = await getEntity("publication", publicationId);
  if (entity && `/publications/${publicationId}` !== entity.path) redirect(entity.path);
  return <EntitySeoLayout kind="publication" id={publicationId}>{children}</EntitySeoLayout>;
}
