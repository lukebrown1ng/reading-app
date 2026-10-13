// Spelling Den — SpeechSynthesis wrapper. Same voice-scoring approach as
// Word Den's speech.js (see that file for the reasoning), kept as its
// own copy so each mode owns its own voice preference.
var SpellDen = window.SpellDen || {};

(function () {
  "use strict";

  var supported = typeof window.speechSynthesis !== "undefined";
  var englishVoices = [];
  var autoPickedVoice = null;

  function scoreVoice(voice) {
    var name = voice.name.toLowerCase();
    var score = 0;

    if (voice.lang === "en-GB") score += 30;
    else if (voice.lang && voice.lang.slice(0, 2) === "en") score += 15;

    if (voice.localService) score += 10;

    if (/enhanced|premium|neural|natural/.test(name)) score += 25;
    if (/siri/.test(name)) score += 20;
    if (/google/.test(name)) score += 10;
    if (/uk english/.test(name)) score += 8;

    if (/compact|espeak|robot|whisper|zarvox|bells|bahh/.test(name)) score -= 40;

    return score;
  }

  function refreshVoices() {
    if (!supported) return;
    var all = window.speechSynthesis.getVoices();
    if (!all || all.length === 0) return;

    englishVoices = all
      .filter(function (v) {
        return v.lang && v.lang.slice(0, 2) === "en";
      })
      .sort(function (a, b) {
        return scoreVoice(b) - scoreVoice(a);
      });

    autoPickedVoice = englishVoices[0] || all[0] || null;
  }

  function resolveVoice() {
    var preferredName = SpellDen.state ? SpellDen.state.getVoiceName() : null;
    if (preferredName) {
      var match = englishVoices.filter(function (v) {
        return v.name === preferredName;
      })[0];
      if (match) return match;
    }
    return autoPickedVoice;
  }

  if (supported) {
    refreshVoices();
    if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
    // Safari (especially iOS/iPadOS) is known to populate the voice list
    // late and doesn't always fire onvoiceschanged — poll a few times to
    // catch it. Some voices (notably Siri's) are a Safari platform
    // limitation and may never be exposed here at all, no matter what.
    [500, 1000, 2000, 4000].forEach(function (delay) {
      setTimeout(refreshVoices, delay);
    });
  }

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
  var GAP_MS = 1500; // pause between the word, the sentence and the word again

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
    isSupported: function () {
      return supported;
    },

    getVoiceOptions: function () {
      return englishVoices.map(function (v) {
        return { name: v.name, lang: v.lang };
      });
    },

    // Manual re-check, for a parent-page "refresh" button — covers the
    // case where a voice was downloaded/enabled after the page loaded.
    refresh: refreshVoices,

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
      if (!supported) return;
      try {
        window.speechSynthesis.cancel();
        var utterance = new SpeechSynthesisUtterance(word);
        var voice = resolveVoice();
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = "en-GB";
        }
        utterance.rate = 0.75;
        utterance.pitch = 1.05;
        if (onDone) {
          utterance.onend = onDone;
          utterance.onerror = onDone;
        }
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Speech unavailable — the game still works, just harder without
        // sound, since text is deliberately never shown up front.
      }
    }
  };

  window.SpellDen = SpellDen;
})();
