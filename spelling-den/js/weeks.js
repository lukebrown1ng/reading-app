// Spelling Den — weekly spelling lists.
//
// Each entry is one week's spelling homework: ten words, transcribed
// straight from whatever list comes home from school. To load in a new
// week, add a new entry to the end of WEEKS below — the game always
// defaults to the most recently added week, but every earlier week stays
// picked from the in-game week picker so past lists can still be
// revisited for review.
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

  SpellDen.getWeek = function (id) {
    return SpellDen.WEEKS.filter(function (w) {
      return w.id === id;
    })[0] || null;
  };

  SpellDen.getLatestWeek = function () {
    return SpellDen.WEEKS[SpellDen.WEEKS.length - 1];
  };

  window.SpellDen = SpellDen;
})();
