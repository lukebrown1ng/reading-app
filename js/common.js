// Reading Den — helpers shared by every mode (Word Den, Read a Book,
// Spelling Den) and the parent page: localStorage access, dates, play-time
// sessions, text-to-speech voice choice, backup/restore and modal
// accessibility. Loaded before each mode's own scripts.
var Den = window.Den || {};

(function () {
  "use strict";

  // Every key the app keeps in localStorage — what backup/restore covers.
  Den.STORAGE_KEYS = ["wordDenState.v1", "readDenState.v1", "spellDenState.v1"];

  // --- Design variants: ?theme=<name>|none (jungle by default); names in NAMES below ---

  (function () {
    if (typeof location === "undefined" || !document.head) return; // tests run without a page
    var me = document.currentScript, base = me ? me.src.replace(/js\/common\.js.*$/, "") : "";
    var NAMES = ["candy", "jungle", "space", "sticker", "ocean", "pixel", "rainbow", "lava", "comic", "split", "none"];
    var q = /[?&]theme=(\w+)/.exec(location.search), t = q && q[1];
    if (NAMES.indexOf(t) === -1) t = null;
    try { if (t) localStorage.setItem("denTheme", t); else t = localStorage.getItem("denTheme"); } catch (e) { /* ignore */ }
    var link = document.createElement("link");
    link.rel = "stylesheet"; link.href = base + "css/themes.css";
    document.head.appendChild(link);
    t = t || "jungle";
    var COLORS = { candy: "#fff3c4", jungle: "#0f5a3c", space: "#1b1464", sticker: "#ffe14d", ocean: "#0b6fd0", pixel: "#14052e", rainbow: "#ffffff", lava: "#1a0d0a", comic: "#ffd400", split: "#ff5fb0" };
    function apply(n) {
      t = n;
      document.documentElement.setAttribute("data-theme", n);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (COLORS[n] && meta) meta.setAttribute("content", COLORS[n]);
    }
    apply(t);
    if (!document.body.hasAttribute("data-theme-picker")) return; // only the home page offers the picker
    // "select theme" in the footer opens a swipeable gallery of static screenshots; "Use this theme" applies one.
    var LABELS = { candy: "Candy Pop", jungle: "Jungle", space: "Space", sticker: "Sticker Book", ocean: "Ocean", pixel: "Pixel Quest",
      rainbow: "Rainbow", lava: "Lava Rock", comic: "Comic Pow", split: "Split Screen", none: "Original" };
    var dlg = document.createElement("dialog"); dlg.className = "den-theme-dialog"; dlg.setAttribute("aria-label", "Select theme");
    dlg.innerHTML = '<div class="den-theme-stage"><button type="button" class="den-theme-nav" data-dir="-1" aria-label="Previous theme">&lsaquo;</button>' +
      '<div class="den-theme-track" tabindex="0"></div><button type="button" class="den-theme-nav" data-dir="1" aria-label="Next theme">&rsaquo;</button></div>' +
      '<div class="den-theme-dots" aria-hidden="true"></div><button type="button" class="den-theme-close">Close</button>';
    var track = dlg.querySelector(".den-theme-track"), dots = dlg.querySelector(".den-theme-dots"), picks = [];
    NAMES.forEach(function (n) {
      var slide = document.createElement("figure"); slide.className = "den-theme-slide";
      slide.innerHTML = '<img src="' + base + "theme-previews/" + n + '-ipad.jpg" alt="Preview of the ' + LABELS[n] + ' theme" loading="lazy">' +
        "<figcaption>" + LABELS[n] + '</figcaption><button type="button" class="den-theme-use"></button>';
      var use = slide.querySelector(".den-theme-use"); picks.push({ name: n, btn: use });
      use.onclick = function () {
        try { localStorage.setItem("denTheme", n); } catch (e) { /* ignore */ }
        apply(n); mark(); dlg.close();
      };
      track.appendChild(slide);
      dots.appendChild(document.createElement("i"));
    });
    function mark() { // label the button on the current theme's slide
      picks.forEach(function (p) { p.btn.textContent = p.name === t ? "Current theme" : "Use this theme"; p.btn.disabled = p.name === t; });
    }
    function slideIndex() { return Math.round(track.scrollLeft / track.clientWidth); }
    function showDot() { var i = slideIndex(); Array.prototype.forEach.call(dots.children, function (d, k) { d.className = k === i ? "on" : ""; }); }
    track.addEventListener("scroll", showDot);
    dlg.querySelectorAll(".den-theme-nav").forEach(function (b) {
      b.onclick = function () { track.scrollBy({ left: Number(b.dataset.dir) * track.clientWidth, behavior: "smooth" }); };
    });
    dlg.querySelector(".den-theme-close").onclick = function () { dlg.close(); };
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); }); // tap the backdrop
    var open = document.createElement("button"); open.type = "button"; open.className = "den-theme-open";
    open.innerHTML = '<span class="den-theme-open-in"><span class="den-theme-spark" aria-hidden="true">🎨</span> Pick a theme</span>';
    open.onclick = function () {
      mark(); dlg.showModal();
      track.scrollLeft = NAMES.indexOf(t) * track.clientWidth; showDot(); // start on the theme in use
    };
    var footer = document.querySelector(".home-footer");
    (footer || document.body).insertBefore(open, footer && footer.firstChild);
    document.body.appendChild(dlg);
  })();

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

  // Consecutive-day streaks from timestamps of activity. The current streak
  // ends today, or yesterday so it isn't shown broken before today's play.
  Den.streaks = function (timestamps, now) {
    var set = {};
    var firsts = [];
    function day(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
    timestamps.forEach(function (ts) {
      var d = new Date(ts), key = Den.dateStr(d);
      if (!set[key]) { set[key] = true; firsts.push(d); }
    });
    var best = 0;
    firsts.forEach(function (d) {
      if (set[Den.dateStr(day(d, -1))]) return; // not the start of a run
      var run = 0;
      for (var x = d; set[Den.dateStr(x)]; x = day(x, 1)) run += 1;
      if (run > best) best = run;
    });
    var today = new Date(now || Date.now());
    var doneToday = !!set[Den.dateStr(today)];
    var current = 0;
    for (var y = doneToday ? today : day(today, -1); set[Den.dateStr(y)]; y = day(y, -1)) current += 1;
    return { current: current, best: best, today: doneToday };
  };

  // Words stumbled on in Read a Book, { word: count } (lower-case).
  Den.readStumbles = function () {
    var state = Den.storage.read("readDenState.v1");
    return (state && state.stumbles) || {};
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
      cancel: function () {
        if (!supported) return;
        try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
      },
      // Say `text` with the chosen voice. onDone fires on end or error;
      // onWord(charIndex) fires as each word starts, where the browser says so.
      speak: function (text, rate, pitch, onDone, onWord) {
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
          if (onWord) {
            utterance.onboundary = function (e) {
              if (e.name === undefined || e.name === "word") onWord(e.charIndex);
            };
          }
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
        var v = parsed.data[key];
        return v && typeof v === "object" && !Array.isArray(v);
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
  // each mode's own close logic runs). A modal with no ✕ can mark its safe
  // exit with data-escape; one with neither, like game over, ignores Escape.
  var FOCUSABLE = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])";

  function enhanceModal(modal) {
    var card = modal.firstElementChild;
    var heading = modal.querySelector("h2, h3, .modal-title");
    var closeBtn = modal.querySelector(".modal-close-btn, [data-escape]");
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
