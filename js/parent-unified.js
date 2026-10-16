// Reading Den — unified parent view, combining Word Game and Read a Book
// data. Everything here reads from WordDen.state / ReadDen.state, which
// each own their own localStorage key.

(function () {
  "use strict";

  function formatDuration(ms) {
    var minutes = Math.round(ms / 60000);
    if (minutes < 1) return "under a minute";
    if (minutes === 1) return "1 minute";
    if (minutes < 60) return minutes + " minutes";
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    return hours + "h " + rest + "m";
  }

  function formatDate(ts) {
    if (!ts) return "never yet";
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }

  // --- Word Game ---------------------------------------------------

  function renderWordGameSummary(counts) {
    var row = document.getElementById("summaryRow");
    var pills = [
      { label: "solid", value: counts.solid },
      { label: "learning", value: counts.learning },
      { label: "shaky", value: counts.shaky },
      { label: "not started", value: counts["new"] }
    ];
    row.innerHTML = "";
    pills.forEach(function (pill) {
      var div = document.createElement("div");
      div.className = "summary-pill";
      div.innerHTML = "<strong>" + pill.value + "</strong>" + pill.label;
      row.appendChild(div);
    });
  }

  function renderWordGameSessions() {
    var sessions = WordDen.state.getSessions();
    var el = document.getElementById("wordGameSessionSummary");
    if (sessions.length === 0) {
      el.textContent = "No play sessions yet.";
      return;
    }
    var totalMs = 0;
    var lastStart = 0;
    sessions.forEach(function (s) {
      var end = s.end || s.start;
      totalMs += Math.max(0, end - s.start);
      if (s.start > lastStart) lastStart = s.start;
    });
    el.innerHTML =
      "Played " + sessions.length + " time" + (sessions.length === 1 ? "" : "s") +
      ", roughly " + formatDuration(totalMs) + " altogether. " +
      "Last played: " + formatDate(lastStart) + ".";
  }

  function renderClusters() {
    var list = document.getElementById("clusterList");
    list.innerHTML = "";
    var counts = { "new": 0, shaky: 0, learning: 0, solid: 0 };

    WordDen.CLUSTERS.forEach(function (cluster) {
      var row = document.createElement("div");
      row.className = "cluster-row";
      cluster.words.forEach(function (word) {
        var status = WordDen.state.getWordStatus(word);
        counts[status] += 1;
        var chip = document.createElement("span");
        chip.className = "word-chip status-" + status;
        chip.textContent = word;
        row.appendChild(chip);
      });
      list.appendChild(row);
    });

    renderWordGameSummary(counts);
  }

  function renderLevelAndBadges() {
    var summary = document.getElementById("levelSummary");
    var info = WordDen.state.getLevelInfo();
    var daily = WordDen.state.getDailyStreak();
    summary.innerHTML =
      info.emoji + " <strong>Level " + info.level + " — " + info.title + "</strong><br>" +
      info.xpIntoLevel + " / " + info.xpForNextLevel + " XP to the next level. " +
      "Best streak: " + WordDen.state.getBestStreak() + " in a row. " +
      "Day streak: " + daily.current + " (best " + daily.best + ").";

    var earned = WordDen.state.getBadges();
    var grid = document.getElementById("badgeRow");
    grid.innerHTML = "";
    WordDen.BADGES.forEach(function (badge) {
      var unlocked = !!earned[badge.id];
      var card = document.createElement("div");
      card.className = "badge-card" + (unlocked ? "" : " badge-locked");
      card.innerHTML =
        '<div class="badge-icon">' + (unlocked ? badge.icon : "🔒") + "</div>" +
        '<div class="badge-name">' + badge.name + "</div>" +
        '<div class="badge-desc">' + badge.desc + "</div>";
      grid.appendChild(card);
    });
  }

  // --- Read a Book ---------------------------------------------------

  function renderReadSessions() {
    var sessions = ReadDen.state.getSessions();
    var el = document.getElementById("readSessionSummary");
    if (sessions.length === 0) {
      el.textContent = "No reading sessions yet.";
      return;
    }
    var appOpenMs = 0;
    var activeMs = 0;
    var lastStart = 0;
    sessions.forEach(function (s) {
      var end = s.end || s.start;
      appOpenMs += Math.max(0, end - s.start);
      activeMs += s.activeMs || 0;
      if (s.start > lastStart) lastStart = s.start;
    });
    var recognitionEverUsed = activeMs > 0;
    var html =
      "Opened " + sessions.length + " time" + (sessions.length === 1 ? "" : "s") +
      ", app open roughly " + formatDuration(appOpenMs) + " altogether. " +
      "Last read: " + formatDate(lastStart) + ".";
    if (recognitionEverUsed) {
      html += "<br>Actual listening time (mic following along): roughly " +
        formatDuration(activeMs) + ".";
    } else {
      html += "<br><em>Speech recognition hasn't been used yet on this " +
        "device (or isn't supported), so there's no separate " +
        "active-reading-time figure — just time the app was open.</em>";
    }
    el.innerHTML = html;
  }

  function renderBookProgress() {
    var list = document.getElementById("bookProgressList");
    list.innerHTML = "";
    ReadDen.BOOKS.forEach(function (book) {
      var progress = ReadDen.state.getBookProgress(book.id);
      var row = document.createElement("div");
      row.className = "book-row";
      if (progress.opens === 0) {
        row.innerHTML = "<strong>" + book.cover + " " + book.title + "</strong>Not started yet.";
      } else {
        row.innerHTML =
          "<strong>" + book.cover + " " + book.title + "</strong>" +
          "Up to page " + (progress.lastPage + 1) + " of " + book.pages.length + ". " +
          "Opened " + progress.opens + " time" + (progress.opens === 1 ? "" : "s") +
          (progress.rereads > 0 ? ", reread pages " + progress.rereads + " time" + (progress.rereads === 1 ? "" : "s") : "") +
          ".";
      }
      list.appendChild(row);
    });
  }

  function renderStumbles() {
    var list = document.getElementById("stumbleList");
    list.innerHTML = "";
    var counts = ReadDen.state.getStumbleCounts();
    if (counts.length === 0) {
      var empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = "No stumbles logged yet.";
      list.appendChild(empty);
      return;
    }
    var note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "🦕 = also comes up in the Word Game, which revisits these words.";
    list.appendChild(note);
    counts.slice(0, 20).forEach(function (entry) {
      var row = document.createElement("div");
      row.className = "stumble-row";
      var inGame = !!WordDen.CLUSTERS_BY_WORD[entry.word];
      row.innerHTML = "<span></span><span></span>";
      row.firstChild.textContent = entry.word + (inGame ? " 🦕" : "");
      if (inGame) row.firstChild.title = "Also practised in the Word Game";
      row.lastChild.textContent = entry.count;
      list.appendChild(row);
    });
  }

  // --- Spellings ---------------------------------------------------

  function renderSpellingSessions() {
    var sessions = SpellDen.state.getSessions();
    var el = document.getElementById("spellingSessionSummary");
    if (sessions.length === 0) {
      el.textContent = "No spelling sessions yet.";
      return;
    }
    var totalMs = 0;
    var lastStart = 0;
    sessions.forEach(function (s) {
      var end = s.end || s.start;
      totalMs += Math.max(0, end - s.start);
      if (s.start > lastStart) lastStart = s.start;
    });
    el.innerHTML =
      "Played " + sessions.length + " time" + (sessions.length === 1 ? "" : "s") +
      ", roughly " + formatDuration(totalMs) + " altogether. " +
      "Last played: " + formatDate(lastStart) + ".";
  }

  function renderSpellingRounds() {
    var list = document.getElementById("spellingRoundList");
    list.innerHTML = "";
    var rounds = SpellDen.state.getRounds().reverse();
    if (rounds.length === 0) {
      list.textContent = "No finished rounds yet.";
      return;
    }
    var labels = { first: "first time", retry: "after a retry", skipped: "got wrong" };
    rounds.forEach(function (round) {
      var d = new Date(round.at);
      var details = document.createElement("details");
      details.className = "round-row";

      var summary = document.createElement("summary");
      var when = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) +
        ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      summary.innerHTML =
        '<span class="round-score">' + round.firstTry + " / " + round.total + "</span>" +
        '<span class="round-meta"><strong>' + round.weekLabel + "</strong>" +
        "<span>" + when + (round.mode === "type" ? " · typed" : "") + "</span></span>";
      details.appendChild(summary);

      var row = document.createElement("div");
      row.className = "cluster-row round-words";
      round.results.forEach(function (r) {
        var chip = document.createElement("span");
        chip.className = "word-chip " + (r.status === "first" ? "status-solid" :
          r.status === "retry" ? "status-learning" : "status-shaky");
        chip.textContent = r.word;
        chip.title = labels[r.status];
        row.appendChild(chip);
      });
      details.appendChild(row);

      var key = document.createElement("div");
      key.className = "round-key";
      key.textContent = "Green: right first time · Yellow: after a retry · Red: got wrong";
      details.appendChild(key);

      list.appendChild(details);
    });
  }

  function renderSpellingWeeks() {
    var list = document.getElementById("spellingWeekList");
    list.innerHTML = "";
    SpellDen.getAllWeeks().forEach(function (week) {
      var block = document.createElement("div");
      block.className = "week-block";

      var label = document.createElement("div");
      label.className = "week-block-label";
      label.textContent = week.label;
      block.appendChild(label);

      var row = document.createElement("div");
      row.className = "cluster-row";
      week.words.forEach(function (word) {
        var chip = document.createElement("span");
        chip.className = "word-chip status-" + SpellDen.state.getWordStatus(word);
        chip.textContent = word;
        row.appendChild(chip);
      });
      block.appendChild(row);

      list.appendChild(block);
    });
  }

  // --- Voice pickers ---------------------------------------------------

  var VOICE_HELP =
    "<summary>Get more voices on this device</summary>" +
    "<ol>" +
    "<li>Open <strong>Settings → Accessibility → Spoken Content → Voices</strong>.</li>" +
    "<li>Pick a language, e.g. <strong>English → United Kingdom</strong>.</li>" +
    "<li>Tap a voice name (Serena, Stephanie, Kate...) and download the " +
    "<strong>Enhanced</strong> or <strong>Premium</strong> quality version — " +
    "the default \"Standard\" ones are the robotic-sounding ones.</li>" +
    "<li>Fully quit and reopen the browser (or restart the phone) after " +
    "downloading, then tap the ↻ button above to re-check — newly " +
    "downloaded voices often don't show up until then.</li>" +
    "</ol>" +
    "<p class=\"voice-help-note\"><strong>Siri voices don't show up here</strong> — " +
    "this is a known Safari/iOS limitation (Siri's voices aren't available to " +
    "web pages at all, however long you wait), not something this page can " +
    "fix. The Enhanced/Premium voices above are the best-sounding ones " +
    "actually available here.</p>";

  // One picker per mode. `speech` has isSupported / getVoiceOptions /
  // refresh / a speak function; `state` stores the chosen voice name.
  var VOICE_PICKERS = {
    word: {
      speech: function () { return WordDen.speech; },
      speak: function (sp) { sp.speak("they"); },
      get: function () { return WordDen.state.getVoiceName(); },
      set: function (v) { WordDen.state.setVoiceName(v); }
    },
    read: {
      speech: function () { return ReadDen.narration; },
      speak: function (sp) { sp.speak("the dinosaur went for a walk"); },
      get: function () { return ReadDen.state.getNarrationVoiceName(); },
      set: function (v) { ReadDen.state.setNarrationVoiceName(v); }
    },
    spelling: {
      speech: function () { return SpellDen.speech; },
      speak: function (sp) { sp.speak("because"); },
      get: function () { return SpellDen.state.getVoiceName(); },
      set: function (v) { SpellDen.state.setVoiceName(v); }
    }
  };

  function renderVoicePicker(box) {
    var cfg = VOICE_PICKERS[box.getAttribute("data-voice-picker")];
    var speech = cfg.speech();
    var id = "voiceSelect-" + box.getAttribute("data-voice-picker");

    box.innerHTML =
      '<label for="' + id + '"></label>' +
      '<p class="parent-note voice-note"></p>' +
      '<div class="voice-picker-row">' +
      '<select id="' + id + '"></select>' +
      '<button type="button" class="voice-test-btn">▶ Try it</button>' +
      '<button type="button" class="voice-refresh-btn" aria-label="Refresh voice list">↻</button>' +
      "</div>" +
      '<details class="voice-help">' + VOICE_HELP + "</details>";
    box.querySelector("label").textContent = box.getAttribute("data-label");
    box.querySelector(".voice-note").textContent = box.getAttribute("data-note");

    var select = box.querySelector("select");
    var testBtn = box.querySelector(".voice-test-btn");
    var refreshBtn = box.querySelector(".voice-refresh-btn");
    if (!speech || !speech.isSupported()) {
      select.disabled = testBtn.disabled = refreshBtn.disabled = true;
      return;
    }

    function populate() {
      var options = speech.getVoiceOptions();
      if (options.length === 0) return;
      select.innerHTML = "";
      var autoOpt = document.createElement("option");
      autoOpt.value = "";
      autoOpt.textContent = "Auto (recommended)";
      select.appendChild(autoOpt);
      options.forEach(function (opt) {
        var el = document.createElement("option");
        el.value = opt.name;
        el.textContent = opt.name + " (" + opt.lang + ")";
        select.appendChild(el);
      });
      select.value = cfg.get() || "";
    }

    populate();
    window.speechSynthesis.addEventListener("voiceschanged", populate);
    select.addEventListener("change", function () { cfg.set(select.value || null); });
    testBtn.addEventListener("click", function () { cfg.speak(speech); });
    refreshBtn.addEventListener("click", function () {
      speech.refresh();
      populate();
    });
  }

  // --- Backup ------------------------------------------------------------

  function initBackup() {
    var message = document.getElementById("backupMessage");
    document.getElementById("backupExportBtn").addEventListener("click", function () {
      var blob = new Blob([Den.backup.toJSON()], { type: "application/json" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "reading-den-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
      message.textContent = "Backup saved to your downloads.";
    });

    var input = document.getElementById("backupImportInput");
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (!window.confirm("Replace the progress on this device with the backup? This can't be undone.")) {
        input.value = "";
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        try {
          Den.backup.restore(String(reader.result));
          message.textContent = "Restored. Reloading…";
          setTimeout(function () { window.location.reload(); }, 600);
        } catch (e) {
          message.textContent = "Couldn't restore: " + e.message;
        }
        input.value = "";
      };
      reader.readAsText(file);
    });
  }

  // --- PIN gate --------------------------------------------------------
  // Fixed 4-digit speed bump, not a real security boundary — just enough
  // that a curious kid tapping "parent" doesn't land straight on the
  // data. Asked every time the page is opened, never remembered.
  var PARENT_PIN = "3108";

  function unlock() {
    document.getElementById("lockScreen").hidden = true;
    document.getElementById("parentContent").hidden = false;
    renderClusters();
    renderWordGameSessions();
    renderLevelAndBadges();
    renderReadSessions();
    renderBookProgress();
    renderStumbles();
    renderSpellingSessions();
    renderSpellingRounds();
    renderSpellingWeeks();
    Array.prototype.forEach.call(document.querySelectorAll("[data-voice-picker]"), renderVoicePicker);
    initBackup();
  }

  function initLock() {
    var input = document.getElementById("pinInput");
    var error = document.getElementById("pinError");
    input.focus();

    input.addEventListener("input", function () {
      input.value = input.value.replace(/\D/g, "").slice(0, 4);
      if (input.value.length < 4) {
        error.hidden = true;
        return;
      }
      if (input.value === PARENT_PIN) {
        unlock();
      } else {
        error.hidden = false;
        input.classList.add("pin-shake");
        setTimeout(function () {
          input.classList.remove("pin-shake");
          input.value = "";
        }, 400);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initLock);
})();
