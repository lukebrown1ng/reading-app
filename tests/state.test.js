const test = require("node:test");
const assert = require("node:assert");
const { load } = require("./load");

const COMMON = ["js/common.js"];

function spell() {
  return load(COMMON.concat(["spelling-den/js/weeks.js", "spelling-den/js/sentences.js", "spelling-den/js/state.js"]));
}

function addRoundOn(win, daysAgo, firstTry, total) {
  const results = [];
  for (let i = 0; i < total; i++) results.push({ word: "w" + i, status: i < firstTry ? "first" : "skipped" });
  win.SpellDen.state.addRound({
    at: Date.now() - daysAgo * 86400000, weekId: "week1", weekLabel: "Week 1", mode: "tiles", results
  });
}

test("streak counts consecutive days ending today", () => {
  const win = spell();
  addRoundOn(win, 0, 8, 10);
  addRoundOn(win, 1, 9, 10);
  addRoundOn(win, 2, 5, 10);
  const stats = win.SpellDen.state.getStreakStats();
  assert.strictEqual(stats.doneToday, true);
  assert.strictEqual(stats.streak, 3);
  assert.strictEqual(stats.bestScore, 9);
});

test("streak survives a not-yet-played today but breaks after a missed day", () => {
  const a = spell();
  addRoundOn(a, 1, 7, 10);
  addRoundOn(a, 2, 7, 10);
  assert.strictEqual(a.SpellDen.state.getStreakStats().streak, 2);
  assert.strictEqual(a.SpellDen.state.getStreakStats().doneToday, false);

  const b = spell();
  addRoundOn(b, 3, 7, 10);
  assert.strictEqual(b.SpellDen.state.getStreakStats().streak, 0);
});

test("spelling word status: a missed word can recover", () => {
  const S = spell().SpellDen.state;
  assert.strictEqual(S.getWordStatus("because"), "new");
  S.recordMiss("because", true);
  assert.strictEqual(S.getWordStatus("because"), "shaky");
  S.recordCorrect("because", true);
  assert.strictEqual(S.getWordStatus("because"), "learning");
  S.recordCorrect("because", true);
  assert.strictEqual(S.getWordStatus("because"), "solid");
});

test("a word is counted as seen once per round, even after a retry", () => {
  const S = spell().SpellDen.state;
  S.recordMiss("early", true);
  S.recordMiss("early", false);
  S.recordCorrect("early", false); // right after retries
  assert.strictEqual(S.getWordRecord("early").seen, 1);
  assert.strictEqual(S.getWordRecord("early").misses, 2);
});

test("tricky words: shaky before learning, solid left out", () => {
  const win = spell();
  const S = win.SpellDen.state;
  S.recordMiss("eight", true);                  // shaky
  S.recordMiss("vein", true); S.recordCorrect("vein", true); // learning
  S.recordCorrect("veil", true);                // solid
  const words = S.getTrickyWords(win.SpellDen.getWeeksForYear(3), 10);
  assert.deepStrictEqual(Array.from(words), ["eight", "vein"]);
});

test("sessions record a heartbeat end, never a null one", () => {
  const S = spell().SpellDen.state;
  const i = S.startSession();
  assert.ok(S.getSessions()[i].end >= S.getSessions()[i].start);
  S.endSession(i);
  assert.ok(S.getSessions()[i].end);
});

test("backup round-trips and rejects other files", () => {
  const a = spell();
  a.SpellDen.state.recordMiss("eight", true);
  const json = a.Den.backup.toJSON();

  const b = spell();
  assert.strictEqual(b.Den.backup.restore(json), 1);
  const fresh = spell();
  fresh.localStorage.setItem("spellDenState.v1", b.localStorage.getItem("spellDenState.v1"));
  assert.strictEqual(fresh.SpellDen.state.getWordRecord("eight").misses, 1);

  assert.throws(() => b.Den.backup.restore('{"hello":1}'));
  assert.throws(() => b.Den.backup.restore("not json"));
});

test("word den: a miss softens the box, a hit strengthens it", () => {
  const win = load(COMMON.concat(["word-den/js/wordbank.js", "word-den/js/levels.js", "word-den/js/state.js"]));
  const S = win.WordDen.state;
  S.recordCorrect("they");
  S.recordCorrect("they");
  assert.strictEqual(S.getWordRecord("they").box, 2);
  S.recordMiss("they");
  assert.strictEqual(S.getWordRecord("they").box, 1);
  assert.strictEqual(S.getWordStatus("they"), "learning");
});
