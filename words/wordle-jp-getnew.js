const fs = require("fs");

let prevWordsStr = fs.readFileSync("words/jp-words-5-filtered.txt", "utf8");
let prevWordsArr = prevWordsStr.split(/\r?\n/);
let prevWords = new Set();
prevWordsArr.forEach(word => {
  if (word.startsWith(".")) word = word.substr(1);
  prevWords.add(word);
});

let newWordsStr = fs.readFileSync("words/wordle-jp-5-filter1.txt", "utf8");
let newWordsArr = newWordsStr.split(/\r?\n/);
let out = "";
for (const word of newWordsArr) {
  if (prevWords.has(word)) continue;
  out += word + "\n";
}
fs.writeFileSync("words/wordle-jp-5-filter2.txt", out);
