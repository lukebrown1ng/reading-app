// Read Den — SpeechSynthesis wrapper, shared by the "hear this word" help
// and the no-recognition fallback's "read this page to me" narration.
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
    speak: function (text, onEnd) {
      voices.speak(text, 0.9, 1.0, onEnd);
    }
  };

  window.ReadDen = ReadDen;
})();
