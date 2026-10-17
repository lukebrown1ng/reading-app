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
      title: "The Shy T-Rex",
      cover: "🦖",
      pages: [
        "The T-Rex was very shy.",
        "He hid behind the big rocks.",
        "The other dinosaurs looked for him.",
        "Where did the T-Rex go, they said.",
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
    },
    {
      id: "raptor",
      title: "The Clever Raptor",
      cover: "🦖",
      pages: [
        "A small raptor lived on a hill.",
        "Then one day, she saw some eggs.",
        "They were in a nest, but there was no mum.",
        "What should she do? She did not know.",
        "She sat on the eggs to keep them warm.",
        "This went on for three days and three nights.",
        "Then the eggs began to crack, one by one.",
        "Out came three baby dinos. They said hello."
      ]
    },
    {
      id: "whale",
      title: "The Big Blue Whale",
      cover: "🐋",
      pages: [
        "Deep in the sea lived a big blue whale.",
        "When the sun came up, she swam to the top.",
        "She sang a long, low song.",
        "The fish said, what a lovely sound.",
        "Then a little seal swam up to her.",
        "This is my friend, said the whale.",
        "They swam and they sang all day.",
        "Then they went down to sleep in the deep."
      ]
    },
    {
      id: "hedgehog",
      title: "Henry the Hedgehog",
      cover: "🦔",
      pages: [
        "Henry the hedgehog was out in the garden.",
        "He was looking for something to eat.",
        "There was a bug under a leaf.",
        "There was a worm in the mud.",
        "Then he heard a loud noise.",
        "Henry rolled up into a tight, spiky ball.",
        "It was only the cat. The cat went away.",
        "Then Henry came out and had his tea."
      ]
    },
    {
      id: "croc",
      title: "Crocodile Tea Time",
      cover: "🐊",
      pages: [
        "The crocodile sat by the river.",
        "He was hungry. He wanted his tea.",
        "A monkey came down to the water.",
        "What have you got in that bag, said the crocodile.",
        "These are my bananas, said the monkey.",
        "You can have one, if you ask nicely.",
        "The crocodile said, please can I have one.",
        "They sat and ate bananas in the sun."
      ]
    },
    {
      id: "penguin",
      title: "The Penguin Who Could Not Slide",
      cover: "🐧",
      pages: [
        "All the penguins slid on the ice.",
        "Whoosh, down the hill they went.",
        "But Pip could not slide. He kept falling over.",
        "When he fell, they did not laugh.",
        "Then a big penguin said, try this.",
        "Pip lay on his tummy and pushed.",
        "Off he went, all the way to the sea.",
        "Now Pip is the best slider of them all."
      ]
    },
    {
      id: "camp",
      title: "The Camping Trip",
      cover: "⛺",
      pages: [
        "We went camping in the woods.",
        "Dad put up the tent. I got the sticks.",
        "Then we made a fire and cooked our tea.",
        "When it got dark, we saw the stars.",
        "There was an owl in the tree above us.",
        "This is the best night ever, I said.",
        "Then we got into our warm sleeping bags.",
        "In the morning, the birds woke us up."
      ]
    },
    {
      id: "volcano",
      title: "The Little Volcano",
      cover: "🌋",
      pages: [
        "There was a little volcano on an island.",
        "It was a very grumpy volcano.",
        "Rumble, rumble, went its tummy.",
        "The dinosaurs said, what is that noise.",
        "Then, boom. Smoke came out of the top.",
        "They ran to the sea and hid behind some rocks.",
        "When it was all quiet, they came out.",
        "The volcano just said, sorry, I was hungry."
      ]
    },
    {
      id: "bees",
      title: "The Busy Bees",
      cover: "🐝",
      pages: [
        "The bees woke up when the sun came out.",
        "They flew from flower to flower.",
        "Buzz, buzz, buzz, went the bees.",
        "What are they doing, said the little girl.",
        "They are making honey, said her dad.",
        "Each bee brings a little bit back to the hive.",
        "Then all of the bees make it into honey.",
        "That night, we had honey on our toast."
      ]
    },
    {
      id: "snail",
      title: "Sid the Slow Snail",
      cover: "🐌",
      pages: [
        "Sid the snail was very, very slow.",
        "The other animals went past him fast.",
        "The hare said, come on, Sid, hurry up.",
        "But Sid did not hurry. He took his time.",
        "Then the rain came down. Sid kept going.",
        "The hare hid under a log and got wet.",
        "When the rain stopped, Sid was at the top.",
        "Slow and steady, said Sid. That is the way."
      ]
    },
    {
      id: "moon",
      title: "Fox and the Moon",
      cover: "🌙",
      pages: [
        "One night, a fox looked up at the moon.",
        "It was big, round and white.",
        "I want to touch it, said the fox.",
        "He ran up the hill, but it was still far.",
        "Then he climbed a tall tree. That was no good.",
        "An owl said, you cannot reach the moon.",
        "But there is one in the pond.",
        "The fox looked down. There was the moon, shining in the water."
      ]
    },
    {
      id: "shark",
      title: "The Tiny Shark",
      cover: "🦈",
      pages: [
        "The smallest shark in the sea was Sam.",
        "The big sharks said, you are too small to play.",
        "Sam went off by himself, down to the reef.",
        "Then he saw a fish stuck in a net.",
        "He was small, so he could get in and chew.",
        "Snip, snap, went the net. The fish was free.",
        "When the big sharks heard, they said sorry.",
        "After that, Sam played with them every day."
      ]
    },
    {
      id: "mammoth",
      title: "The Woolly Mammoth",
      cover: "🦣",
      pages: [
        "The woolly mammoth walked through the snow.",
        "It was cold, but she had a thick coat.",
        "Her baby walked close behind her.",
        "Then the wind began to blow and blow.",
        "The baby said, I am cold, Mum.",
        "The mammoth put her big woolly body in front.",
        "This kept the wind off him. He felt warm.",
        "They walked on until they got home."
      ]
    }
  ];

  ReadDen.getBook = function (id) {
    for (var i = 0; i < ReadDen.BOOKS.length; i++) {
      if (ReadDen.BOOKS[i].id === id) return ReadDen.BOOKS[i];
    }
    return null;
  };

  // Lower-case, apostrophes kept, everything else stripped: the form used to
  // compare a printed word with a spoken one.
  ReadDen.normalizeWord = function (word) {
    return word.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z']/g, "").replace(/^'+|'+$/g, "");
  };

  // Splits a page into tokens carrying what to display (with punctuation),
  // a normalized form for matching against speech recognition results, and
  // where the word starts in the page text (for narration highlighting).
  ReadDen.tokenizePage = function (text) {
    var tokens = [];
    var re = /\S+/g;
    var m;
    while ((m = re.exec(text))) {
      tokens.push({ display: m[0], norm: ReadDen.normalizeWord(m[0]), start: m.index });
    }
    return tokens;
  };

  window.ReadDen = ReadDen;
})();
