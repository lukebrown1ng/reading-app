// Word Den — SpeechSynthesis wrapper for audio mode.
//
// Voice choice (scoring, late-loading voice lists, the parent's override)
// lives in js/common.js.
var WordDen = window.WordDen || {};

(function () {
  "use strict";

  var voices = Den.createVoices(function () {
    return WordDen.state ? WordDen.state.getVoiceName() : null;
  });
  var supported = voices.isSupported();

  // Pre-made ElevenLabs clips (audio/<slug>.mp3, see
  // scripts/generate-audio.js) are played in preference to the device
  // voice, which stays as the fallback for any word with no clip.
  //
  // iOS only lets audio start without a tap if the same element has been
  // played from a tap before — so one shared element is reused for every
  // clip, unlocked by the first touch on the page. That's what lets the
  // next word auto-play after an answer.
  var player = new Audio();
  player.preload = "auto";
  var unlocked = false;
  var token = 0;

  function slug(word) {
    return word.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    // Silent 1-sample WAV: satisfies the gesture requirement without sound.
    player.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    var p = player.play();
    if (p && p.catch) p.catch(function () { unlocked = false; });
    ["pointerdown", "touchstart", "click"].forEach(function (ev) {
      document.removeEventListener(ev, unlock, true);
    });
  }
  ["pointerdown", "touchstart", "click"].forEach(function (ev) {
    document.addEventListener(ev, unlock, true);
  });

  WordDen.speech = {
    isSupported: voices.isSupported,
    getVoiceOptions: voices.getVoiceOptions,
    // Manual re-check, for the parent-page "refresh" button.
    refresh: voices.refresh,

    speak: function (word) {
      token += 1;
      var mine = token;
      player.pause();
      if (supported) window.speechSynthesis.cancel();

      var done = false;
      function cleanup() {
        done = true;
        player.removeEventListener("error", fallBack);
      }
      function fallBack() {
        if (done || mine !== token) return;
        cleanup();
        WordDen.speech.speakWithDeviceVoice(word);
      }

      player.addEventListener("error", fallBack);
      player.src = "audio/" + slug(word) + ".mp3";
      var p = player.play();
      if (p && p.then) p.then(cleanup);
      if (p && p.catch) {
        p.catch(function (e) {
          // A missing clip fires "error" and is handled there; only blocked
          // playback (NotAllowedError) lands here.
          if (e && e.name === "NotAllowedError") fallBack();
        });
      }
    },

    speakWithDeviceVoice: function (word) {
      voices.speak(word, 0.85, 1.05);
    }
  };

  window.WordDen = WordDen;
})();
