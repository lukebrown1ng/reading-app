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

  // Official weekly spelling homework lists, transcribed as they come
  // home from school.
  SpellDen.WEEKS = [
    {
      id: "week1",
      label: "Week 1",
      words: [
        "eight", "eighth", "eighty", "weight", "neighbour",
        "vein", "veil", "beige", "sleigh", "freight"
      ]
    },
    {
      id: "week2",
      label: "Week 2",
      words: [
        "hey", "they", "obey", "grey", "prey",
        "whey", "survey", "convey", "disobey", "purvey"
      ]
    },
    {
      id: "week3",
      label: "Week 3",
      words: [
        "straight", "campaign", "contain", "brain", "faint",
        "waist", "claim", "praise", "complaint", "afraid"
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
