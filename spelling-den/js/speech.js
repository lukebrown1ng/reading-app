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

    // Slightly slower than Word Den's prompt voice — spelling needs every
    // sound to land clearly, not just be recognisable.
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
        utterance.rate = 0.75;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Speech unavailable — the game still works, just harder without
        // sound, since text is deliberately never shown up front.
      }
    }
  };

  window.SpellDen = SpellDen;
})();
