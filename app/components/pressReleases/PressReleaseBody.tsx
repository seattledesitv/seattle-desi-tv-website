import { pressReleaseHtml } from "../../lib/pressReleases/richText";

export default function PressReleaseBody({ body }: { body: string }) {
  return <div className="press-release-rich-text" dangerouslySetInnerHTML={{ __html: pressReleaseHtml(body) }} />;
}
