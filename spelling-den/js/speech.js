// Spelling Den — plays the pre-made clips, falling back to the device
// voice (js/common.js). Each mode keeps its own voice preference.
var SpellDen = window.SpellDen || {};

(function () {
  "use strict";

  var voices = Den.createVoices(function () {
    return SpellDen.state ? SpellDen.state.getVoiceName() : null;
  });
  var supported = voices.isSupported();

  // iOS only lets audio start without a tap if the same element has been
  // played from a tap before — so one shared element is reused for every
  // clip, and unlocked by the first touch anywhere on the page. That's what
  // lets the next word auto-play after the "correct!" delay.
  var player = new Audio();
  player.preload = "auto";
  var unlocked = false;

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

  // Clips are played as a queue of { clip, text } steps, so a word can be
  // followed by its sentence and then the word again. Each step plays the
  // pre-made clip, or the device voice if the clip is missing / blocked.
  // `token` changes whenever playback is stopped or restarted, which makes
  // any callbacks from the previous queue do nothing.
  var token = 0;
  var GAP_MS = 600; // pause between the word, the sentence and the word again

  function stopAll() {
    token += 1;
    player.pause();
    if (supported) window.speechSynthesis.cancel();
  }

  function playSequence(steps) {
    stopAll();
    var mine = token;
    var i = 0;

    function advance() {
      setTimeout(next, GAP_MS);
    }

    function next() {
      if (mine !== token || i >= steps.length) return;
      var step = steps[i++];
      var done = false;

      function cleanup() {
        done = true;
        player.removeEventListener("ended", onEnded);
        player.removeEventListener("error", fallBack);
      }
      function onEnded() {
        if (done) return;
        cleanup();
        advance();
      }
      function fallBack() {
        if (done || mine !== token) return;
        cleanup();
        SpellDen.speech.speakWithDeviceVoice(step.text, advance);
      }

      player.addEventListener("ended", onEnded);
      player.addEventListener("error", fallBack);

      player.src = "audio/" + encodeURIComponent(step.clip) + ".mp3";
      var p = player.play();
      if (p && p.catch) {
        p.catch(function (e) {
          // A missing clip fires "error" and is handled there; only blocked
          // playback (NotAllowedError) lands here.
          if (e && e.name === "NotAllowedError") fallBack();
        });
      }
    }

    next();
  }

  function playClip(clipName, text) {
    playSequence([{ clip: clipName, text: text }]);
  }

  SpellDen.speech = {
    isSupported: voices.isSupported,
    getVoiceOptions: voices.getVoiceOptions,
    // Manual re-check, for the parent-page "refresh" button.
    refresh: voices.refresh,

    // Plays the pre-made clip (audio/<word>.mp3, see
    // scripts/generate-audio.js), falling back to the device voice when
    // there isn't one — e.g. a week added from the parent page.
    speak: function (word) {
      playClip(word, word);
    },

    // The example sentence for a word, same clip-then-device-voice order.
    speakSentence: function (word) {
      var sentence = SpellDen.SENTENCES && SpellDen.SENTENCES[word];
      if (sentence) playClip(word + "-sentence", sentence);
    },

    // Word, then its sentence, then the word again — played automatically
    // as each new word starts. Falls back to just the word if there's no
    // sentence for it.
    speakIntro: function (word) {
      var sentence = SpellDen.SENTENCES && SpellDen.SENTENCES[word];
      var steps = [{ clip: word, text: word }];
      if (sentence) {
        steps.push({ clip: word + "-sentence", text: sentence });
        steps.push({ clip: word, text: word });
      }
      playSequence(steps);
    },

    hasSentence: function (word) {
      return !!(SpellDen.SENTENCES && SpellDen.SENTENCES[word]);
    },

    // Slightly slower than Word Den's prompt voice — spelling needs every
    // sound to land clearly, not just be recognisable.
    speakWithDeviceVoice: function (word, onDone) {
      voices.speak(word, 0.75, 1.05, onDone);
    }
  };

  window.SpellDen = SpellDen;
})();
