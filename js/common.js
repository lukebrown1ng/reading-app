// Reading Den — helpers shared by every mode (Word Den, Read a Book,
// Spelling Den) and the parent page: localStorage access, dates, play-time
// sessions, text-to-speech voice choice, backup/restore and modal
// accessibility. Loaded before each mode's own scripts.
var Den = window.Den || {};

(function () {
  "use strict";

  // Every key the app keeps in localStorage — what backup/restore covers.
  Den.STORAGE_KEYS = ["wordDenState.v1", "readDenState.v1", "spellDenState.v1"];

  // --- Storage / dates ------------------------------------------------

  Den.storage = {
    // The parsed JSON stored under `key`, or null if missing / unreadable.
    read: function (key) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    // Storage can be unavailable (private mode, quota) — fail silently, the
    // app still works for the rest of the session.
    write: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) { /* ignore */ }
    }
  };

  // Local calendar day as a stable string, e.g. "2026-10-3".
  Den.dateStr = function (d) {
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  };

  // --- Play-time sessions ---------------------------------------------
  //
  // A session's `end` is a heartbeat: it is bumped every HEARTBEAT_MS while
  // the page is visible and again when it is hidden, so a page the OS kills
  // without warning still has an accurate end time. Coming back after
  // RESUME_MS or more starts a new session; a quick app switch carries on
  // the same one.
  var HEARTBEAT_MS = 30000;
  var RESUME_MS = 2 * 60 * 1000;

  // opts: start() -> session index, end(index) stamps its end time,
  // onHide() optional (e.g. stop the microphone).
  Den.trackSession = function (opts) {
    var index = opts.start();
    var hiddenAt = null;

    function beat() {
      if (index !== null) opts.end(index);
    }
    setInterval(function () {
      if (document.visibilityState === "visible") beat();
    }, HEARTBEAT_MS);

    function hide() {
      if (hiddenAt === null) hiddenAt = Date.now();
      if (opts.onHide) opts.onHide();
      beat();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        hide();
      } else if (hiddenAt !== null) {
        if (Date.now() - hiddenAt >= RESUME_MS) index = opts.start();
        hiddenAt = null;
      }
    });
    window.addEventListener("pagehide", hide);
  };

  // --- Text-to-speech voices -----------------------------------------
  //
  // Browser default voices are often the most robotic. getVoices() can be
  // empty for a while after load (Safari/iOS fills it late), so this polls
  // a few times, scores voices to prefer natural on-device English ones,
  // and lets a parent-chosen voice (by name) override the pick.

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

  // getPreferredName() returns the voice name saved for that mode, or null.
  Den.createVoices = function (getPreferredName) {
    var supported = typeof window.speechSynthesis !== "undefined";
    var english = [];
    var auto = null;

    function refresh() {
      if (!supported) return;
      var all = window.speechSynthesis.getVoices();
      if (!all || all.length === 0) return;
      english = all
        .filter(function (v) { return v.lang && v.lang.slice(0, 2) === "en"; })
        .sort(function (a, b) { return scoreVoice(b) - scoreVoice(a); });
      auto = english[0] || all[0] || null;
    }

    if (supported) {
      refresh();
      if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
        window.speechSynthesis.onvoiceschanged = refresh;
      }
      // Some voices (notably Siri's) are never exposed to web pages at all.
      [500, 1000, 2000, 4000].forEach(function (delay) {
        setTimeout(refresh, delay);
      });
    }

    function resolve() {
      var name = getPreferredName ? getPreferredName() : null;
      if (name) {
        var match = english.filter(function (v) { return v.name === name; })[0];
        if (match) return match;
      }
      return auto;
    }

    return {
      isSupported: function () { return supported; },
      getVoiceOptions: function () {
        return english.map(function (v) { return { name: v.name, lang: v.lang }; });
      },
      refresh: refresh,
      // Say `text` with the chosen voice. onDone fires on end or error.
      speak: function (text, rate, pitch, onDone) {
        if (!supported) {
          if (onDone) onDone();
          return;
        }
        try {
          window.speechSynthesis.cancel();
          var utterance = new SpeechSynthesisUtterance(text);
          var voice = resolve();
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          } else {
            utterance.lang = "en-GB";
          }
          utterance.rate = rate;
          utterance.pitch = pitch;
          if (onDone) {
            utterance.onend = onDone;
            utterance.onerror = onDone;
          }
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          if (onDone) onDone();
        }
      }
    };
  };

  // --- Backup / restore -----------------------------------------------
  //
  // Progress lives only in this browser's localStorage, which Safari can
  // clear for sites that go unused for a week. A JSON backup lets a parent
  // keep a copy and move it to another device.

  Den.backup = {
    toJSON: function () {
      var data = {};
      Den.STORAGE_KEYS.forEach(function (key) {
        var value = Den.storage.read(key);
        if (value) data[key] = value;
      });
      return JSON.stringify({ app: "reading-den", exportedAt: new Date().toISOString(), data: data }, null, 2);
    },
    // Returns the number of data sets restored; throws on a file that isn't
    // a Reading Den backup (nothing is changed in that case).
    restore: function (text) {
      var parsed = JSON.parse(text);
      if (!parsed || parsed.app !== "reading-den" || !parsed.data) {
        throw new Error("Not a Reading Den backup file.");
      }
      var keys = Den.STORAGE_KEYS.filter(function (key) {
        return parsed.data[key] && typeof parsed.data[key] === "object";
      });
      if (keys.length === 0) throw new Error("That backup has no saved progress in it.");
      keys.forEach(function (key) {
        Den.storage.write(key, parsed.data[key]);
      });
      return keys.length;
    }
  };

  // --- Modal accessibility --------------------------------------------
  //
  // Every `.progress-modal` / `.week-picker-modal` becomes a proper dialog:
  // role + aria-modal, focus moves in when it opens and back out when it
  // closes, Tab stays inside, and Escape closes it (via its ✕ button, so
  // each mode's own close logic runs). A modal with no ✕, like game over,
  // ignores Escape.
  var FOCUSABLE = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])";

  function enhanceModal(modal) {
    var card = modal.firstElementChild;
    var heading = modal.querySelector("h2, h3, .modal-title");
    var closeBtn = modal.querySelector(".modal-close-btn");
    var opener = null;

    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    if (heading) {
      if (!heading.id) heading.id = (modal.id || "modal") + "Title";
      modal.setAttribute("aria-labelledby", heading.id);
    }
    if (card) card.setAttribute("tabindex", "-1");

    function onOpen() {
      opener = document.activeElement;
      var target = closeBtn || modal.querySelector(FOCUSABLE) || card;
      if (target) target.focus();
    }
    function onClose() {
      if (opener && opener.focus && document.contains(opener)) opener.focus();
      opener = null;
    }

    new MutationObserver(function () {
      if (modal.hidden) onClose();
      else onOpen();
    }).observe(modal, { attributes: true, attributeFilter: ["hidden"] });

    modal.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        closeBtn.click();
      } else if (e.key === "Tab") {
        var items = Array.prototype.slice.call(modal.querySelectorAll(FOCUSABLE));
        if (items.length === 0) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(
      document.querySelectorAll(".progress-modal, .week-picker-modal"),
      enhanceModal
    );
  });

  // --- Offline support -----------------------------------------------

  if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener("load", function () {
      // sw.js sits at the app root, one level up from the mode folders.
      var inMode = /\/(word-den|read-den|spelling-den)\//.test(window.location.pathname);
      navigator.serviceWorker.register((inMode ? "../" : "") + "sw.js").catch(function () {});
    });
  }

  window.Den = Den;
})();
