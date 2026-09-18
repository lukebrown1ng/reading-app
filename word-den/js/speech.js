// Word Den — SpeechSynthesis wrapper for audio mode.
//
// The default browser voice is often the worst-sounding one available,
// and on top of that `getVoices()` can return an empty list for a moment
// after page load (the real list only arrives via the async
// `voiceschanged` event) — so a naive implementation ends up stuck on a
// robotic fallback even when much better voices exist on the device.
// This waits for the real list and scores voices to prefer natural-
// sounding, on-device English ones, with an optional manual override
// (set from the parent view) for whichever voice actually sounds best on
// this specific tablet/browser.
var WordDen = window.WordDen || {};

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

    // On-device voices are almost always higher quality and lower latency
    // than a generic network fallback.
    if (voice.localService) score += 10;

    // Known higher-quality voice families across platforms.
    if (/enhanced|premium|neural|natural/.test(name)) score += 25;
    if (/siri/.test(name)) score += 20;
    if (/google/.test(name)) score += 10;
    if (/uk english/.test(name)) score += 8;

    // Known low-quality/robotic voice families to avoid.
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
    var preferredName = WordDen.state ? WordDen.state.getVoiceName() : null;
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
  }

  WordDen.speech = {
    isSupported: function () {
      return supported;
    },

    // English voices, best-sounding first, for a parent-facing picker.
    getVoiceOptions: function () {
      return englishVoices.map(function (v) {
        return { name: v.name, lang: v.lang };
      });
    },

    speak: function (word) {
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
        utterance.rate = 0.85;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Speech unavailable — text mode still works fine.
      }
    }
  };

  window.WordDen = WordDen;
})();
