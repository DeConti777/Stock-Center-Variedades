import { JsonLd } from "@/components/seo/json-ld";
import { getAppUrl } from "@/lib/env";
import { buildSiteWideGraph } from "@/lib/schema-org";
import { instagramLink } from "@/lib/site-data";

export function SiteWideJsonLd() {
  const graph = buildSiteWideGraph(getAppUrl(), [instagramLink]);
  return <JsonLd data={graph} />;
}
