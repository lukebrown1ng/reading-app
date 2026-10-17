const test = require("node:test");
const assert = require("node:assert");
const { load } = require("./load");

const FILES = ["js/common.js", "read-den/js/books.js", "read-den/js/state.js", "read-den/js/stats.js"];
const DAY = 86400000;
const NOW = new Date(2026, 9, 17, 15, 0, 0).getTime();

function setup() {
  const win = load(FILES);
  const add = (daysAgo, extra) => win.ReadDen.state.recordPageRead(Object.assign({
    bookId: "stego", page: 0, ts: NOW - daysAgo * DAY, ms: 30000, mode: "listen",
    words: 6, heard: 6, skipped: 0, helped: 0, completed: true
  }, extra), []);
  return { win, add, stats: () => win.ReadDen.computeStats(win.ReadDen.state, win.ReadDen.BOOKS, NOW) };
}

test("no reading means no data and no insights", () => {
  const { stats } = setup();
  const s = stats();
  assert.strictEqual(s.hasData, false);
  assert.deepStrictEqual(Array.from(s.insights), []);
});

test("this week's totals, pace and help rate come from the log", () => {
  const { add, stats } = setup();
  add(0, { ms: 60000, words: 30, heard: 28, helped: 2 });
  add(1, { ms: 60000, words: 30, heard: 30 });
  const s = stats();
  assert.strictEqual(s.week.pages, 2);
  assert.strictEqual(s.week.words, 60);
  assert.strictEqual(s.week.minutes, 2);
  assert.strictEqual(s.pace.wpm, 30);
  assert.ok(Math.abs(s.pace.helpRate - 2 / 60) < 1e-9);
});

test("manual (no microphone) pages count as reading but not towards pace", () => {
  const { add, stats } = setup();
  add(0, { mode: "manual", ms: 600000, words: 6 });
  const s = stats();
  assert.strictEqual(s.week.pages, 1);
  assert.strictEqual(s.pace.wpm, null);
});

test("streak counts consecutive days and survives a not-yet-read today", () => {
  const { add, stats } = setup();
  add(1, {});
  add(2, {});
  add(3, {});
  add(6, {});
  const s = stats();
  assert.strictEqual(s.streak.current, 3);
  assert.strictEqual(s.streak.best, 3);
  assert.strictEqual(s.streak.today, false);
});

test("the 14-day chart has one entry per day, oldest first", () => {
  const { add, stats } = setup();
  add(0, { ms: 120000 });
  const s = stats();
  assert.strictEqual(s.daily.length, 14);
  assert.strictEqual(s.daily[13].ms, 120000);
  assert.strictEqual(s.daily[0].ms, 0);
});

test("a helped word is tricky, improves with clean reads, then is mastered and leaves the stumble list", () => {
  const { win, stats } = setup();
  const st = win.ReadDen.state;
  st.recordHelp("dinosaur", "stego", 2);
  assert.strictEqual(stats().words[0].status, "tricky");
  assert.strictEqual(st.getStumbleCounts()[0].word, "dinosaur");

  const clean = () => st.recordPageRead({ bookId: "stego", page: 0, ts: NOW, ms: 5000, mode: "listen", words: 1, heard: 1, skipped: 0, helped: 0 }, ["dinosaur"]);
  clean();
  assert.strictEqual(stats().words[0].status, "improving");
  clean();
  clean();
  assert.strictEqual(stats().words[0].status, "mastered");
  assert.strictEqual(st.getStumbleCounts().length, 0, "mastered words stop feeding the Word Game");

  st.recordHelp("dinosaur", "stego", 2);
  assert.strictEqual(stats().words[0].status, "tricky", "needing help again starts the count over");
});

test("words never helped are not tracked", () => {
  const { win } = setup();
  win.ReadDen.state.recordPageRead({ bookId: "stego", page: 0, ts: NOW, ms: 1, mode: "listen", words: 1, heard: 1, skipped: 0, helped: 0 }, ["cat"]);
  assert.deepStrictEqual(Object.keys(win.ReadDen.state.getWordStats()), []);
});

test("finishing a book is counted and it starts again from page one", () => {
  const { win, stats } = setup();
  const st = win.ReadDen.state;
  st.recordBookOpen("stego");
  st.setPage("stego", 5);
  st.recordCompletion("stego");
  const p = st.getBookProgress("stego");
  assert.strictEqual(p.completions, 1);
  assert.strictEqual(p.lastPage, 0);
  assert.strictEqual(stats().totals.completions, 1);
  assert.strictEqual(stats().week.booksFinished, 1);
});

test("state saved by the older version (no new fields) still loads", () => {
  const win = load(FILES);
  // State is read lazily, so seeding storage after the scripts load is the same as an old save.
  win.localStorage.setItem("readDenState.v1", JSON.stringify({
    books: { stego: { lastPage: 3, maxPageReached: 4, rereads: 1, opens: 2 } },
    stumbles: { cat: 2 }, stumbleLog: [], sessions: []
  }));
  const p = win.ReadDen.state.getBookProgress("stego");
  assert.strictEqual(p.lastPage, 3);
  assert.strictEqual(p.completions, 0);
  assert.strictEqual(win.ReadDen.state.getStumbleCounts()[0].word, "cat");
  assert.strictEqual(win.ReadDen.state.getPageReads().length, 0);
});
