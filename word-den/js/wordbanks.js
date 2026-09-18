// Word Den — expandable word banks.
//
// A "word bank" is just a raw, labelled list of words from some outside
// source (a school reading-record booklet, a year group's word list, a
// topic list, etc.) — independent of the confusable CLUSTERS in
// wordbank.js, which is what the game actually quizzes from. Adding a
// new word list in future (Year 4, Year 5, a topic set...) means adding
// one entry to WORD_BANKS below; nothing else needs to change.
//
// Turning a bank into playable rounds means grouping its words into
// confusable clusters (see WordDen.CLUSTERS in wordbank.js) and adding
// them there — a bank on its own isn't wired into gameplay yet.
var WordDen = window.WordDen || {};

(function () {
  "use strict";

  WordDen.WORD_BANKS = [
    {
      id: "year3-tricky",
      label: "Year 3 — words I need to know",
      // Transcribed from a school reading-record booklet's "Words I
      // need to know" / "More words I need to know" pages.
      words: [
        // "Words I need to know"
        "a", "about", "all", "an", "and", "are", "as", "asked", "at",
        "back", "be", "big", "but", "by", "called", "came", "can",
        "children", "come", "could", "dad", "day", "do", "don't", "down",
        "for", "from", "get", "go", "got", "had", "have", "he", "help",
        "her", "here", "him", "his", "house", "I", "I'm", "if", "in",
        "into", "is", "it", "it's", "just", "like", "little",
        "look", "looked", "made", "make", "me", "Mr", "Mrs", "mum", "my",
        "no", "not", "now", "of", "off", "oh", "old", "on", "one", "out",
        "people", "put", "said", "saw", "see", "she",
        "so", "some", "that", "the", "their", "them", "then", "there",
        "they", "this", "time", "to", "too", "up", "very", "was", "we",
        "went", "were", "what", "when", "will", "with", "you", "your",

        // "More words I need to know"
        "across", "after", "again", "air", "along", "am", "animals",
        "another", "any", "around", "away", "baby", "bad", "bear",
        "because", "bed", "been", "before", "began", "best", "better",
        "birds", "boat",
        "book", "box", "boy", "can't", "car", "cat", "clothes", "cold",
        "coming", "couldn't", "cried", "dark", "did", "didn't",
        "different", "dog", "door", "dragon", "duck", "each", "eat",
        "eggs", "end",
        "even", "ever", "every", "everyone", "eyes", "fast", "feet",
        "fell", "find", "first", "fish", "floppy", "fly", "food",
        "found", "fox", "friends", "fun", "garden", "gave", "giant",
        "girl", "going",
        "gone", "good", "gran", "grandad", "great", "green", "grow",
        "hard", "has", "hat", "he's", "head", "home", "horse", "hot",
        "how", "I'll", "I've", "inside", "its", "jumped", "keep", "key",

        "king", "know", "last", "laughed", "let", "let's", "liked",
        "live", "lived", "long", "looking", "looks", "lots", "magic",
        "man", "many", "may", "miss", "more", "morning", "most",
        "mother", "mouse", "much", "must", "narrator", "need",
        "never", "new", "next", "night", "once", "only", "or", "other",
        "our", "over", "park", "place", "plants", "play", "please",
        "pulled", "queen", "rabbit", "ran", "really", "red", "right",
        "river", "room", "round", "run", "sat",
        "say", "school", "sea", "shouted", "sleep", "small", "snow",
        "something", "soon", "still", "stop", "stopped", "suddenly",
        "sun", "take", "tea", "tell", "than", "that's", "there's",
        "these", "thing", "things", "think", "thought", "three",
        "through",
        "told", "took", "top", "town", "tree", "trees", "two", "under",
        "us", "use", "want", "wanted", "water", "way", "we're", "well",
        "where", "which", "white", "who", "why", "wind", "window",
        "wish", "work", "would", "yes"
      ]
    }
  ];

  WordDen.getWordBank = function (id) {
    return WordDen.WORD_BANKS.filter(function (bank) {
      return bank.id === id;
    })[0] || null;
  };

  window.WordDen = WordDen;
})();
