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
      var end = s.end || Date.now();
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

  function renderWordVoicePicker() {
    var select = document.getElementById("wordVoiceSelect");
    var testBtn = document.getElementById("wordVoiceTestBtn");
    if (!select || !WordDen.speech || !WordDen.speech.isSupported()) {
      if (select) select.disabled = true;
      if (testBtn) testBtn.disabled = true;
      return;
    }

    function populate() {
      var options = WordDen.speech.getVoiceOptions();
      if (options.length === 0) return;
      var current = WordDen.state.getVoiceName();
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

      select.value = current || "";
    }

    populate();
    if (typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.addEventListener("voiceschanged", populate);
    }

    select.addEventListener("change", function () {
      WordDen.state.setVoiceName(select.value || null);
    });

    testBtn.addEventListener("click", function () {
      WordDen.speech.speak("they");
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
      var end = s.end || Date.now();
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

  function renderReadVoicePicker() {
    var select = document.getElementById("readVoiceSelect");
    var testBtn = document.getElementById("readVoiceTestBtn");
    if (!select || !ReadDen.narration || !ReadDen.narration.isSupported()) {
      if (select) select.disabled = true;
      if (testBtn) testBtn.disabled = true;
      return;
    }

    function populate() {
      var options = ReadDen.narration.getVoiceOptions();
      if (options.length === 0) return;
      var current = ReadDen.state.getNarrationVoiceName();
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

      select.value = current || "";
    }

    populate();
    if (typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.addEventListener("voiceschanged", populate);
    }

    select.addEventListener("change", function () {
      ReadDen.state.setNarrationVoiceName(select.value || null);
    });

    testBtn.addEventListener("click", function () {
      ReadDen.narration.speak("the dinosaur went for a walk");
    });
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
    counts.slice(0, 20).forEach(function (entry) {
      var row = document.createElement("div");
      row.className = "stumble-row";
      row.innerHTML = "<span>" + entry.word + "</span><span>" + entry.count + "</span>";
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
      var end = s.end || Date.now();
      totalMs += Math.max(0, end - s.start);
      if (s.start > lastStart) lastStart = s.start;
    });
    el.innerHTML =
      "Played " + sessions.length + " time" + (sessions.length === 1 ? "" : "s") +
      ", roughly " + formatDuration(totalMs) + " altogether. " +
      "Last played: " + formatDate(lastStart) + ".";
  }

  function spellingWordStatus(record) {
    if (record.seen === 0) return "new";
    if (record.misses === 0) return "solid";
    if (record.correctFirstTry > 0) return "learning";
    return "shaky";
  }

  function renderSpellingWeeks() {
    var list = document.getElementById("spellingWeekList");
    list.innerHTML = "";
    SpellDen.WEEKS.forEach(function (week) {
      var block = document.createElement("div");
      block.className = "week-block";

      var label = document.createElement("div");
      label.className = "week-block-label";
      label.textContent = week.label;
      block.appendChild(label);

      var row = document.createElement("div");
      row.className = "cluster-row";
      week.words.forEach(function (word) {
        var record = SpellDen.state.getWordRecord(word);
        var chip = document.createElement("span");
        chip.className = "word-chip status-" + spellingWordStatus(record);
        chip.textContent = word;
        row.appendChild(chip);
      });
      block.appendChild(row);

      list.appendChild(block);
    });
  }

  function renderSpellingVoicePicker() {
    var select = document.getElementById("spellingVoiceSelect");
    var testBtn = document.getElementById("spellingVoiceTestBtn");
    if (!select || !SpellDen.speech || !SpellDen.speech.isSupported()) {
      if (select) select.disabled = true;
      if (testBtn) testBtn.disabled = true;
      return;
    }

    function populate() {
      var options = SpellDen.speech.getVoiceOptions();
      if (options.length === 0) return;
      var current = SpellDen.state.getVoiceName();
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

      select.value = current || "";
    }

    populate();
    if (typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.addEventListener("voiceschanged", populate);
    }

    select.addEventListener("change", function () {
      SpellDen.state.setVoiceName(select.value || null);
    });

    testBtn.addEventListener("click", function () {
      SpellDen.speech.speak("because");
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
    renderWordVoicePicker();
    renderReadSessions();
    renderReadVoicePicker();
    renderBookProgress();
    renderStumbles();
    renderSpellingSessions();
    renderSpellingVoicePicker();
    renderSpellingWeeks();
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
