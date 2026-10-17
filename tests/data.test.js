const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { load, root } = require("./load");

test("every spelling word has a word clip and (with a sentence) a sentence clip", () => {
  const win = load(["spelling-den/js/weeks.js", "spelling-den/js/sentences.js"]);
  const S = win.SpellDen;
  S.getAllWeeks().forEach((week) => {
    assert.strictEqual(week.words.length, 10, week.id + " should have 10 words");
    week.words.forEach((w) => {
      assert.ok(fs.existsSync(path.join(root, "spelling-den/audio", w + ".mp3")), "missing clip for " + w);
      assert.ok(S.SENTENCES[w], "missing sentence for " + w);
      assert.ok(fs.existsSync(path.join(root, "spelling-den/audio", w + "-sentence.mp3")), "missing sentence clip for " + w);
    });
  });
});

test("spelling week ids are unique and Year 5 ids start with y5", () => {
  const S = load(["spelling-den/js/weeks.js"]).SpellDen;
  const ids = S.getAllWeeks().map((w) => w.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  S.WEEKS_Y5.forEach((w) => assert.match(w.id, /^y5/));
  S.WEEKS.forEach((w) => assert.doesNotMatch(w.id, /^y5/));
});

test("word den clusters are well formed and every word has a clip", () => {
  const W = load(["word-den/js/wordbank.js", "word-den/js/wordbanks.js"]).WordDen;
  const ids = W.CLUSTERS.map((c) => c.id);
  assert.strictEqual(new Set(ids).size, ids.length, "duplicate cluster ids");
  W.CLUSTERS.forEach((c) => assert.ok(c.words.length >= 2, c.id));
  const slug = (w) => w.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  W.ACTIVE_WORDS.forEach((w) => {
    assert.ok(fs.existsSync(path.join(root, "word-den/audio", slug(w) + ".mp3")), "missing clip for " + w);
  });
});

test("books have unique ids and pages", () => {
  const R = load(["read-den/js/books.js"]).ReadDen;
  const ids = R.BOOKS.map((b) => b.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  R.BOOKS.forEach((b) => {
    assert.ok(b.title && b.cover && b.pages.length > 0, b.id);
    b.pages.forEach((p) => {
      const n = R.tokenizePage(p).length;
      assert.ok(n > 0 && n <= 12, b.id + ": a page should be 1-12 words, got " + n);
    });
  });
});

test("the service worker precaches every file, including all audio", () => {
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const listed = new Set((sw.match(/"\.\/[^"]+"/g) || []).map((s) => s.slice(3, -1)));
  ["spelling-den/audio", "word-den/audio"].forEach((dir) => {
    fs.readdirSync(path.join(root, dir)).forEach((f) => {
      assert.ok(listed.has(dir + "/" + f), "not precached (run node scripts/build-sw.js): " + dir + "/" + f);
    });
  });
  ["index.html", "parent.html", "js/common.js"].forEach((f) => assert.ok(listed.has(f), f));
});
