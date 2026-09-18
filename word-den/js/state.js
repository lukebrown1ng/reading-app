// Word Den — persistent state & spaced repetition.
// Everything lives in localStorage. No accounts, no backend.
var WordDen = window.WordDen || {};

(function () {
  "use strict";

  var STORAGE_KEY = "wordDenState.v1";
  var MAX_BOX = 4; // 0 = brand new / shaky, 4 = solid
  var cached = null;

  function defaultWordRecord() {
    return { box: 0, seen: 0, misses: 0, correctFirstTry: 0, lastSeen: 0 };
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
    cached = parsed || { words: {}, sessions: [], audioMode: true, voiceName: null };
    if (!cached.words) cached.words = {};
    if (!cached.sessions) cached.sessions = [];
    if (typeof cached.audioMode !== "boolean") cached.audioMode = true;
    if (typeof cached.voiceName !== "string") cached.voiceName = null;
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

  function getWordRecord(word) {
    var state = load();
    var key = wordKey(word);
    if (!state.words[key]) state.words[key] = defaultWordRecord();
    return state.words[key];
  }

  WordDen.state = {
    getAudioMode: function () {
      return load().audioMode;
    },
    setAudioMode: function (on) {
      load().audioMode = !!on;
      save();
    },

    // The system voice the parent picked (by name) as sounding least
    // robotic on this device — null means "let the app auto-pick".
    getVoiceName: function () {
      return load().voiceName;
    },
    setVoiceName: function (name) {
      load().voiceName = name || null;
      save();
    },

    // Weight used when picking a target word for the next round.
    // Lower box => picked far more often. Box 4 ("solid") words still get
    // occasional light review rather than disappearing entirely.
    getWordWeight: function (word) {
      var record = getWordRecord(word);
      var weights = [10, 6, 3, 1.5, 0.5];
      return weights[Math.min(record.box, weights.length - 1)];
    },

    getWordStatus: function (word) {
      var record = getWordRecord(word);
      if (record.seen === 0) return "new";
      if (record.box >= 3) return "solid";
      if (record.box >= 1) return "learning";
      return "shaky";
    },

    getWordRecord: function (word) {
      var r = getWordRecord(word);
      return {
        box: r.box,
        seen: r.seen,
        misses: r.misses,
        correctFirstTry: r.correctFirstTry,
        lastSeen: r.lastSeen
      };
    },

    // Correct on the first tap of a round.
    recordCorrect: function (word) {
      var record = getWordRecord(word);
      record.seen += 1;
      record.correctFirstTry += 1;
      record.box = Math.min(MAX_BOX, record.box + 1);
      record.lastSeen = Date.now();
      save();
    },

    // A miss never surfaces as "wrong" to the child — it just softens the
    // word's box so it comes back around sooner, and the caller is
    // expected to requeue it for a near-future round.
    recordMiss: function (word) {
      var record = getWordRecord(word);
      record.seen += 1;
      record.misses += 1;
      record.box = Math.max(0, record.box - 1);
      record.lastSeen = Date.now();
      save();
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
    }
  };

  window.WordDen = WordDen;
})();
