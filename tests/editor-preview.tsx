import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import PressReleaseEditor from "../app/components/pressReleases/PressReleaseEditor";
import PressReleaseBody from "../app/components/pressReleases/PressReleaseBody";
import PressReleaseForm from "../app/components/pressReleases/PressReleaseForm";
import PressReleaseGallery from "../app/components/pressReleases/PressReleaseGallery";
import { SiteProvider } from "../app/lib/sites/SiteContext";

function Preview() {
  const [body, setBody] = useState("Existing release & community news\nSecond line");
  const [saved, setSaved] = useState("");
  return <main style={{ maxWidth: 900, margin: "30px auto", padding: 20 }}>
    <h1>Press release editor</h1>
    <PressReleaseEditor value={body} onChange={setBody} />
    <button onClick={() => setSaved(body)}>Save preview</button>
    <button onClick={() => setBody("")}>Reset body</button>
    <button onClick={() => setBody(saved)}>Reload saved body</button>
    <article aria-label="Published preview"><PressReleaseBody body={saved} /></article>
    <output data-testid="body">{body}</output>
  </main>;
}
function AttachmentPreview() {
  const [saved, setSaved] = useState("");
  const [uploaded, setUploaded] = useState(0);
  return <SiteProvider site={{ id: "test-site", code: "sea", slug: "seattle", name: "Seattle Desi TV", shortName: "SDTV", city: "Seattle", stateCode: "WA", timezone: "America/Los_Angeles", status: "active", settings: {}, hostname: "localhost", primaryHostname: "seattledesitv.com", source: "fallback" }}>
    <PressReleaseForm saving={false} error="" onCreate={async (input) => { setSaved(JSON.stringify(input)); }} onUpload={async (file) => {
      setUploaded((count) => count + 1);
      return `https://example.com/uploads/${file.name}`;
    }} />
    <output data-testid="saved-release">{saved}</output>
    <output data-testid="upload-count">{uploaded}</output>
  </SiteProvider>;
}
const galleryImages = Array.from({ length: 30 }, (_, i) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="hsl(${i * 12},45%,30%)"/><text x="600" y="420" text-anchor="middle" fill="white" font-size="72">Release photo ${i + 1}</text></svg>`));
function GalleryPreview() {
  const count = location.search === "?empty" ? 0 : location.search === "?single" ? 1 : 30;
  return <main style={{ maxWidth: 380, margin: "30px auto" }}><PressReleaseGallery images={galleryImages.slice(0, count)} title="Seattle community celebration" siteName="Seattle Desi TV" /></main>;
}
createRoot(document.getElementById("root")!).render(location.pathname === "/attachments" ? <AttachmentPreview /> : location.pathname === "/gallery" ? <GalleryPreview /> : <Preview />);
