import assert from "node:assert/strict";
import { test } from "node:test";
import { pressReleaseHtml, pressReleaseText, sanitizePressReleaseHtml } from "../app/lib/pressReleases/richText";

test("legacy text retains literal markup, special characters, and line breaks", () => {
  const body = 'Community news <special> & updates\r\nSecond line\n\nLast line';
  assert.equal(pressReleaseHtml(body), '<p>Community news &lt;special&gt; &amp; updates<br>Second line<br><br>Last line</p>');
  assert.equal(pressReleaseText(body), body);
});

test("supported formatting and safe links survive storage and rendering", () => {
  const html = '<h2>News</h2><p><strong>Bold</strong> <em>Italic</em> <u>Underline</u> <s>Strike</s> <a href="https://example.com">Website</a></p><ul><li><p>Item</p></li></ul><ol start="3"><li><p>Third</p></li></ol><blockquote><p>Quote</p></blockquote>';
  const clean = pressReleaseHtml(html);
  assert.match(clean, /<strong>Bold<\/strong>/);
  assert.match(clean, /<ul><li>/);
  assert.match(clean, /<ol start="3">/);
  assert.match(clean, /<blockquote>/);
  assert.match(clean, /href="https:\/\/example.com" target="_blank" rel="noopener noreferrer"/);
  assert.equal(pressReleaseHtml(clean), clean);
});

test("malicious HTML and encoded unsafe URLs cannot execute", () => {
  const clean = sanitizePressReleaseHtml('<p onclick="alert(1)" style="color:red">Text<script>alert(1)</script><img src=x onerror=alert(1)><iframe src="https://evil.test"></iframe><a href="javascript:alert(1)">bad</a><a href="jav&#97;script:alert(1)">encoded</a><a href="data:text/html,evil">data</a><a href="//evil.test">relative</a></p>');
  assert.doesNotMatch(clean, /onclick|style=|<script|<img|<iframe|href=/);
  assert.doesNotMatch(clean, /alert\(1\)/);
});

test("body length uses visible text rather than formatting or encoded entity length", () => {
  assert.equal(pressReleaseText('<p><strong>Hello</strong> &amp; &lt;news&gt; &#x1f389;</p>'), 'Hello & <news> 🎉');
  assert.equal(pressReleaseText('<p><strong></strong></p>'), '');
  assert.equal(pressReleaseText(`<p>${'&amp;'.repeat(99)}</p>`).length, 99);
  assert.equal(pressReleaseText(`<p>${'a'.repeat(100)}</p>`).length, 100);
  assert.equal(pressReleaseText('<p>&amp;lt;literal&amp;gt;</p>'), '&lt;literal&gt;');
});
