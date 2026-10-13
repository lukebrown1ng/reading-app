// Spelling Den — one example sentence per word, spoken by the "hear it in
// a sentence" button. Used by scripts/generate-audio.js to render the
// pre-made audio clips (audio/<word>-sentence.mp3), so edit a sentence
// here and re-run the script with --force <word> to regenerate it.
// Homophones (week 5) get sentences that make the meaning clear.
var SpellDen = window.SpellDen || {};

SpellDen.SENTENCES = {
  // Week 1
  eight: "My brother is eight years old.",
  eighth: "She came eighth in the race.",
  eighty: "My grandad is eighty years old.",
  weight: "The weight of the bag made it hard to carry.",
  neighbour: "Our neighbour has a friendly dog.",
  vein: "The nurse found a vein in my arm.",
  veil: "The bride wore a long white veil.",
  beige: "The sofa is a soft beige colour.",
  sleigh: "Santa's sleigh is pulled by reindeer.",
  freight: "The freight train carried goods across the country.",

  // Week 2
  hey: "Hey, wait for me!",
  they: "They went to the park after school.",
  obey: "A good dog will obey its owner.",
  grey: "The sky was grey and full of clouds.",
  prey: "The owl swooped down on its prey.",
  whey: "Whey is the watery part of milk left over when cheese is made.",
  survey: "We did a survey to find our class's favourite fruit.",
  convey: "A smile can convey that you are happy.",
  disobey: "It is unwise to disobey the rules.",
  purvey: "The shop will purvey food to the whole village.",

  // Week 3
  straight: "Draw a straight line with your ruler.",
  campaign: "They started a campaign to keep the park clean.",
  contain: "This box can contain all of my toys.",
  brain: "Your brain helps you think and learn.",
  faint: "I could hear a faint noise in the distance.",
  waist: "He tied the rope around his waist.",
  claim: "You can claim your prize at the front desk.",
  praise: "The teacher gave us praise for our hard work.",
  complaint: "She made a complaint about the noisy neighbours.",
  afraid: "The little mouse was afraid of the cat.",

  // Week 4
  earth: "The earth goes around the sun.",
  early: "We got up early to catch the train.",
  learn: "I want to learn how to play the piano.",
  heard: "I heard the bell ring.",
  earn: "You can earn pocket money by doing jobs.",
  pearl: "She wore a shiny pearl on a necklace.",
  search: "We had to search the house for my lost shoe.",
  unearth: "The diggers began to unearth the buried treasure.",
  earl: "The earl lived in a big castle.",
  rehearse: "The actors rehearse their lines before the show.",

  // Week 5 (homophones)
  here: "Come over here and sit next to me.",
  hear: "I can hear birds singing in the trees.",
  heel: "I have a blister on my heel.",
  heal: "A cut will heal in a few days.",
  main: "The main road was very busy.",
  mane: "The lion shook his golden mane.",
  mail: "The postman brought the mail this morning.",
  male: "The male peacock has colourful feathers.",
  knot: "I tied a knot in the rope.",
  not: "I am not hungry right now.",

  // Week 6 (homophones)
  berry: "I picked a juicy red berry from the bush.",
  bury: "The dog likes to bury his bone in the garden.",
  brake: "Squeeze the brake to stop your bike.",
  break: "Be careful not to break the glass.",
  meet: "I will meet you at the school gate.",
  meat: "We had meat and vegetables for dinner.",
  ball: "He kicked the ball over the fence.",
  bawl: "The baby began to bawl when she dropped her toy.",
  fair: "It is not fair to push in line.",
  fare: "The bus fare was two pounds."
};

window.SpellDen = SpellDen;
