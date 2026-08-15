import { entityJsonLd, getEntity, safeJsonLd } from "../../lib/seo/service";
import type { SeoEntityKind } from "../../lib/seo/types";

export default async function EntitySeoLayout({ kind, id, children }: { kind: SeoEntityKind; id: string; children: React.ReactNode }) {
  const entity = await getEntity(kind, id);
  return <>{entity && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(entityJsonLd(entity)) }} />}{children}</>;
}
