import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "app");
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const skipped = new Set([
  path.normalize("app/lib/supabaseBrowser.ts"),
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (extensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function findCallEnd(source, start) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        let end = i + 1;
        while (/\s/.test(source[end] || "")) end += 1;
        if (source[end] === ";") end += 1;
        return end;
      }
    }
  }
  return -1;
}

function relativeHelperImport(file) {
  const fromDir = path.dirname(file);
  let relative = path.relative(fromDir, path.join(appDir, "lib", "supabaseBrowser"));
  relative = relative.split(path.sep).join("/");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}

let changed = 0;
for (const file of walk(appDir)) {
  const relativeFile = path.relative(root, file);
  if (skipped.has(path.normalize(relativeFile))) continue;
  if (relativeFile.includes(`${path.sep}api${path.sep}`) || path.basename(file) === "route.ts") continue;

  let source = fs.readFileSync(file, "utf8");
  if (!source.includes("createClient") || !source.includes("NEXT_PUBLIC_SUPABASE_URL")) continue;

  const declaration = /const\s+supabase\s*=\s*createClient\s*\(/m.exec(source);
  if (!declaration) continue;
  const openParen = source.indexOf("(", declaration.index);
  const callEnd = findCallEnd(source, openParen);
  if (callEnd < 0) {
    console.warn(`[supabase-normalize] Could not parse ${relativeFile}`);
    continue;
  }

  source = `${source.slice(0, declaration.index)}const supabase = getSupabaseBrowserClient();${source.slice(callEnd)}`;

  source = source.replace(/import\s*\{([^}]*)\}\s*from\s*["']@supabase\/supabase-js["'];?\s*/m, (whole, names) => {
    const remaining = names.split(",").map((name) => name.trim()).filter(Boolean).filter((name) => !/^createClient(?:\s+as\s+\w+)?$/.test(name));
    return remaining.length ? `import { ${remaining.join(", ")} } from "@supabase/supabase-js";\n` : "";
  });

  if (!source.includes("getSupabaseBrowserClient") || !source.includes("from \"") ) {
    // handled below
  }

  const helper = relativeHelperImport(file);
  const needsAuthKey = source.includes("AUTH_STORAGE_KEY");
  const importNames = needsAuthKey ? "AUTH_STORAGE_KEY, getSupabaseBrowserClient" : "getSupabaseBrowserClient";
  if (!new RegExp(`from [\\"']${helper.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\"']`).test(source)) {
    const lines = source.split("\n");
    let insertAt = 0;
    while (insertAt < lines.length && (lines[insertAt].startsWith('"use client"') || lines[insertAt].trim() === "" || lines[insertAt].startsWith("import "))) insertAt += 1;
    lines.splice(insertAt, 0, `import { ${importNames} } from "${helper}";`);
    source = lines.join("\n");
  }

  // Remove a local AUTH_STORAGE_KEY declaration when the shared constant is imported.
  if (needsAuthKey) source = source.replace(/const\s+AUTH_STORAGE_KEY\s*=\s*["']sdtv-auth-token-v2["'];?\s*/m, "");

  fs.writeFileSync(file, source);
  changed += 1;
  console.log(`[supabase-normalize] Updated ${relativeFile}`);
}

console.log(`[supabase-normalize] Completed. Updated ${changed} client file(s).`);
