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

  document.addEventListener("DOMContentLoaded", function () {
    renderClusters();
    renderSessions();
  });

  window.WordDen = WordDen;
})();
