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
    cached = parsed || {
      words: {}, sessions: [], audioMode: true, voiceName: null,
      xp: 0, totalCorrect: 0, bestStreak: 0,
      dailyStreak: { current: 0, best: 0, lastPlayDate: null },
      badges: {}
    };
    if (!cached.words) cached.words = {};
    if (!cached.sessions) cached.sessions = [];
    if (typeof cached.audioMode !== "boolean") cached.audioMode = true;
    if (typeof cached.voiceName !== "string") cached.voiceName = null;
    if (typeof cached.xp !== "number") cached.xp = 0;
    if (typeof cached.totalCorrect !== "number") cached.totalCorrect = 0;
    if (typeof cached.bestStreak !== "number") cached.bestStreak = 0;
    if (!cached.dailyStreak) cached.dailyStreak = { current: 0, best: 0, lastPlayDate: null };
    if (!cached.badges) cached.badges = {};
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

  function dateStr(d) {
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
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
      var state = load();
      state.totalCorrect += 1;
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
    },

    // --- Levels & gamification -------------------------------------

    getXP: function () {
      return load().xp;
    },

    getLevelInfo: function () {
      return WordDen.levels.levelInfoForXp(load().xp);
    },

    // Adds XP and reports whether that pushed the level up, so the caller
    // can trigger a level-up celebration.
    addXP: function (amount) {
      var state = load();
      var before = WordDen.levels.levelInfoForXp(state.xp);
      state.xp += amount;
      var after = WordDen.levels.levelInfoForXp(state.xp);
      save();
      return { gained: amount, xp: state.xp, before: before, after: after, leveledUp: after.level > before.level };
    },

    getTotalCorrect: function () {
      return load().totalCorrect;
    },

    getBestStreak: function () {
      return load().bestStreak;
    },

    // Current in-session correct-in-a-row streak, tracked by the caller;
    // this just remembers the personal best across all sessions.
    recordStreak: function (current) {
      var state = load();
      if (current > state.bestStreak) {
        state.bestStreak = current;
        save();
      }
    },

    // Call once per app-open. Bumps the day streak if today is a new day
    // (consecutive to yesterday keeps it going, any bigger gap resets it).
    touchDailyStreak: function () {
      var state = load();
      var ds = state.dailyStreak;
      var today = dateStr(new Date());
      if (ds.lastPlayDate !== today) {
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        ds.current = ds.lastPlayDate === dateStr(yesterday) ? ds.current + 1 : 1;
        ds.lastPlayDate = today;
        if (ds.current > ds.best) ds.best = ds.current;
        save();
      }
      return { current: ds.current, best: ds.best };
    },

    getDailyStreak: function () {
      var ds = load().dailyStreak;
      return { current: ds.current, best: ds.best };
    },

    getBadges: function () {
      var badges = load().badges;
      var copy = {};
      for (var id in badges) {
        if (badges.hasOwnProperty(id)) copy[id] = badges[id];
      }
      return copy;
    },

    // Checks every badge condition against current state and unlocks any
    // newly-earned ones. Returns the array of badge ids unlocked just now
    // (empty if none), for the caller to show a celebration toast for.
    evaluateBadges: function (sessionStreak) {
      var state = load();
      var newly = [];

      function tryUnlock(id, earned) {
        if (earned && !state.badges[id]) {
          state.badges[id] = Date.now();
          newly.push(id);
        }
      }

      var solidCount = WordDen.ACTIVE_WORDS.filter(function (w) {
        return WordDen.state.getWordStatus(w) === "solid";
      }).length;

      tryUnlock("first-correct", state.totalCorrect >= 1);
      tryUnlock("streak-5", sessionStreak >= 5);
      tryUnlock("streak-10", sessionStreak >= 10);
      tryUnlock("streak-20", sessionStreak >= 20);
      tryUnlock("solid-10", solidCount >= 10);
      tryUnlock("solid-25", solidCount >= 25);
      tryUnlock("solid-all", solidCount >= WordDen.ACTIVE_WORDS.length);
      tryUnlock("daily-3", state.dailyStreak.current >= 3);
      tryUnlock("daily-7", state.dailyStreak.current >= 7);

      if (newly.length) save();
      return newly;
    }
  };

  window.WordDen = WordDen;
})();
