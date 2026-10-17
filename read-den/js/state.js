// Read Den — persistent state. Everything lives in localStorage, no
// accounts, no backend. Mirrors the shape of WordDen's state module.
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  var STORAGE_KEY = "readDenState.v1";
  var MAX_PAGE_READS = 2000;
  var MAX_STUMBLE_LOG = 200;
  // A word that used to need help is "mastered" once it has been read
  // unaided this many times since.
  var MASTERED_AFTER = 3;
  var cached = null;

  function defaultBookProgress() {
    return { lastPage: 0, maxPageReached: 0, rereads: 0, opens: 0, completions: 0, lastOpened: 0, lastCompleted: 0 };
  }

  function load() {
    if (cached) return cached;
    var parsed = Den.storage.read(STORAGE_KEY);
    cached = parsed || {};
    if (!cached.books) cached.books = {};
    if (!cached.stumbles) cached.stumbles = {};
    if (!cached.stumbleLog) cached.stumbleLog = [];
    if (!cached.sessions) cached.sessions = [];
    if (!cached.pageReads) cached.pageReads = [];
    if (!cached.words) cached.words = {};
    if (typeof cached.narrationVoiceName !== "string") cached.narrationVoiceName = null;
    return cached;
  }

  function save() {
    Den.storage.write(STORAGE_KEY, cached);
  }

  function getBookProgress(bookId) {
    var state = load();
    var p = state.books[bookId] || (state.books[bookId] = {});
    var defaults = defaultBookProgress();
    Object.keys(defaults).forEach(function (k) {
      if (typeof p[k] !== "number") p[k] = defaults[k];
    });
    return p;
  }

  ReadDen.state = {
    MASTERED_AFTER: MASTERED_AFTER,

    getBookProgress: function (bookId) {
      var p = getBookProgress(bookId);
      return {
        lastPage: p.lastPage, maxPageReached: p.maxPageReached, rereads: p.rereads, opens: p.opens,
        completions: p.completions, lastOpened: p.lastOpened, lastCompleted: p.lastCompleted
      };
    },

    recordBookOpen: function (bookId) {
      var p = getBookProgress(bookId);
      p.opens += 1;
      p.lastOpened = Date.now();
      save();
    },

    // Call whenever the reader lands on a page, so the book resumes there.
    setPage: function (bookId, pageIndex) {
      var p = getBookProgress(bookId);
      p.lastPage = pageIndex;
      p.maxPageReached = Math.max(p.maxPageReached, pageIndex);
      save();
    },

    // Reached the end of the book. It starts over from page one next time.
    recordCompletion: function (bookId) {
      var p = getBookProgress(bookId);
      p.completions += 1;
      p.lastCompleted = Date.now();
      p.lastPage = 0;
      p.maxPageReached = 0;
      save();
    },

    // A word was read to the child on request. Never shown to them as a
    // mistake — it just feeds the parent view and the Word Game's practice.
    recordHelp: function (word, bookId, page) {
      if (!word) return;
      var state = load();
      state.stumbles[word] = (state.stumbles[word] || 0) + 1;
      var w = state.words[word] || (state.words[word] = { helped: 0, clean: 0 });
      w.helped += 1;
      w.clean = 0;
      w.last = Date.now();
      w.bookId = bookId;
      w.page = page;
      state.stumbleLog.push({ word: word, bookId: bookId, page: page, ts: w.last });
      if (state.stumbleLog.length > MAX_STUMBLE_LOG) {
        state.stumbleLog = state.stumbleLog.slice(-MAX_STUMBLE_LOG);
      }
      save();
    },

    // One stretch of reading on one page. rec: { bookId, page, ts, ms, mode
    // ("listen" when the microphone followed along, "manual" otherwise),
    // words, heard, skipped, helped, completed }. heardWords: the words the
    // microphone heard read unaided — a word that was once helped and is
    // now read cleanly enough times stops being treated as tricky.
    recordPageRead: function (rec, heardWords) {
      var state = load();
      state.pageReads.push(rec);
      if (state.pageReads.length > MAX_PAGE_READS) {
        state.pageReads = state.pageReads.slice(-MAX_PAGE_READS);
      }
      (heardWords || []).forEach(function (word) {
        var w = state.words[word];
        if (!w) return;
        w.clean += 1;
        if (w.clean >= MASTERED_AFTER) delete state.stumbles[word];
      });
      save();
    },

    getPageReads: function () {
      return load().pageReads.slice();
    },

    // { word: { helped, clean, last, bookId, page } } for every word that
    // has ever needed help.
    getWordStats: function () {
      return load().words;
    },

    getAllBookProgress: function () {
      return load().books;
    },

    // Words still tricky: helped at some point and not yet read unaided
    // MASTERED_AFTER times since, most-helped first.
    getStumbleCounts: function () {
      var counts = load().stumbles;
      var out = [];
      Object.keys(counts).forEach(function (word) {
        out.push({ word: word, count: counts[word] });
      });
      out.sort(function (a, b) {
        return b.count - a.count;
      });
      return out;
    },

    getNarrationVoiceName: function () {
      return load().narrationVoiceName;
    },
    setNarrationVoiceName: function (name) {
      load().narrationVoiceName = name || null;
      save();
    },

    startSession: function (bookId) {
      var state = load();
      var session = { start: Date.now(), end: Date.now(), bookId: bookId };
      state.sessions.push(session);
      save();
      return state.sessions.length - 1;
    },

    endSession: function (index) {
      var state = load();
      var session = state.sessions[index];
      if (session) {
        session.end = Date.now();
        save();
      }
    },

    getSessions: function () {
      return load().sessions.slice();
    }
  };

  window.ReadDen = ReadDen;
})();
