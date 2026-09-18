// Word Den — parent view rendering.
var WordDen = window.WordDen || {};

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

  function renderSummary(counts, total) {
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

  function renderSessions() {
    var sessions = WordDen.state.getSessions();
    var el = document.getElementById("sessionSummary");
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

    renderSummary(counts, WordDen.ACTIVE_WORDS.length);
  }

  function renderVoicePicker() {
    var select = document.getElementById("voiceSelect");
    var testBtn = document.getElementById("voiceTestBtn");
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

  // Fixed 4-digit PIN so a curious kid tapping the "parent" link doesn't
  // land straight on the shaky/solid breakdown. Not meant to be a real
  // security boundary — just a speed bump, so it lives as a constant
  // rather than a settings screen for the MVP.
  var PARENT_PIN = "3108";
  var UNLOCK_KEY = "wordDenParentUnlocked";

  function unlock() {
    document.getElementById("lockScreen").hidden = true;
    document.getElementById("parentContent").hidden = false;
    renderClusters();
    renderSessions();
    renderVoicePicker();
  }

  function initLock() {
    var alreadyUnlocked = false;
    try {
      alreadyUnlocked = sessionStorage.getItem(UNLOCK_KEY) === "1";
    } catch (e) {
      alreadyUnlocked = false;
    }
    if (alreadyUnlocked) {
      unlock();
      return;
    }

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
        try {
          sessionStorage.setItem(UNLOCK_KEY, "1");
        } catch (e) {
          // Session storage unavailable — unlock still works for this load.
        }
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

  window.WordDen = WordDen;
})();
