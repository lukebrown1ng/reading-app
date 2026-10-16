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
    },
    {
      id: "fox",
      title: "The Little Fox",
      cover: "🦊",
      pages: [
        "A little fox lived in a den.",
        "One night she went out to look for food.",
        "The moon was big and bright.",
        "She saw a mouse run by.",
        "The fox did not chase the mouse. She said hello.",
        "Then she went back to her den to sleep."
      ]
    },
    {
      id: "rain",
      title: "Rain, Rain, Go Away",
      cover: "🌧️",
      pages: [
        "The rain came down on the hill.",
        "Drip, drop, drip, drop.",
        "A snail came out to play in it.",
        "The birds hid in the tree.",
        "Then the sun came out. Look, a rainbow.",
        "Now everyone was happy."
      ]
    },
    {
      id: "ptero",
      title: "Pterodactyl's Big Day",
      cover: "🦅",
      pages: [
        "Pterodactyl woke up very early.",
        "Today she was going to fly high.",
        "She jumped off the tall cliff.",
        "The wind lifted her up and up.",
        "She could see the whole land below.",
        "It was the best day ever."
      ]
    },
    {
      id: "farm",
      title: "Night on the Farm",
      cover: "🐄",
      pages: [
        "It was night on the farm.",
        "The cow was asleep in the barn.",
        "The pigs were asleep in the mud.",
        "But the owl was awake in the tree.",
        "Who, who, said the owl.",
        "Then the sun came up and the farm woke up."
      ]
    },
    {
      id: "bear",
      title: "The Sleepy Bear",
      cover: "🐻",
      pages: [
        "The bear was so sleepy.",
        "He had eaten a lot of berries.",
        "He found a warm cave in the hill.",
        "He made a bed of soft leaves.",
        "Snow fell outside, but he did not mind.",
        "The bear slept all winter long."
      ]
    },
    {
      id: "beach",
      title: "A Day at the Beach",
      cover: "🏖️",
      pages: [
        "We went to the beach in the car.",
        "The sand was hot and the sea was blue.",
        "I made a big sand castle.",
        "A crab walked right up to it.",
        "I gave him a shell for his house.",
        "Then we had ice cream and went home."
      ]
    },
    {
      id: "egg",
      title: "The Lost Egg",
      cover: "🥚",
      pages: [
        "A dinosaur egg rolled down the hill.",
        "Mum looked here and there for it.",
        "It was not in the ferns. It was not by the lake.",
        "Then she heard a tap, tap, tap.",
        "The egg was by a log, and it was starting to crack.",
        "Out came a tiny baby dino. Mum gave her a big hug."
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
