// Spelling Den — levels, XP curve and badge definitions.
// Pure data/formula module (no DOM, no storage); state.js owns persistence.
// Same dino-evolution levels as Word Den, with spelling-specific badges.
var SpellDen = window.SpellDen || {};

(function () {
  "use strict";

  var STAGES = [
    { minLevel: 1, maxLevel: 1, title: "Egg", emoji: "🥚" },
    { minLevel: 2, maxLevel: 3, title: "Hatchling", emoji: "🐣" },
    { minLevel: 4, maxLevel: 5, title: "Baby Dino", emoji: "🦎" },
    { minLevel: 6, maxLevel: 8, title: "Young Dino", emoji: "🦕" },
    { minLevel: 9, maxLevel: 12, title: "Dino Explorer", emoji: "🦖" },
    { minLevel: 13, maxLevel: 17, title: "Dino Ranger", emoji: "🦴" },
    { minLevel: 18, maxLevel: 24, title: "Dino Champion", emoji: "🐉" },
    { minLevel: 25, maxLevel: Infinity, title: "Dino Legend", emoji: "👑" }
  ];

  function xpForLevel(level) {
    // XP required to climb from `level` to `level + 1`.
    return 30 + (level - 1) * 15;
  }

  function stageForLevel(level) {
    for (var i = 0; i < STAGES.length; i++) {
      if (level >= STAGES[i].minLevel && level <= STAGES[i].maxLevel) {
        return STAGES[i];
      }
    }
    return STAGES[STAGES.length - 1];
  }

  function levelInfoForXp(xp) {
    var level = 1;
    var remaining = xp;
    var needed = xpForLevel(level);
    while (remaining >= needed) {
      remaining -= needed;
      level += 1;
      needed = xpForLevel(level);
    }
    var stage = stageForLevel(level);
    return {
      level: level,
      title: stage.title,
      emoji: stage.emoji,
      xpIntoLevel: remaining,
      xpForNextLevel: needed,
      progressPct: Math.round((remaining / needed) * 100)
    };
  }

  SpellDen.BADGES = [
    { id: "first-correct", name: "First Step", icon: "👣", desc: "Spell your very first word" },
    { id: "streak-5", name: "On a Roll", icon: "🔥", desc: "5 words right first time in a row" },
    { id: "streak-10", name: "Spelling Wizard", icon: "⚡", desc: "10 words right first time in a row" },
    { id: "perfect-round", name: "Perfect Round", icon: "💯", desc: "Every word in a round right first time" },
    { id: "solid-10", name: "Word Collector", icon: "📚", desc: "10 words rock solid" },
    { id: "solid-25", name: "Word Master", icon: "🏅", desc: "25 words rock solid" },
    { id: "solid-all", name: "Spelling Champion", icon: "🌟", desc: "Every word rock solid" },
    { id: "daily-3", name: "3-Day Streak", icon: "📅", desc: "Play 3 days in a row" },
    { id: "daily-7", name: "Weekly Wonder", icon: "🗓️", desc: "Play 7 days in a row" }
  ];

  SpellDen.levels = {
    xpForLevel: xpForLevel,
    levelInfoForXp: levelInfoForXp
  };

  window.SpellDen = SpellDen;
})();
