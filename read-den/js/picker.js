// Read Den — book picker: big covers, resumes each book where he left off.
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  function statusLabel(book) {
    var progress = ReadDen.state.getBookProgress(book.id);
    if (progress.opens === 0) return "start reading";
    if (progress.lastPage >= book.pages.length - 1) return "read again";
    return "keep reading";
  }

  function render() {
    var grid = document.getElementById("bookGrid");
    grid.innerHTML = "";
    ReadDen.BOOKS.forEach(function (book) {
      var a = document.createElement("a");
      a.className = "book-tile";
      a.href = "book.html?book=" + encodeURIComponent(book.id);
      a.innerHTML =
        '<span class="book-cover">' + book.cover + "</span>" +
        '<span class="book-title">' + book.title + "</span>" +
        '<span class="book-status">' + statusLabel(book) + "</span>";
      grid.appendChild(a);
    });
  }

  document.addEventListener("DOMContentLoaded", render);

  window.ReadDen = ReadDen;
})();
