// Word Den — SpeechSynthesis wrapper for audio mode.
var WordDen = window.WordDen || {};

(function () {
  "use strict";

  var supported = typeof window.speechSynthesis !== "undefined";

  WordDen.speech = {
    isSupported: function () {
      return supported;
    },
    speak: function (word) {
      if (!supported) return;
      try {
        window.speechSynthesis.cancel();
        var utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = "en-GB";
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Speech unavailable — text mode still works fine.
      }
    }
  };

  window.WordDen = WordDen;
})();
