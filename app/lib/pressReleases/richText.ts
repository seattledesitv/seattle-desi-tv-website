import sanitizeHtml from "sanitize-html";

// Older releases contain literal plain text. Only editor-style block markup
// opts into HTML; escape everything else before passing it to the editor.
export function isRichPressRelease(body: string) {
  return /^\s*<(?:p|h[23]|ul|ol|blockquote)(?:\s[^>]*)?>/i.test(body);
}

export function sanitizePressReleaseHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "a"],
    allowedAttributes: { a: ["href", "target", "rel"], ol: ["start"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attributes) => ({
        tagName: "a",
        attribs: { ...attributes, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });
}

export function pressReleaseHtml(body: string) {
  if (isRichPressRelease(body)) return sanitizePressReleaseHtml(body);
  const escaped = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\r\n?/g, "\n").replace(/\n/g, "<br>")}</p>`;
}

export function pressReleaseText(body: string) {
  if (!isRichPressRelease(body)) return body;
  const html = sanitizePressReleaseHtml(body)
    .replace(/<br\s*\/?>|<\/(?:p|h[23]|li|blockquote)>/gi, "\n");
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  // The sanitizer normalizes entities and escapes &, <, > in its text output.
  return text.replace(/\u00a0/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
}
