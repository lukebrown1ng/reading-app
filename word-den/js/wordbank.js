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
  // Every cluster is kept at 4+ words (buildOptions in game.js caps a round
  // at 4 options anyway) so a round is never just a 2- or 3-way guess. Where
  // a genuine confusable family only has 2-3 real members, it's padded with
  // extra words the child already knows (often duplicated from another
  // cluster — words can belong to several clusters, see CLUSTERS_BY_WORD)
  // chosen for a shared first letter, shared sound, or shared shape, so the
  // padding still trains real discrimination rather than being arbitrary.
  WordDen.CLUSTERS = [
    { id: "them-family", words: ["then", "they", "these", "there", "them"] },
    { id: "this-family", words: ["this", "that", "these", "then"] },
    { id: "was-saw", words: ["was", "saw", "want", "what"] },
    { id: "of-off", words: ["of", "off", "on", "for"] },
    { id: "were-where", words: ["were", "where", "they're", "here"] },
    { id: "here-there-where", words: ["here", "there", "where", "were"] },
    { id: "do-to-today", words: ["do", "to", "today", "so"] },
    { id: "push-pull-full-put", words: ["push", "pull", "full", "put"] },
    { id: "said-says", words: ["said", "says", "say", "saw"] },
    { id: "some-come-one-once", words: ["some", "come", "one", "once"] },
    { id: "no-go-so-on", words: ["no", "go", "so", "on"] },
    { id: "you-your", words: ["you", "your", "our", "out"] },
    { id: "he-she-we-me-be", words: ["he", "she", "we", "me", "be"] },
    { id: "find-kind-mind-behind", words: ["find", "kind", "mind", "behind"] },
    { id: "old-cold-gold-hold-told", words: ["old", "cold", "gold", "hold", "told"] },
    { id: "door-floor-poor", words: ["door", "floor", "poor", "for"] },
    { id: "could-should-would", words: ["could", "should", "would", "old"] },
    { id: "any-many", words: ["any", "many", "man", "may"] },
    { id: "class-grass-pass", words: ["class", "grass", "pass", "last"] },
    { id: "move-prove-improve", words: ["move", "prove", "improve", "sure"] },
    { id: "child-wild", words: ["child", "wild", "climb", "find"] },
    { id: "every-everybody-even", words: ["every", "everybody", "even", "very"] },
    { id: "break-great-steak", words: ["break", "great", "steak", "eight"] },
    { id: "who-whole", words: ["who", "whole", "how", "now"] },
    { id: "eye-i", words: ["eye", "I", "my", "why"] },
    { id: "want-went", words: ["want", "went", "what", "when"] },
    { id: "what-which-when-why", words: ["what", "which", "when", "why"] },
    { id: "all-an", words: ["all", "an", "and", "as"] },
    { id: "though-through-thought", words: ["though", "through", "thought", "although"] },
    { id: "heard-heart", words: ["heard", "heart", "hard", "head"] },
    { id: "guard-guide", words: ["guard", "guide", "grow", "green"] },

    // Year 3 word bank (word-den/js/wordbanks.js, "year3-tricky") drilled
    // into confusable clusters: real look-alike/sound-alike pairs and
    // rime families, same spirit as the clusters above. Not every word
    // in that bank has a genuine confusable partner, so some are left
    // out here on purpose rather than forced into a weak pairing.
    { id: "a-at-as-am", words: ["a", "at", "as", "am"] },
    { id: "short-i-words", words: ["it", "in", "if", "is"] },
    { id: "in-into", words: ["in", "into", "it", "is"] },
    { id: "had-have-has-his", words: ["had", "have", "has", "his"] },
    { id: "him-his-her-hes", words: ["him", "his", "her", "he's"] },
    { id: "but-put", words: ["but", "put", "big", "back"] },
    { id: "us-use", words: ["us", "use", "up", "our"] },
    { id: "or-our", words: ["or", "our", "out", "for"] },
    { id: "out-our-about", words: ["out", "our", "about", "or"] },
    { id: "and-end", words: ["and", "end", "any", "an"] },
    { id: "end-friend", words: ["end", "friend", "and", "friends"] },
    { id: "not-now", words: ["not", "now", "on", "no"] },
    { id: "how-now-who", words: ["how", "now", "who", "why"] },
    { id: "the-their-them-they", words: ["the", "their", "them", "they"] },
    { id: "than-then", words: ["than", "then", "that", "this"] },
    { id: "to-too-two", words: ["to", "too", "two", "do"] },
    { id: "by-my-why", words: ["by", "my", "why", "I"] },
    { id: "will-well", words: ["will", "well", "with", "want"] },
    { id: "with-will", words: ["with", "will", "well", "went"] },
    { id: "very-every", words: ["very", "every", "everybody", "even"] },
    { id: "man-many", words: ["man", "many", "any", "may"] },
    { id: "long-along", words: ["long", "along", "look", "last"] },
    { id: "ever-never", words: ["ever", "never", "every", "even"] },
    { id: "other-mother-another", words: ["other", "mother", "another", "over"] },
    { id: "much-must", words: ["much", "must", "just", "many"] },
    { id: "just-must", words: ["just", "must", "much", "many"] },
    { id: "know-no", words: ["know", "no", "snow", "grow"] },
    { id: "ran-run", words: ["ran", "run", "fun", "sun"] },
    { id: "came-come", words: ["came", "come", "some", "home"] },
    { id: "get-got", words: ["get", "got", "gave", "good"] },
    { id: "made-make", words: ["made", "make", "take", "gave"] },
    { id: "child-children", words: ["child", "children", "wild", "find"] },
    { id: "im-ill-ive", words: ["I'm", "I'll", "I've", "it's"] },
    { id: "its-it's", words: ["it's", "its", "I'm", "I've"] },
    { id: "apostrophe-contractions", words: ["that's", "there's", "we're", "he's"] },
    { id: "cant-couldnt-didnt-dont", words: ["can't", "couldn't", "didn't", "don't"] },
    { id: "let-lets", words: ["let", "let's", "get", "got"] },
    { id: "ay-rime", words: ["day", "away", "play", "say", "way", "may"] },
    { id: "ook-rime", words: ["look", "book", "took", "looking"] },
    { id: "ound-rime", words: ["found", "round", "around", "house"] },
    { id: "un-rime", words: ["fun", "sun", "run", "up"] },
    { id: "ake-rime", words: ["take", "make", "gave", "made"] },
    { id: "ight-sound", words: ["night", "right", "white", "height"] },
    { id: "ave-sound", words: ["gave", "have", "make", "take"] },
    { id: "oon-oom-sound", words: ["soon", "room", "food", "good"] },
    { id: "ish-rime", words: ["fish", "wish", "with", "which"] },
    { id: "ast-rime", words: ["fast", "last", "past", "class"] },
    { id: "ing-rime", words: ["king", "thing", "morning", "coming"] },
    { id: "ow-rime", words: ["grow", "snow", "know", "down"] },
    { id: "een-rime", words: ["green", "queen", "been", "see"] },
    { id: "ood-rime", words: ["food", "good", "look", "book"] },
    { id: "ox-rime", words: ["fox", "box", "dog", "duck"] },
    { id: "eep-rime", words: ["keep", "sleep", "see", "green"] },
    { id: "ee-ea-sound", words: ["tea", "sea", "see", "feet"] },
    { id: "op-rime", words: ["top", "stop", "dog", "got"] },
    { id: "ea-sound-trap", words: ["head", "bear", "great", "heard"] },
    { id: "ell-rime", words: ["tell", "well", "fell", "will"] },
    { id: "ark-rime", words: ["park", "dark", "hard", "heart"] },
    { id: "at-rime", words: ["sat", "hat", "cat", "that"] },
    { id: "ed-rime", words: ["red", "bed", "head", "end"] },
    { id: "three-tree-trees", words: ["three", "tree", "trees", "green"] },
    { id: "town-down", words: ["town", "down", "house", "mouse"] },
    { id: "house-horse-mouse", words: ["house", "horse", "mouse", "our"] },
    { id: "gran-grandad", words: ["gran", "grandad", "great", "green"] },
    { id: "wind-window", words: ["wind", "window", "with", "went"] },
    { id: "think-thing", words: ["think", "thing", "this", "that"] },
    { id: "hard-heard", words: ["hard", "heard", "heart", "head"] },
    { id: "hat-hot", words: ["hat", "hot", "had", "has"] },
    { id: "cat-car-can", words: ["cat", "car", "can", "came"] },
    { id: "dog-duck-dragon", words: ["dog", "duck", "dragon", "down"] },
    { id: "or-ore-sound", words: ["more", "for", "door", "floor"] },
    { id: "up-us", words: ["up", "us", "use", "our"] },
    { id: "mr-mrs", words: ["Mr", "Mrs", "man", "mum"] },
    { id: "each-eat", words: ["each", "eat", "eggs", "every"] },
    { id: "going-gone", words: ["going", "gone", "good", "got"] },
    { id: "ome-sound-trap", words: ["home", "come", "some", "most"] },
    { id: "day-dad-bad", words: ["day", "dad", "bad", "away"] }
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
