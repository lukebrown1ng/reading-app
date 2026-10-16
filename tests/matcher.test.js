const test = require("node:test");
const assert = require("node:assert");
const { load } = require("./load");

const win = load(["read-den/js/books.js", "read-den/js/matcher.js"]);
const tokens = (text) => win.ReadDen.tokenizePage(text);
const advance = (...a) => win.ReadDen.advanceBySpeech(...a);

test("tokenizer lower-cases and strips punctuation", () => {
  assert.deepStrictEqual(Array.from(tokens("Hello, there!").map((t) => t.norm)), ["hello", "there"]);
  assert.strictEqual(tokens("Hello, there!")[0].display, "Hello,");
});

test("reading the words in order moves the cursor one at a time", () => {
  const t = tokens("The cat sat down.");
  let r = advance(t, 0, ["the"], 0);
  assert.strictEqual(r.cursor, 1);
  r = advance(t, r.cursor, ["the", "cat", "sat"], r.consumed);
  assert.strictEqual(r.cursor, 3);
});

test("a repeated word does not jump past words not yet read", () => {
  const t = tokens("The dinosaur went to the lake.");
  const r = advance(t, 0, ["the"], 0);
  assert.strictEqual(r.cursor, 1, "first 'the' should only advance one word");
});

test("a word already used is not matched again", () => {
  const t = tokens("The cat and the dog.");
  let r = advance(t, 0, ["the"], 0);
  // The recogniser re-sends the same words plus new ones; 'the' mustn't count twice.
  r = advance(t, r.cursor, ["the", "cat"], r.consumed);
  assert.strictEqual(r.cursor, 2);
  r = advance(t, r.cursor, ["the", "cat", "and"], r.consumed);
  assert.strictEqual(r.cursor, 3);
});

test("a skipped word within the lookahead is tolerated", () => {
  const t = tokens("The big cat sat.");
  const r = advance(t, 0, ["the", "cat"], 0);
  assert.strictEqual(r.cursor, 3);
});

test("words that match nothing are ignored", () => {
  const t = tokens("The cat sat.");
  const r = advance(t, 0, ["banana", "the"], 0);
  assert.strictEqual(r.cursor, 1);
});

test("a word far beyond the lookahead does not move the cursor", () => {
  const t = tokens("One two three four five six seven.");
  const r = advance(t, 0, ["seven"], 0);
  assert.strictEqual(r.cursor, 0);
});

test("a restarted recognition run (fewer words than consumed) starts over", () => {
  const t = tokens("The cat sat.");
  const r = advance(t, 1, ["cat"], 5);
  assert.strictEqual(r.cursor, 2);
});

test("finishing the page stops at the last word", () => {
  const t = tokens("Go now.");
  const r = advance(t, 0, ["go", "now", "extra"], 0);
  assert.strictEqual(r.cursor, 2);
});
