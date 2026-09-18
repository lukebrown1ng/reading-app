// Word Den — word bank data.
// Plain global namespace (no bundler/ES modules) so this also runs opened
// directly via file:// on a tablet.
var WordDen = window.WordDen || {};

(function () {
  "use strict";

  // UK National Curriculum English Appendix 1 spelling lists.
  WordDen.WORD_LISTS = {
    year1: [
      "the", "a", "do", "to", "today", "of", "said", "says", "are", "were",
      "was", "is", "his", "has", "I", "you", "your", "they", "be", "he",
      "me", "she", "we", "no", "go", "so", "by", "my", "here", "there",
      "where", "love", "come", "some", "one", "once", "ask", "friend",
      "school", "put", "push", "pull", "full", "house", "our"
    ],
    year2: [
      "door", "floor", "poor", "because", "find", "kind", "mind", "behind",
      "child", "children", "wild", "climb", "most", "only", "both", "old",
      "cold", "gold", "hold", "told", "every", "everybody", "even", "great",
      "break", "steak", "pretty", "beautiful", "after", "fast", "last",
      "past", "father", "class", "grass", "pass", "plant", "path", "bath",
      "hour", "move", "prove", "improve", "sure", "sugar", "eye", "could",
      "should", "would", "who", "whole", "any", "many", "clothes", "busy",
      "people", "water", "again", "half", "money", "Mr", "Mrs", "parents",
      "Christmas"
    ],
    year3_4: [
      "accidentally", "accident", "actually", "actual", "address", "answer",
      "appear", "arrive", "believe", "bicycle", "breath", "breathe",
      "build", "business", "calendar", "caught", "centre", "century",
      "certain", "circle", "complete", "consider", "continue", "decide",
      "describe", "different", "difficult", "disappear", "early", "earth",
      "eight", "eighth", "enough", "exercise", "experience", "experiment",
      "extreme", "famous", "favourite", "February", "forward", "forwards",
      "fruit", "grammar", "group", "guard", "guide", "heard", "heart",
      "height", "history", "imagine", "increase", "important", "interest",
      "island", "knowledge", "learn", "learned", "length", "library",
      "mention", "minute", "natural", "naughty", "notice", "occasion",
      "occasionally", "often", "opposite", "ordinary", "particular",
      "peculiar", "perhaps", "popular", "position", "possess", "possession",
      "possible", "potato", "potatoes", "pressure", "probably", "promise",
      "purpose", "quarter", "question", "recent", "regular", "reign",
      "remember", "sentence", "separate", "special", "straight", "strange",
      "strength", "suppose", "surprise", "therefore", "though", "although",
      "thought", "through", "various", "weight", "woman", "women"
    ],
    // High-frequency EYFS/KS1 tricky words that are essential for the
    // exact confusable clusters this app targets, but aren't part of the
    // statutory spelling appendix (they/were/where/here are — then, this,
    // that, these, them, their, off, saw etc. are assumed already known
    // and so never appear on those lists).
    highFrequency: [
      "then", "this", "that", "these", "them", "their", "they're", "off",
      "saw", "on", "now", "went", "want", "what", "will", "well", "when",
      "which", "why", "all", "an"
    ]
  };

  // Confusable clusters: rounds only ever draw options from within one
  // cluster, so the game drills exactly the words that get mixed up
  // against each other rather than random vocabulary.
  WordDen.CLUSTERS = [
    { id: "them-family", words: ["then", "they", "these", "there", "them"] },
    { id: "this-family", words: ["this", "that", "these", "then"] },
    { id: "was-saw", words: ["was", "saw"] },
    { id: "of-off", words: ["of", "off", "on", "for"] },
    { id: "were-where", words: ["were", "where", "they're", "here"] },
    { id: "here-there-where", words: ["here", "there", "where"] },
    { id: "do-to-today", words: ["do", "to", "today", "so"] },
    { id: "push-pull-full-put", words: ["push", "pull", "full", "put"] },
    { id: "said-says", words: ["said", "says"] },
    { id: "some-come-one-once", words: ["some", "come", "one", "once"] },
    { id: "no-go-so-on", words: ["no", "go", "so", "on"] },
    { id: "you-your", words: ["you", "your"] },
    { id: "he-she-we-me-be", words: ["he", "she", "we", "me", "be"] },
    { id: "find-kind-mind-behind", words: ["find", "kind", "mind", "behind"] },
    { id: "old-cold-gold-hold-told", words: ["old", "cold", "gold", "hold", "told"] },
    { id: "door-floor-poor", words: ["door", "floor", "poor"] },
    { id: "could-should-would", words: ["could", "should", "would"] },
    { id: "any-many", words: ["any", "many"] },
    { id: "class-grass-pass", words: ["class", "grass", "pass"] },
    { id: "move-prove-improve", words: ["move", "prove", "improve"] },
    { id: "child-wild", words: ["child", "wild"] },
    { id: "every-everybody-even", words: ["every", "everybody", "even"] },
    { id: "break-great-steak", words: ["break", "great", "steak"] },
    { id: "who-whole", words: ["who", "whole"] },
    { id: "eye-i", words: ["eye", "I"] },
    { id: "want-went", words: ["want", "went"] },
    { id: "what-which-when-why", words: ["what", "which", "when", "why"] },
    { id: "all-an", words: ["all", "an"] },
    { id: "though-through-thought", words: ["though", "through", "thought"] },
    { id: "heard-heart", words: ["heard", "heart"] },
    { id: "guard-guide", words: ["guard", "guide"] }
  ];

  // Every word that appears in at least one cluster — the set the game
  // actually quizzes. (Words present only in the raw year lists but not
  // in any cluster are kept for parent-view curriculum coverage only.)
  WordDen.ACTIVE_WORDS = (function () {
    var seen = {};
    var result = [];
    WordDen.CLUSTERS.forEach(function (cluster) {
      cluster.words.forEach(function (word) {
        var key = word.toLowerCase();
        if (!seen[key]) {
          seen[key] = true;
          result.push(word);
        }
      });
    });
    return result;
  })();

  // Map of word -> array of cluster ids it belongs to, for quick lookup.
  WordDen.CLUSTERS_BY_WORD = (function () {
    var map = {};
    WordDen.CLUSTERS.forEach(function (cluster) {
      cluster.words.forEach(function (word) {
        var key = word.toLowerCase();
        if (!map[key]) map[key] = [];
        map[key].push(cluster.id);
      });
    });
    return map;
  })();

  window.WordDen = WordDen;
})();
