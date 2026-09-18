// Read Den — persistent state. Everything lives in localStorage, no
// accounts, no backend. Mirrors the shape of WordDen's state module.
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  var STORAGE_KEY = "readDenState.v1";
  var cached = null;

  function defaultBookProgress() {
    return { lastPage: 0, maxPageReached: 0, rereads: 0, opens: 0 };
  }

  function load() {
    if (cached) return cached;
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    var parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parsed = null;
      }
    }
    cached = parsed || { books: {}, stumbles: {}, stumbleLog: [], sessions: [], narrationVoiceName: null };
    if (!cached.books) cached.books = {};
    if (!cached.stumbles) cached.stumbles = {};
    if (!cached.stumbleLog) cached.stumbleLog = [];
    if (!cached.sessions) cached.sessions = [];
    if (typeof cached.narrationVoiceName !== "string") cached.narrationVoiceName = null;
    return cached;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    } catch (e) {
      // Storage unavailable (private mode, quota, etc.) — fail silently.
    }
  }

  function getBookProgress(bookId) {
    var state = load();
    if (!state.books[bookId]) state.books[bookId] = defaultBookProgress();
    return state.books[bookId];
  }

  ReadDen.state = {
    getBookProgress: function (bookId) {
      var p = getBookProgress(bookId);
      return { lastPage: p.lastPage, maxPageReached: p.maxPageReached, rereads: p.rereads, opens: p.opens };
    },

    recordBookOpen: function (bookId) {
      var p = getBookProgress(bookId);
      p.opens += 1;
      save();
    },

    // Call whenever the reader navigates to a page. Reread is a soft
    // signal — navigating back to (or re-landing on) a page already
    // reached before, not a precise "restart" count.
    setPage: function (bookId, pageIndex) {
      var p = getBookProgress(bookId);
      if (pageIndex < p.maxPageReached) {
        p.rereads += 1;
      }
      p.lastPage = pageIndex;
      p.maxPageReached = Math.max(p.maxPageReached, pageIndex);
      save();
    },

    getAllBookProgress: function () {
      return load().books;
    },

    // A stumble is never surfaced to him as "wrong" — it's just logged
    // quietly for the parent view (and, per the data model, could feed
    // the Word Game's practice clusters later).
    recordStumble: function (word, bookId, page) {
      var state = load();
      var key = word.toLowerCase();
      state.stumbles[key] = (state.stumbles[key] || 0) + 1;
      state.stumbleLog.push({ word: key, bookId: bookId, page: page, ts: Date.now() });
      if (state.stumbleLog.length > 200) {
        state.stumbleLog = state.stumbleLog.slice(-200);
      }
      save();
    },

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
      var session = { start: Date.now(), end: null, activeMs: 0, bookId: bookId };
      state.sessions.push(session);
      save();
      return state.sessions.length - 1;
    },

    addActiveMs: function (index, ms) {
      var state = load();
      var session = state.sessions[index];
      if (session && ms > 0) {
        session.activeMs += ms;
        save();
      }
    },

    endSession: function (index) {
      var state = load();
      var session = state.sessions[index];
      if (session && !session.end) {
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
