const fs = require("fs");
const path = require("path");
const md5 = require('md5')

let puzzleStart = [
  "uwwwu",
];

async function getHash(fn) {
  let content = await fs.promises.readFile(fn, "utf8");
  return md5(content);
}

function mulberry32(seed) {
  return function () {
    var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const rand = mulberry32(43);

function shuffle(array) {
  var currentIndex = array.length, randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(rand() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function buildWordsJs(pws, ows) {
  return `let puzzleWords = [
${pws}
];
let otherWords = [
${ows}
];

export {puzzleWords, otherWords};
`;
}

function shiftStr(str) {
  let res = "";
  for (let i = 0; i < str.length; ++i) {
    let cp = str.charCodeAt(i);
    res += String.fromCodePoint(cp + 1);
  }
  return res;
}

async function prepWords() {
  // First set of words
  let wordsAll = await fs.promises.readFile("words/jp-words-5-filtered.txt", "utf8");
  let words = wordsAll.split(/\r?\n/);
  // Second set of words
  let newWordsAll = await fs.promises.readFile("words/wordle-jp-5-filter2.txt", "utf8");
  let newWords = newWordsAll.split(/\r?\n/);
  words.push(...newWords);

  words = shuffle(words);
  let pws = "", ows = "";

  // First append puzzle start. Those words were already used, we don't want to rewrite the past.
  let pwSet = new Set();
  for (const w of puzzleStart) {
    pws += '"' + w + '",\n';
    pwSet.add(w);
  }

  for (const w of words) {
    if (w == "") continue;
    if (w.startsWith(".")) ows += '"' + shiftStr(w.substr(1)) + '",\n';
    else {
      let wshift = shiftStr(w);
      if (pwSet.has(wshift)) continue;
      pws += '"' + wshift + '",\n';
      pwSet.add(wshift);
    }
  }
  let wordsJs = buildWordsJs(pws, ows);
  await fs.promises.writeFile("words/words.js", wordsJs);
}

exports = (options = {}) => {
  return {
    name: 'customTasks',
    setup(build) {

      // In production build, just exclude everything ending in "test.js"
      if (options.prod) {
        build.onLoad({filter: /.*test\.js/}, async (args) => {
          console.log(args.path);
          return {contents: ''};
        });
      }

      // Before build, prepare word lists; clean up maps in target folder
      build.onStart(async () => {
        if (!options.prod) return;
        await prepWords();
        try { fs.unlinkSync("public/app.js.map"); } catch {}
        try { fs.unlinkSync("public/app.css.map"); } catch {}
      });
      
      // When build is done, infuse cache busting hashes in index.html,
      // and also save them in version.html
      build.onEnd(async result => {
        let appJsHash = await getHash("public/app.js");
        let appCssHash = await getHash("public/app.css");
        let indexHtml = await fs.promises.readFile("index.html", "utf8");
        if (options.prod) {
          indexHtml = indexHtml.replace("./app.js", "./app.js?v=" + appJsHash);
          indexHtml = indexHtml.replace("./app.css", "./app.css?v=" + appCssHash);
          indexHtml = indexHtml.replace(/<!--LiveReload-->.*<!--LiveReload-->/is, "");
        }
        await fs.promises.writeFile("public/index.html", indexHtml);
        let hashesTogether = appJsHash + "\n" + appCssHash;
        if (hashesTogether.length != 65) throw "wrong combined hash length";
        await fs.promises.writeFile("public/version.html", hashesTogether);
      });
    }
  };
}
module.exports = exports;
