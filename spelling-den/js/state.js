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
      inputMode: "tiles", rounds: [],
      xp: 0, totalCorrect: 0, bestStreak: 0,
      dailyStreak: { current: 0, best: 0, lastPlayDate: null },
      badges: {}
    };
    if (!cached.words) cached.words = {};
    if (!cached.sessions) cached.sessions = [];
    if (typeof cached.activeWeekId !== "string") cached.activeWeekId = null;
    if (typeof cached.voiceName !== "string") cached.voiceName = null;
    if (!Array.isArray(cached.rounds)) cached.rounds = [];
    if (typeof cached.xp !== "number") cached.xp = 0;
    if (typeof cached.totalCorrect !== "number") cached.totalCorrect = 0;
    if (typeof cached.bestStreak !== "number") cached.bestStreak = 0;
    if (!cached.dailyStreak) cached.dailyStreak = { current: 0, best: 0, lastPlayDate: null };
    if (!cached.badges) cached.badges = {};
    if (cached.inputMode !== "type") cached.inputMode = "tiles";
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

  function dateStr(d) {
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
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
      load().totalCorrect += 1;
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

    // History of completed rounds, oldest first — never trimmed, so the
    // parent can look back at every attempt. `round` is
    // { weekId, weekLabel, mode, results: [{ word, status }] } where status
    // is "first" | "retry" | "skipped"; the score is the number of "first".
    addRound: function (round) {
      var state = load();
      var results = round.results.map(function (r) {
        return { word: r.word, status: r.status };
      });
      state.rounds.push({
        at: Date.now(),
        weekId: round.weekId,
        weekLabel: round.weekLabel,
        mode: round.mode,
        total: results.length,
        firstTry: results.filter(function (r) { return r.status === "first"; }).length,
        results: results
      });
      save();
    },

    getRounds: function () {
      return load().rounds.slice();
    },

    // --- Levels & gamification -------------------------------------
    // Same shape as Word Den's: XP and levels, best in-a-row streak, a
    // daily play streak, and badges.

    getLevelInfo: function () {
      return SpellDen.levels.levelInfoForXp(load().xp);
    },

    // Adds XP and reports whether that pushed the level up, so the caller
    // can show a level-up celebration.
    addXP: function (amount) {
      var state = load();
      var before = SpellDen.levels.levelInfoForXp(state.xp);
      state.xp += amount;
      var after = SpellDen.levels.levelInfoForXp(state.xp);
      save();
      return { gained: amount, xp: state.xp, before: before, after: after, leveledUp: after.level > before.level };
    },

    getBestStreak: function () {
      return load().bestStreak;
    },

    // The current right-first-time-in-a-row streak is tracked by the
    // caller; this remembers the personal best across all rounds.
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
      var copy = {};
      var badges = load().badges;
      for (var id in badges) {
        if (badges.hasOwnProperty(id)) copy[id] = badges[id];
      }
      return copy;
    },

    // A word is "solid" once it's been seen and never missed.
    isWordSolid: function (word) {
      var r = getWordRecordRaw(word);
      return r.seen > 0 && r.misses === 0;
    },

    // Checks every badge condition and unlocks any newly earned ones,
    // returning their ids (empty if none) for the caller to celebrate.
    // `allWords` is every word across all weeks; `perfectRound` is true
    // when a round has just finished with every word right first time.
    evaluateBadges: function (sessionStreak, allWords, perfectRound) {
      var state = load();
      var newly = [];

      function tryUnlock(id, earned) {
        if (earned && !state.badges[id]) {
          state.badges[id] = Date.now();
          newly.push(id);
        }
      }

      var solidCount = allWords.filter(function (w) {
        return SpellDen.state.isWordSolid(w);
      }).length;

      tryUnlock("first-correct", state.totalCorrect >= 1);
      tryUnlock("streak-5", sessionStreak >= 5);
      tryUnlock("streak-10", sessionStreak >= 10);
      tryUnlock("perfect-round", !!perfectRound);
      tryUnlock("solid-10", solidCount >= 10);
      tryUnlock("solid-25", solidCount >= 25);
      tryUnlock("solid-all", allWords.length > 0 && solidCount >= allWords.length);
      tryUnlock("daily-3", state.dailyStreak.current >= 3);
      tryUnlock("daily-7", state.dailyStreak.current >= 7);

      if (newly.length) save();
      return newly;
    },

    // How the child enters letters: "tiles" (tap jumbled letters) or
    // "type" (on-screen keyboard, nothing shown to copy from).
    getInputMode: function () {
      return load().inputMode;
    },
    setInputMode: function (mode) {
      load().inputMode = mode === "type" ? "type" : "tiles";
      save();
    }
  };

  window.SpellDen = SpellDen;
})();
