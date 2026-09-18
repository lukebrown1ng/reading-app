// Word Den — levels, XP curve, and badge definitions.
// Pure data/formula module: no DOM, no storage. state.js owns persistence
// and calls into this for the maths.
var WordDen = window.WordDen || {};

(function () {
  "use strict";

  // Dino-evolution stages a level number falls into. Fast early levels
  // (cheap XP) so an 8-year-old sees progress within their first sitting,
  // tapering off so later levels still feel like an achievement.
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

  // Badges: independent one-off achievements, on top of the level track.
  WordDen.BADGES = [
    { id: "first-correct", name: "First Step", icon: "👣", desc: "Get your very first word right" },
    { id: "streak-5", name: "On a Roll", icon: "🔥", desc: "5 correct in a row" },
    { id: "streak-10", name: "Word Wizard", icon: "⚡", desc: "10 correct in a row" },
    { id: "streak-20", name: "Unstoppable", icon: "🚀", desc: "20 correct in a row" },
    { id: "solid-10", name: "Word Collector", icon: "📚", desc: "10 words rock solid" },
    { id: "solid-25", name: "Word Master", icon: "🏅", desc: "25 words rock solid" },
    { id: "solid-all", name: "Cluster Champion", icon: "🌟", desc: "Every word rock solid" },
    { id: "daily-3", name: "3-Day Streak", icon: "📅", desc: "Play 3 days in a row" },
    { id: "daily-7", name: "Weekly Wonder", icon: "🗓️", desc: "Play 7 days in a row" }
  ];

  WordDen.levels = {
    xpForLevel: xpForLevel,
    levelInfoForXp: levelInfoForXp
  };

  window.WordDen = WordDen;
})();
