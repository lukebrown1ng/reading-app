// Read Den — SpeechSynthesis wrapper, shared by the "hear this word" help
// and "hear it" page narration.
// Voice choice lives in js/common.js; Read a Book keeps its own preference.
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  var voices = Den.createVoices(function () {
    return ReadDen.state ? ReadDen.state.getNarrationVoiceName() : null;
  });

  ReadDen.narration = {
    isSupported: voices.isSupported,
    getVoiceOptions: voices.getVoiceOptions,
    refresh: voices.refresh,
    cancel: voices.cancel,
    // onWord(charIndex) fires as each word starts, where supported.
    speak: function (text, onEnd, onWord) {
      voices.speak(text, 0.9, 1.0, onEnd, onWord);
    }
  };

  window.ReadDen = ReadDen;
})();
