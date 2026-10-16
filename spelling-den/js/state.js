// Spelling Den — persistent state. Everything lives in localStorage, its
// own key, independent of Word Den / Read a Book.
var SpellDen = window.SpellDen || {};

(function () {
  "use strict";

  var STORAGE_KEY = "spellDenState.v1";
  var cached = null;

  function defaultWordRecord() {
    return { seen: 0, correctFirstTry: 0, misses: 0, cleanStreak: 0, lastSeen: 0 };
  }

  function load() {
    if (cached) return cached;
    var parsed = Den.storage.read(STORAGE_KEY);
    cached = parsed || {
      words: {}, sessions: [], activeWeekId: null, voiceName: null,
      inputMode: "tiles", rounds: []
    };
    if (!cached.words) cached.words = {};
    if (!cached.sessions) cached.sessions = [];
    if (typeof cached.activeWeekId !== "string") cached.activeWeekId = null;
    if (typeof cached.voiceName !== "string") cached.voiceName = null;
    if (!Array.isArray(cached.rounds)) cached.rounds = [];
    if (cached.inputMode !== "type") cached.inputMode = "tiles";
    if (cached.activeYear !== 5) cached.activeYear = 3;
    return cached;
  }

  function save() {
    Den.storage.write(STORAGE_KEY, cached);
  }

  // Year 5 weeks have ids like "y5week1"; everything older is Year 3.
  function roundYear(round) {
    return /^y5/.test(round.weekId) ? 5 : 3;
  }

  function wordKey(word) {
    return word.toLowerCase();
  }

  function getWordRecordRaw(word) {
    var state = load();
    var key = wordKey(word);
    if (!state.words[key]) state.words[key] = defaultWordRecord();
    var r = state.words[key];
    // Records saved before cleanStreak existed: estimate it.
    if (typeof r.cleanStreak !== "number") {
      r.cleanStreak = r.misses === 0 ? r.correctFirstTry : (r.correctFirstTry > 0 ? 1 : 0);
    }
    return r;
  }

  SpellDen.state = {
    getActiveWeekId: function () {
      return load().activeWeekId;
    },
    setActiveWeekId: function (id) {
      load().activeWeekId = id || null;
      save();
    },

    getActiveYear: function () {
      return load().activeYear;
    },
    setActiveYear: function (year) {
      load().activeYear = year === 5 ? 5 : 3;
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
    // took one or more wrong attempts first. A word counts as "seen" once
    // per round: here only when it was right first time (otherwise the
    // first wrong attempt already counted it).
    recordCorrect: function (word, firstTry) {
      var record = getWordRecordRaw(word);
      if (firstTry) {
        record.seen += 1;
        record.correctFirstTry += 1;
        record.cleanStreak += 1;
      }
      record.lastSeen = Date.now();
      save();
    },

    // A wrong attempt — the child sees the correct spelling right away,
    // this just logs it for the parent view. `firstMiss` is true for the
    // first wrong attempt at this word in the round.
    recordMiss: function (word, firstMiss) {
      var record = getWordRecordRaw(word);
      if (firstMiss) record.seen += 1;
      record.misses += 1;
      record.cleanStreak = 0;
      record.lastSeen = Date.now();
      save();
    },

    // "new" (never played), "shaky" (missed last time), "learning" (right
    // first time since a miss) or "solid" (never missed, or right first
    // time twice running — so a word that once tripped him up can recover).
    getWordStatus: function (word) {
      var r = getWordRecordRaw(word);
      if (r.seen === 0) return "new";
      if (r.misses === 0 || r.cleanStreak >= 2) return "solid";
      if (r.cleanStreak === 1) return "learning";
      return "shaky";
    },

    // Up to `limit` words from `weeks` that still need work (shaky first,
    // then learning, then most-missed), for the "tricky words" round.
    getTrickyWords: function (weeks, limit) {
      var seen = {};
      var list = [];
      weeks.forEach(function (week) {
        week.words.forEach(function (word) {
          if (seen[word]) return;
          seen[word] = true;
          var status = SpellDen.state.getWordStatus(word);
          if (status === "shaky" || status === "learning") {
            list.push({ word: word, rank: status === "shaky" ? 0 : 1, misses: getWordRecordRaw(word).misses });
          }
        });
      });
      list.sort(function (a, b) { return a.rank - b.rank || b.misses - a.misses; });
      return list.slice(0, limit).map(function (e) { return e.word; });
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
      var session = { start: Date.now(), end: Date.now() };
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

    // Optionally only the rounds for one year (3 or 5).
    getRounds: function (year) {
      return load().rounds.filter(function (r) {
        return !year || roundYear(r) === year;
      });
    },

    // --- Streak stats -------------------------------------------------
    // Worked out from the round history, so it needs no data of its own: a
    // day counts if at least one round was finished on it. The streak is
    // the run of consecutive days up to today — or up to yesterday if
    // today's round hasn't been done yet, so it isn't lost until a whole
    // day is missed.
    // Pass a year (3 or 5) to count only that year's rounds.
    getStreakStats: function (year) {
      var rounds = SpellDen.state.getRounds(year);
      var today = Den.dateStr(new Date());
      var days = {};
      var best = null;
      var todayBest = null;

      rounds.forEach(function (r) {
        var key = Den.dateStr(new Date(r.at));
        days[key] = true;
        if (!best || r.firstTry > best.firstTry) best = r;
        if (key === today && (!todayBest || r.firstTry > todayBest.firstTry)) todayBest = r;
      });

      var day = new Date();
      if (!days[Den.dateStr(day)]) day.setDate(day.getDate() - 1);
      var streak = 0;
      while (days[Den.dateStr(day)]) {
        streak += 1;
        day.setDate(day.getDate() - 1);
      }

      // Longest run of consecutive days ever.
      var keys = Object.keys(days).map(function (k) {
        var p = k.split("-");
        return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
      }).sort(function (a, b) { return a - b; });
      var bestStreak = 0;
      var run = 0;
      for (var i = 0; i < keys.length; i++) {
        var consecutive = i > 0 && Math.round((keys[i] - keys[i - 1]) / 86400000) === 1;
        run = consecutive ? run + 1 : 1;
        if (run > bestStreak) bestStreak = run;
      }

      return {
        doneToday: !!days[today],
        streak: streak,
        bestStreak: bestStreak,
        todayBest: todayBest ? todayBest.firstTry : null,
        todayTotal: todayBest ? todayBest.total : null,
        bestScore: best ? best.firstTry : null,
        bestTotal: best ? best.total : null
      };
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
