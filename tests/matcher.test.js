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

// --- Fuzzy matching, joins, homophones ---------------------------------

test("short look-alike words are not confused (then/they/these)", () => {
  const t = tokens("Then they ran.");
  const r = advance(t, 0, ["they"], 0);
  // "they" is within the lookahead, so it skips "then" -- but it must never *match* it.
  assert.strictEqual(r.hits[0], 1);
  assert.strictEqual(win.ReadDen.wordsMatch("then", "they"), false);
  assert.strictEqual(win.ReadDen.wordsMatch("these", "them"), false);
});

test("homophones, endings and a slipped letter on longer words are accepted", () => {
  const m = win.ReadDen.wordsMatch;
  assert.ok(m("two", "to"));
  assert.ok(m("walk", "walked"));
  assert.ok(m("dinosaur", "dinosaurs"));
  assert.ok(m("stegosaurus", "stegosaurs"));
  assert.ok(!m("cat", "cap"));
});

test("two heard words can make one printed word (T-Rex)", () => {
  const t = tokens("The T-Rex was shy.");
  const r = advance(t, 0, ["the", "t", "rex"], 0);
  assert.strictEqual(r.cursor, 2);
});

test("heard text is normalised: digits become words, hyphens vanish", () => {
  assert.deepStrictEqual(Array.from(win.ReadDen.normalizeHeard("T-Rex 2 Hello!")), ["trex", "two", "hello"]);
});

// --- The follower: interim results get revised ---------------------------

const R = (words, isFinal) => ({ words, isFinal: !!isFinal });

test("an interim guess that is later revised does not derail the highlight", () => {
  const t = tokens("The cat sat on the mat.");
  const f = win.ReadDen.createFollower(t);
  f.update([R(["the", "bat"])]);
  assert.strictEqual(f.cursor(), 1);
  f.update([R(["the", "cat", "sat"])]);
  assert.strictEqual(f.cursor(), 3);
  f.update([R(["the", "cat", "sat"], true)]);
  assert.strictEqual(f.cursor(), 3);
  f.update([R(["the", "cat", "sat"], true), R(["on", "the"])]);
  assert.strictEqual(f.cursor(), 5);
});

test("words heard on the previous page are not counted on the next", () => {
  const t = tokens("The dog ran.");
  const earlier = [R(["it", "was", "the", "end"])]; // result still in flight at the page turn
  const f = win.ReadDen.createFollower(t, win.ReadDen.baselineOf(earlier));
  f.update([R(["it", "was", "the", "end", "the", "dog"])]);
  assert.strictEqual(f.cursor(), 2, "only 'the dog' belongs to this page");
});

test("passed-over words are marked skipped, heard ones heard, helped ones helped", () => {
  const t = tokens("The big cat sat.");
  const f = win.ReadDen.createFollower(t);
  f.update([R(["the", "cat"])]);
  assert.deepStrictEqual(Array.from(f.statuses()), [1, 2, 1, 0]);
  f.help();
  assert.deepStrictEqual(Array.from(f.statuses()), [1, 2, 1, 3]);
  assert.ok(f.done());
});

test("a new recognition run starts clean without losing the position", () => {
  const t = tokens("One two three four.");
  const f = win.ReadDen.createFollower(t);
  f.update([R(["one", "two"], true)]);
  f.newRun();
  f.update([R(["three"])]);
  assert.strictEqual(f.cursor(), 3);
});
