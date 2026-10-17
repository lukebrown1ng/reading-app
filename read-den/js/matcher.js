// Read Den — works out how far through a page the child has read, from the
// words the speech recogniser has heard. Kept free of any DOM so it can be
// unit-tested (see tests/).
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  // How many upcoming words a spoken word may match, so a mumbled or skipped
  // word doesn't leave the highlight stuck, without leaping across the page.
  var LOOKAHEAD = 4;

  // Words a recogniser can't tell apart by sound; it picks from context, which
  // a child's reading doesn't give it, so any of the group counts as a match.
  var HOMOPHONES = [
    ["to", "too", "two"], ["there", "their", "theyre"], ["here", "hear"],
    ["no", "know"], ["see", "sea"], ["one", "won"], ["by", "buy", "bye"],
    ["for", "four", "fore"], ["right", "write"], ["so", "sew", "sow"],
    ["sun", "son"], ["tail", "tale"], ["be", "bee"], ["blue", "blew"],
    ["would", "wood"], ["our", "hour"], ["new", "knew"], ["night", "knight"],
    ["in", "inn"], ["i", "eye"], ["ate", "eight"], ["meet", "meat"],
    ["mum", "mom"], ["its", "it's"], ["your", "you're"], ["dear", "deer"],
    ["bear", "bare"], ["hare", "hair"], ["road", "rode"], ["rain", "reign"],
    ["wait", "weight"], ["sail", "sale"], ["flower", "flour"], ["grey", "gray"]
  ];
  var GROUP = {};
  HOMOPHONES.forEach(function (group, i) {
    group.forEach(function (w) { GROUP[w] = i; });
  });

  var DIGITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

  function distance(a, b) {
    var prev = [];
    var i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  // Does a heard word count as the printed one? Short words must match
  // exactly (then/they/these are exactly what needs telling apart); longer
  // ones forgive a letter or two and a changed ending, since recognisers
  // wobble on those.
  function wordsMatch(target, heard) {
    if (!target || !heard) return false;
    if (target === heard) return true;
    if (GROUP[target] !== undefined && GROUP[target] === GROUP[heard]) return true;
    var a = target.length;
    var b = heard.length;
    if (Math.min(a, b) >= 5 && distance(target, heard) <= (Math.max(a, b) >= 9 ? 2 : 1)) return true;
    if (Math.min(a, b) >= 4) {
      var shorter = a < b ? target : heard;
      var longer = a < b ? heard : target;
      if (longer.indexOf(shorter) === 0 && /^(s|es|d|ed|ing|ly|er)$/.test(longer.slice(shorter.length))) return true;
    }
    return false;
  }

  // "Hello there 2" -> ["hello", "there", "two"]
  function normalizeHeard(text) {
    var out = [];
    String(text).split(/\s+/).forEach(function (w) {
      if (/^\d+$/.test(w) && DIGITS[+w]) w = DIGITS[+w];
      var norm = ReadDen.normalizeWord(w);
      if (norm) out.push(norm);
    });
    return out;
  }

  // tokens: the page's words ({ norm }). cursor: index of the word the child
  // should say next. spoken: every word heard so far in this recognition run
  // (it only grows). consumed: how many of `spoken` have already been used.
  //
  // Each newly heard word moves the cursor to just past its first match in
  // the next LOOKAHEAD words; words that match nothing are ignored. Using
  // the first match, and each heard word once, means a repeated word ("the
  // cat sat on the mat") can't pull the highlight past words not yet read.
  // Two heard words that join into one printed word ("t" "rex" for "T-Rex")
  // count together. `hits` are the token indexes that were actually heard.
  ReadDen.advanceBySpeech = function (tokens, cursor, spoken, consumed) {
    // A fresh recognition run starts again from nothing.
    if (spoken.length < consumed) consumed = 0;
    var hits = [];
    while (consumed < spoken.length && cursor < tokens.length) {
      var end = Math.min(tokens.length, cursor + LOOKAHEAD);
      var matched = -1;
      var used = 1;
      var i;
      for (i = cursor; i < end; i++) {
        if (wordsMatch(tokens[i].norm, spoken[consumed])) { matched = i; break; }
      }
      if (matched < 0 && consumed + 1 < spoken.length) {
        var joined = spoken[consumed] + spoken[consumed + 1];
        for (i = cursor; i < end; i++) {
          if (wordsMatch(tokens[i].norm, joined)) { matched = i; used = 2; break; }
        }
      }
      if (matched >= 0) {
        cursor = matched + 1;
        hits.push(matched);
      }
      consumed += used;
    }
    return { cursor: cursor, consumed: consumed, hits: hits };
  };

  // Where to start reading a recognition run's results from, so words heard
  // before now (the previous page) aren't read as part of this one. If the
  // newest result is still being spoken, only words after it count.
  ReadDen.baselineOf = function (results) {
    if (!results || results.length === 0) return { result: 0, words: 0 };
    var last = results[results.length - 1];
    if (last.isFinal) return { result: results.length, words: 0 };
    return { result: results.length - 1, words: last.words.length };
  };

  // Follows one page of reading. `results` is the recogniser's running
  // list for the current run: [{ words: [...], isFinal }]. Interim results
  // get revised as the recogniser changes its mind, so only final ones are
  // committed; interim words are re-tried from the committed position every
  // time and can only ever move the highlight forward.
  //
  // statuses: 0 not yet read, 1 heard, 2 passed over without being heard,
  // 3 read to the child on request.
  ReadDen.createFollower = function (tokens, baseline) {
    var statuses = tokens.map(function () { return 0; });
    var start = baseline || { result: 0, words: 0 };
    var commit = 0;
    var display = 0;
    var finalConsumed = 0;

    function moveTo(target) {
      if (target <= display) return false;
      for (var i = display; i < target; i++) if (statuses[i] === 0) statuses[i] = 2;
      display = target;
      return true;
    }
    function mark(hits) {
      hits.forEach(function (i) { if (statuses[i] !== 3) statuses[i] = 1; });
    }

    return {
      // Returns true if the highlight moved.
      update: function (results) {
        var finals = [];
        var interim = [];
        for (var r = start.result; r < results.length; r++) {
          var words = results[r].words;
          if (r === start.result) words = words.slice(start.words);
          Array.prototype.push.apply(results[r].isFinal ? finals : interim, words);
        }
        var f = ReadDen.advanceBySpeech(tokens, commit, finals, finalConsumed);
        commit = f.cursor;
        finalConsumed = f.consumed;
        mark(f.hits);
        var p = ReadDen.advanceBySpeech(tokens, commit, interim, 0);
        mark(p.hits);
        return moveTo(Math.max(commit, p.cursor));
      },
      // A new recognition run (the old one ended): its results start empty.
      newRun: function () {
        start = { result: 0, words: 0 };
        finalConsumed = 0;
      },
      // The current word was read to the child; carry on after it.
      help: function () {
        if (display >= tokens.length) return false;
        statuses[display] = 3;
        display += 1;
        commit = Math.max(commit, display);
        return true;
      },
      cursor: function () { return display; },
      statuses: function () { return statuses; },
      done: function () { return display >= tokens.length; }
    };
  };

  ReadDen.wordsMatch = wordsMatch;
  ReadDen.normalizeHeard = normalizeHeard;
  ReadDen.LOOKAHEAD = LOOKAHEAD;
  window.ReadDen = ReadDen;
})();
