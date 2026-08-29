export function forSite<T>(query: T, siteId: string | null): T {
  if (!siteId) return query;
  return (query as T & { eq(column: string, value: string): T }).eq("site_id", siteId);
}
