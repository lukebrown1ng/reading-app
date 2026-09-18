// Spelling Den — weekly spelling lists.
//
// Each entry is one week's spelling homework: ten words, transcribed
// straight from whatever list comes home from school. To load in a new
// week, add a new entry to the end of WEEKS below — the game always
// defaults to the most recently added week, but every earlier week stays
// picked from the in-game week picker so past lists can still be
// revisited for review.
//
// Weeks can also be added at runtime from the parent page (stored via
// SpellDen.state.addCustomWeek), without touching this file at all —
// SpellDen.getAllWeeks() below merges both sources, built-in weeks
// first, so parent-added weeks are always the most recent.
var SpellDen = window.SpellDen || {};

(function () {
  "use strict";

  // Seed content: real UK KS2 statutory spelling words (English Appendix
  // 1), grouped ten at a time. Placeholder until real weekly homework
  // lists are transcribed in — replace/extend freely.
  SpellDen.WEEKS = [
    {
      id: "week1",
      label: "Week 1",
      words: [
        "different", "important", "special", "actually", "believe",
        "because", "question", "favourite", "library", "surprise"
      ]
    },
    {
      id: "week2",
      label: "Week 2",
      words: [
        "although", "therefore", "separate", "increase", "possible",
        "probably", "remember", "sentence", "strength", "particular"
      ]
    },
    {
      id: "week3",
      label: "Week 3",
      words: [
        "difficult", "history", "knowledge", "natural", "notice",
        "opposite", "ordinary", "popular", "position", "promise"
      ]
    }
  ];

  // Built-in weeks plus any parent-added ones, built-in first so
  // newly-added weeks are always the most recent (see getLatestWeek).
  SpellDen.getAllWeeks = function () {
    var custom = (SpellDen.state && SpellDen.state.getCustomWeeks)
      ? SpellDen.state.getCustomWeeks()
      : [];
    return SpellDen.WEEKS.concat(custom);
  };

  SpellDen.getWeek = function (id) {
    return SpellDen.getAllWeeks().filter(function (w) {
      return w.id === id;
    })[0] || null;
  };

  SpellDen.getLatestWeek = function () {
    var all = SpellDen.getAllWeeks();
    return all[all.length - 1];
  };

  window.SpellDen = SpellDen;
})();
