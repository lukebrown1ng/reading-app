// Read Den — book content. Short, dinosaur/animal/nature-themed pages at
// roughly a 5-6 year old reading level (plain high-frequency vocabulary,
// short sentences), for reading aloud with follow-along.
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  ReadDen.BOOKS = [
    {
      id: "stego",
      title: "The Grumpy Stegosaurus",
      cover: "🦕",
      pages: [
        "Stegosaurus stomped through the ferns.",
        "She was hungry. She wanted to eat.",
        "The other dinosaurs ran away fast.",
        "Stegosaurus just wanted a friend.",
        "A little dino came to say hello.",
        "Stegosaurus smiled and said, hello there."
      ]
    },
    {
      id: "cats",
      title: "Big Cat, Small Cat",
      cover: "🐱",
      pages: [
        "The big cat sat in the sun.",
        "The small cat wanted to play.",
        "They ran up the tree together.",
        "The big cat had a long tail.",
        "The small cat had a short tail.",
        "Both cats went home for tea."
      ]
    },
    {
      id: "pond",
      title: "Down by the Pond",
      cover: "🐸",
      pages: [
        "Down by the pond, a duck swam by.",
        "A frog sat on a big green leaf.",
        "The duck said, come and play with me.",
        "The frog jumped into the water.",
        "They splashed and had a lot of fun.",
        "Then they went home when the sun went down."
      ]
    },
    {
      id: "trex",
      title: "The Shy T. Rex",
      cover: "🦖",
      pages: [
        "The T. Rex was very shy.",
        "He hid behind the big rocks.",
        "The other dinosaurs looked for him.",
        "Where did the T. Rex go, they said.",
        "He came out and said, I am here.",
        "They all played together in the sun."
      ]
    }
  ];

  ReadDen.getBook = function (id) {
    for (var i = 0; i < ReadDen.BOOKS.length; i++) {
      if (ReadDen.BOOKS[i].id === id) return ReadDen.BOOKS[i];
    }
    return null;
  };

  // Splits a page into tokens carrying both what to display (with
  // punctuation) and a normalized form (lowercase, punctuation stripped)
  // used for matching against speech recognition results.
  ReadDen.tokenizePage = function (text) {
    var raw = text.split(/\s+/).filter(Boolean);
    return raw.map(function (word) {
      return {
        display: word,
        norm: word.toLowerCase().replace(/[^a-z']/g, "")
      };
    });
  };

  window.ReadDen = ReadDen;
})();
