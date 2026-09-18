// Spelling Den — persistent state. Everything lives in localStorage, its
// own key, independent of Word Den / Read a Book.
var SpellDen = window.SpellDen || {};

(function () {
  "use strict";

  var STORAGE_KEY = "spellDenState.v1";
  var cached = null;

  function defaultWordRecord() {
    return { seen: 0, correctFirstTry: 0, misses: 0, lastSeen: 0 };
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
    cached = parsed || {
      words: {}, sessions: [], activeWeekId: null, voiceName: null,
      customWeeks: []
    };
    if (!cached.words) cached.words = {};
    if (!cached.sessions) cached.sessions = [];
    if (typeof cached.activeWeekId !== "string") cached.activeWeekId = null;
    if (typeof cached.voiceName !== "string") cached.voiceName = null;
    if (!cached.customWeeks) cached.customWeeks = [];
    return cached;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    } catch (e) {
      // Storage unavailable (private mode, quota, etc.) — fail silently,
      // the game still works within the session.
    }
  }

  function wordKey(word) {
    return word.toLowerCase();
  }

  function getWordRecordRaw(word) {
    var state = load();
    var key = wordKey(word);
    if (!state.words[key]) state.words[key] = defaultWordRecord();
    return state.words[key];
  }

  SpellDen.state = {
    getActiveWeekId: function () {
      return load().activeWeekId;
    },
    setActiveWeekId: function (id) {
      load().activeWeekId = id || null;
      save();
    },

    getVoiceName: function () {
      return load().voiceName;
    },
    setVoiceName: function (name) {
      load().voiceName = name || null;
      save();
    },

    getWordRecord: function (word) {
      var r = getWordRecordRaw(word);
      return {
        seen: r.seen,
        correctFirstTry: r.correctFirstTry,
        misses: r.misses,
        lastSeen: r.lastSeen
      };
    },

    // Call when a word is spelled correctly. `firstTry` is false if it
    // took one or more wrong attempts first.
    recordCorrect: function (word, firstTry) {
      var record = getWordRecordRaw(word);
      record.seen += 1;
      if (firstTry) record.correctFirstTry += 1;
      record.lastSeen = Date.now();
      save();
    },

    // A wrong attempt — the child sees the correct spelling right away,
    // this just logs it for the parent view.
    recordMiss: function (word) {
      var record = getWordRecordRaw(word);
      record.seen += 1;
      record.misses += 1;
      record.lastSeen = Date.now();
      save();
    },

    // Aggregate stats for one week's word list, for the parent view.
    getWeekStats: function (words) {
      return words.map(function (word) {
        var r = getWordRecordRaw(word);
        return {
          word: word,
          seen: r.seen,
          correctFirstTry: r.correctFirstTry,
          misses: r.misses
        };
      });
    },

    startSession: function () {
      var state = load();
      var session = { start: Date.now(), end: null };
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
    },

    // --- Parent-added weeks -------------------------------------------
    // Weeks added from the parent page, kept separate from the built-in
    // seed list in weeks.js so new homework lists can be added on the fly
    // without touching code. Appended after the built-in weeks, in the
    // order added (see SpellDen.getAllWeeks).

    getCustomWeeks: function () {
      return load().customWeeks.slice();
    },

    addCustomWeek: function (label, words) {
      var state = load();
      var week = {
        id: "custom-" + Date.now(),
        label: label,
        words: words,
        custom: true
      };
      state.customWeeks.push(week);
      save();
      return week;
    },

    deleteCustomWeek: function (id) {
      var state = load();
      state.customWeeks = state.customWeeks.filter(function (w) {
        return w.id !== id;
      });
      if (state.activeWeekId === id) state.activeWeekId = null;
      save();
    }
  };

  window.SpellDen = SpellDen;
})();
