// Read Den — SpeechSynthesis wrapper, shared by the "hear this word" help
// and the no-recognition fallback's "read this page to me" narration.
// Same voice-scoring approach as Word Den's speech.js (default browser
// voices are often the most robotic-sounding available), kept as its own
// module since Read a Book has its own voice preference.
var ReadDen = window.ReadDen || {};

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
    var preferredName = ReadDen.state ? ReadDen.state.getNarrationVoiceName() : null;
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

  ReadDen.narration = {
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
    speak: function (text, onEnd) {
      if (!supported) {
        if (onEnd) onEnd();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        var utterance = new SpeechSynthesisUtterance(text);
        var voice = resolveVoice();
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = "en-GB";
        }
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        if (onEnd) utterance.onend = onEnd;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        if (onEnd) onEnd();
      }
    }
  };

  window.ReadDen = ReadDen;
})();
