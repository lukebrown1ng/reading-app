// Read Den — thin wrapper around the browser SpeechRecognition API for
// the follow-along reading mode. Not supported on every browser, so
// reader.js checks isSupported() and falls back to tap-to-hear reading
// rather than pretending to listen.
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  var SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
  var supported = !!SpeechRecognitionImpl;
  var active = null;

  ReadDen.recognition = {
    isSupported: function () {
      return supported;
    },

    // callbacks: { onResult(results), onEnd(), onError(err) }
    // onResult gets the run's running list, [{ words, isFinal }], so the
    // caller can tell settled speech from guesses that may still change.
    // onEnd fires only when the browser ends a run by itself (they all
    // auto-stop after some quiet) — not after stop().
    start: function (callbacks) {
      if (!supported) return false;
      try {
        var rec = new SpeechRecognitionImpl();
        rec.lang = "en-GB";
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        rec.onresult = function (event) {
          if (active !== rec) return;
          var results = [];
          for (var i = 0; i < event.results.length; i++) {
            results.push({
              words: ReadDen.normalizeHeard(event.results[i][0].transcript),
              isFinal: event.results[i].isFinal
            });
          }
          if (callbacks.onResult) callbacks.onResult(results);
        };
        rec.onerror = function (event) {
          if (active === rec && callbacks.onError) callbacks.onError(event.error);
        };
        rec.onend = function () {
          if (active !== rec) return;
          active = null;
          if (callbacks.onEnd) callbacks.onEnd();
        };

        active = rec;
        rec.start();
        return true;
      } catch (e) {
        active = null;
        if (callbacks.onError) callbacks.onError(e && e.name === "NotAllowedError" ? "not-allowed" : "error");
        return false;
      }
    },

    stop: function () {
      var rec = active;
      active = null;
      if (rec) {
        try {
          rec.abort();
        } catch (e) {
          // Already stopped/unavailable — nothing to do.
        }
      }
    }
  };

  window.ReadDen = ReadDen;
})();
