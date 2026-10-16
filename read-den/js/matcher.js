// Read Den — works out how far through a page the child has read, from the
// words the speech recogniser has heard. Kept free of any DOM so it can be
// unit-tested (see tests/).
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  // How many upcoming words a spoken word may match, so a mumbled or skipped
  // word doesn't leave the highlight stuck, without leaping across the page.
  var LOOKAHEAD = 4;

  // tokens: the page's words ({ norm }). cursor: index of the word the child
  // should say next. spoken: every word heard so far in this recognition run
  // (it only grows). consumed: how many of `spoken` have already been used.
  //
  // Each newly heard word moves the cursor to just past its first match in
  // the next LOOKAHEAD words; words that match nothing are ignored. Using
  // the first match, and each heard word once, means a repeated word ("the
  // cat sat on the mat") can't pull the highlight past words not yet read.
  ReadDen.advanceBySpeech = function (tokens, cursor, spoken, consumed) {
    // A fresh recognition run starts again from nothing.
    if (spoken.length < consumed) consumed = 0;
    for (; consumed < spoken.length && cursor < tokens.length; consumed++) {
      var end = Math.min(tokens.length, cursor + LOOKAHEAD);
      for (var i = cursor; i < end; i++) {
        if (tokens[i].norm === spoken[consumed]) {
          cursor = i + 1;
          break;
        }
      }
    }
    return { cursor: cursor, consumed: consumed };
  };

  ReadDen.LOOKAHEAD = LOOKAHEAD;
  window.ReadDen = ReadDen;
})();
