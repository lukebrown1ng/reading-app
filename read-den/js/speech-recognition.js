// Read Den — thin wrapper around the browser SpeechRecognition API for
// the follow-along reading mode. Not supported on every browser (notably
// iOS/iPadOS Safari has no SpeechRecognition at all) — reader.js checks
// isSupported() and falls back to a page-through-only mode when it's not
// available, rather than pretending to listen.
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  var SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
  var supported = !!SpeechRecognitionImpl;
  var active = null;

  function normalize(word) {
    return word.toLowerCase().replace(/[^a-z']/g, "");
  }

  ReadDen.recognition = {
    isSupported: function () {
      return supported;
    },

    // callbacks: { onResult(words), onEnd(), onError(err) }
    // onResult receives the full list of normalized words recognized so
    // far in this session (interim + final), so the caller can match
    // forward from wherever it currently is in the page.
    start: function (callbacks) {
      if (!supported) return null;
      try {
        var rec = new SpeechRecognitionImpl();
        rec.lang = "en-GB";
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        rec.onresult = function (event) {
          var words = [];
          for (var i = 0; i < event.results.length; i++) {
            var transcript = event.results[i][0].transcript;
            transcript.split(/\s+/).forEach(function (w) {
              var norm = normalize(w);
              if (norm) words.push(norm);
            });
          }
          if (callbacks.onResult) callbacks.onResult(words);
        };
        rec.onerror = function (event) {
          if (callbacks.onError) callbacks.onError(event.error);
        };
        rec.onend = function () {
          if (active === rec) active = null;
          if (callbacks.onEnd) callbacks.onEnd();
        };

        active = rec;
        rec.start();
        return rec;
      } catch (e) {
        if (callbacks.onError) callbacks.onError(e);
        return null;
      }
    },

    stop: function () {
      if (active) {
        try {
          active.stop();
        } catch (e) {
          // Already stopped/unavailable — nothing to do.
        }
      }
    }
  };

  window.ReadDen = ReadDen;
})();
