import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import PressReleaseEditor from "../app/components/pressReleases/PressReleaseEditor";
import PressReleaseBody from "../app/components/pressReleases/PressReleaseBody";

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
createRoot(document.getElementById("root")!).render(<Preview />);
