// Read Den — book picker: big covers, with a one-tap way back into the
// book he was in the middle of.
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  function bookUrl(book) {
    return "book.html?book=" + encodeURIComponent(book.id);
  }

  function pips(book, filledTo) {
    var html = '<span class="tile-pips" aria-hidden="true">';
    for (var i = 0; i < book.pages.length; i++) {
      html += '<span class="tile-pip' + (i < filledTo ? " on" : "") + '"></span>';
    }
    return html + "</span>";
  }

  function statusLabel(progress) {
    if (progress.lastPage > 0) return "keep reading";
    if (progress.completions > 0) return "read again ✓";
    return "start reading";
  }

  // The book opened most recently that is still part-way through.
  function inProgressBook() {
    var best = null;
    var bestTime = 0;
    ReadDen.BOOKS.forEach(function (book) {
      var progress = ReadDen.state.getBookProgress(book.id);
      if (progress.lastPage > 0 && progress.lastOpened >= bestTime) {
        best = book;
        bestTime = progress.lastOpened;
      }
    });
    return best;
  }

  function render() {
    var resume = inProgressBook();
    var tile = document.getElementById("resumeTile");
    if (resume) {
      var p = ReadDen.state.getBookProgress(resume.id);
      tile.href = bookUrl(resume);
      tile.innerHTML =
        '<span class="resume-cover">' + resume.cover + "</span>" +
        '<span class="resume-text"><span class="resume-label">Keep reading</span>' +
        '<span class="resume-title">' + resume.title + "</span>" + pips(resume, p.lastPage) + "</span>" +
        '<span class="resume-go" aria-hidden="true">▶</span>';
      tile.hidden = false;
    }

    var grid = document.getElementById("bookGrid");
    grid.innerHTML = "";
    ReadDen.BOOKS.forEach(function (book) {
      var progress = ReadDen.state.getBookProgress(book.id);
      var a = document.createElement("a");
      a.className = "book-tile";
      a.href = bookUrl(book);
      a.innerHTML =
        '<span class="book-cover">' + book.cover + "</span>" +
        '<span class="book-title">' + book.title + "</span>" +
        pips(book, progress.lastPage > 0 ? progress.lastPage : progress.completions > 0 ? book.pages.length : 0) +
        '<span class="book-status">' + statusLabel(progress) + "</span>";
      grid.appendChild(a);
    });
  }

  document.addEventListener("DOMContentLoaded", render);

  // Coming back with the back button restores the page from cache; redraw
  // so the book just read shows where it got to.
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) render();
  });

  window.ReadDen = ReadDen;
})();
