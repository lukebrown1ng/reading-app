// Spelling Den — weekly spelling lists.
//
// Each entry is one week's spelling homework: ten words, transcribed
// straight from whatever list comes home from school, plus that week's
// key focus (shown as a call-out at the top of the game). To load in a new
// week, add a new entry to the end of WEEKS below — the game always
// defaults to the most recently added week, but every earlier week stays
// picked from the in-game week picker so past lists can still be
// revisited for review.
//
// Every word needs pre-generated audio, so new weeks are added here (plus
// sentences.js) and rendered with scripts/generate-audio.js — see the
// README. They can't be added from inside the app.
var SpellDen = window.SpellDen || {};

(function () {
  "use strict";

  // Official weekly spelling homework lists, transcribed as they come
  // home from school.
  SpellDen.WEEKS = [
    {
      id: "week1",
      label: "Week 1",
      focus: "Words with the long ai sound spelt with ei",
      words: [
        "eight", "eighth", "eighty", "weight", "neighbour",
        "vein", "veil", "beige", "sleigh", "freight"
      ]
    },
    {
      id: "week2",
      label: "Week 2",
      focus: "Words with the long vowel sound /a/ spelt with ey",
      words: [
        "hey", "they", "obey", "grey", "prey",
        "whey", "survey", "convey", "disobey", "purvey"
      ]
    },
    {
      id: "week3",
      label: "Week 3",
      focus: "Words with the long vowel sound /a/ spelt with ai",
      words: [
        "straight", "campaign", "contain", "brain", "faint",
        "waist", "claim", "praise", "complaint", "afraid"
      ]
    },
    {
      id: "week4",
      label: "Week 4",
      focus: "Words with the sound /ur/ spelt with ear",
      words: [
        "earth", "early", "learn", "heard", "earn",
        "pearl", "search", "unearth", "earl", "rehearse"
      ]
    },
    {
      id: "week5",
      label: "Week 5",
      focus: "Homophones and near homophones",
      words: [
        "here", "hear", "heel", "heal", "main",
        "mane", "mail", "male", "knot", "not"
      ]
    },
    {
      id: "week6",
      label: "Week 6",
      focus: "Homophones and near homophones",
      words: [
        "berry", "bury", "brake", "break", "meet",
        "meat", "ball", "bawl", "fair", "fare"
      ]
    }
  ];

  // Year 5 lists. Keyboard-only in the game (no tiles), and kept apart from
  // the Year 3 lists by the `year` field.
  SpellDen.WEEKS_Y5 = [
    {
      id: "y5week1",
      label: "Year 5 · Week 1",
      focus: "Words ending in -ious",
      words: [
        "vicious", "gracious", "spacious", "malicious", "precious",
        "conscious", "delicious", "suspicious", "atrocious", "ferocious"
      ]
    },
    {
      id: "y5week2",
      label: "Year 5 · Week 2",
      focus: "Words with the endings that sound like /shuhs/",
      words: [
        "ambitious", "cautious", "fictitious", "infectious", "nutritious",
        "contentious", "superstitious", "pretentious", "anxious", "obnoxious"
      ]
    },
    {
      id: "y5week3",
      label: "Year 5 · Week 3",
      focus: "Words with the short vowel sound /i/ spelt with y",
      words: [
        "symbol", "mystery", "lyrics", "oxygen", "symptom",
        "physical", "system", "typical", "crystal", "rhythm"
      ]
    },
    {
      id: "y5week4",
      label: "Year 5 · Week 4",
      focus: "Words with the long vowel sound /i/ spelt with y",
      words: [
        "apply", "supply", "identify", "occupy", "multiply",
        "rhyme", "cycle", "python", "hygiene", "hyphen"
      ]
    },
    {
      id: "y5week5",
      label: "Year 5 · Week 5",
      focus: "Homophones and near homophones",
      words: [
        "past", "passed", "proceed", "precede", "aisle",
        "isle", "aloud", "allowed", "affect", "effect"
      ]
    },
    {
      id: "y5week6",
      label: "Year 5 · Week 6",
      focus: "Homophones and near homophones",
      words: [
        "farther", "father", "guessed", "guest", "heard",
        "herd", "led", "lead", "mourning", "morning"
      ]
    }
  ];

  SpellDen.WEEKS.forEach(function (w) { w.year = 3; });
  SpellDen.WEEKS_Y5.forEach(function (w) { w.year = 5; });

  // Every week across both years (used for lookups and audio generation).
  SpellDen.getAllWeeks = function () {
    return SpellDen.WEEKS.concat(SpellDen.WEEKS_Y5);
  };

  SpellDen.getWeeksForYear = function (year) {
    return year === 5 ? SpellDen.WEEKS_Y5 : SpellDen.WEEKS;
  };

  SpellDen.getWeek = function (id) {
    return SpellDen.getAllWeeks().filter(function (w) {
      return w.id === id;
    })[0] || null;
  };

  SpellDen.getLatestWeek = function (year) {
    var all = SpellDen.getWeeksForYear(year || 3);
    return all[all.length - 1];
  };

  window.SpellDen = SpellDen;
})();
