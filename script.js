// ==== URL + Exam Label ====
const params = new URLSearchParams(location.search);
const examFile = params.get("exam"); // e.g., jee_main_2024
const examMap = {
  jee_main_2024: "JEE Mains 2024",
  jee_adv_2024: "JEE Advanced 2024",
  mhtcet_2024: "MHT-CET 2024",
};

const examLabel = document.getElementById("examLabel");
if (examLabel && examFile && examMap[examFile]) {
  examLabel.textContent = "• " + examMap[examFile];
}

// ==== Global State ====
let QUESTIONS = [];            // loaded from JSON
let order = [];                // shuffled index order
let current = 0;               // pointer in order
let lang = "en";               // "en" or "hi"
let answers = [];              // selected option index or null
let marked = [];               // boolean
let visited = [];              // boolean
let timerSec = 60 * 60;        // 60 minutes
let timerId = null;

// ==== DOM ====
const qTitle = document.getElementById("qTitle");
const qText = document.getElementById("qText");
const optionsForm = document.getElementById("options");
const paletteGrid = document.getElementById("paletteGrid");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const clearBtn = document.getElementById("clearBtn");
const markBtn = document.getElementById("markBtn");
const langBtn = document.getElementById("langBtn");
const submitBtn = document.getElementById("submitBtn");

const timerEl = document.getElementById("timer");
const resultModal = document.getElementById("resultModal");
const summaryEl = document.getElementById("summary");

// ==== Helpers ====
const shuffle = (arr) => arr.map(v => [Math.random(), v])
  .sort((a,b)=>a[0]-b[0]).map(x => x[1]);

function formatTime(s){
  const m = Math.floor(s/60).toString().padStart(2,"0");
  const ss = (s%60).toString().padStart(2,"0");
  return `${m}:${ss}`;
}

function startTimer(){
  timerEl.textContent = formatTime(timerSec);
  timerId = setInterval(()=>{
    timerSec--;
    timerEl.textContent = formatTime(timerSec);
    if (timerSec <= 0){
      clearInterval(timerId);
      finishTest();
    }
  },1000);
}

function loadQuestion(idxInOrder){
  const qIndex = order[idxInOrder];
  const q = QUESTIONS[qIndex];

  qTitle.textContent = `Question ${idxInOrder+1}`;
  qText.textContent = q.text[lang];

  // build options
  optionsForm.innerHTML = "";
  q.options[lang].forEach((opt, i)=>{
    const id = `opt${i}`;
    const label = document.createElement("label");
    label.setAttribute("for", id);
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "opt";
    input.id = id;
    input.value = i;
    if (answers[qIndex] === i) input.checked = true;
    input.addEventListener("change", ()=>{
      answers[qIndex] = i;
      updatePaletteBtn(qIndex);
    });

    label.appendChild(input);
    label.appendChild(document.createTextNode(opt));
    optionsForm.appendChild(label);
  });

  visited[qIndex] = true;
  updatePaletteBtn(qIndex);
  highlightCurrent(idxInOrder);
}

function highlightCurrent(idxInOrder){
  // remove previous current
  const all = paletteGrid.querySelectorAll(".qbtn");
  all.forEach(btn => btn.classList.remove("current"));
  // add current
  const currentBtn = document.getElementById(`qbtn-${order[idxInOrder]}`);
  if (currentBtn) currentBtn.classList.add("current");
}

function updatePaletteBtn(qIndex){
  const btn = document.getElementById(`qbtn-${qIndex}`);
  if (!btn) return;

  // reset classes
  btn.className = "qbtn";
  if (!visited[qIndex]) {
    btn.classList.add("not-visited");
    return;
  }
  if (marked[qIndex]) {
    btn.classList.add("marked");
  } else if (answers[qIndex] == null) {
    btn.classList.add("not-answered");
  } else {
    btn.classList.add("answered");
  }
}

function buildPalette(n){
  paletteGrid.innerHTML = "";
  for (let i=0;i<n;i++){
    const realIndex = i; // index into QUESTIONS
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = `qbtn-${realIndex}`;
    btn.className = "qbtn not-visited";
    btn.textContent = (order.indexOf(realIndex)+1); // palette shows current numbering
    btn.addEventListener("click", ()=>{
      current = order.indexOf(realIndex);
      loadQuestion(current);
    });
    paletteGrid.appendChild(btn);
  }
}

function clearResponse(){
  const qIndex = order[current];
  answers[qIndex] = null;
  // uncheck radios
  const radios = optionsForm.querySelectorAll('input[type="radio"]');
  radios.forEach(r => r.checked = false);
  updatePaletteBtn(qIndex);
}

function toggleMark(){
  const qIndex = order[current];
  marked[qIndex] = !marked[qIndex];
  updatePaletteBtn(qIndex);
  markBtn.textContent = marked[qIndex] ? "Unmark" : "Mark for Review";
}

function next(){
  if (current < order.length-1){
    current++;
    loadQuestion(current);
  }
}

function prev(){
  if (current > 0){
    current--;
    loadQuestion(current);
  }
}

function switchLanguage(){
  lang = (lang === "en") ? "hi" : "en";
  loadQuestion(current);
}

function finishTest(){
  // Calculate score: +4 correct, -1 incorrect, 0 unattempted
  let correct=0, wrong=0, unattempted=0;
  QUESTIONS.forEach((q, i)=>{
    if (answers[i] == null) { unattempted++; return; }
    if (Number(answers[i]) === Number(q.answer)) correct++;
    else wrong++;
  });
  const score = correct*4 - wrong*1;

  summaryEl.innerHTML = `
    <p><strong>Total Questions:</strong> ${QUESTIONS.length}</p>
    <p><strong>Answered:</strong> ${QUESTIONS.length - unattempted}</p>
    <p><strong>Correct:</strong> ${correct}</p>
    <p><strong>Wrong:</strong> ${wrong}</p>
    <p><strong>Unattempted:</strong> ${unattempted}</p>
    <p><strong>Score (JEE scheme +4/−1):</strong> ${score}</p>
  `;
  resultModal.classList.remove("hidden");
}

// ==== Wire Up Buttons (only if on test page) ====
if (prevBtn) prevBtn.addEventListener("click", prev);
if (nextBtn) nextBtn.addEventListener("click", next);
if (clearBtn) clearBtn.addEventListener("click", clearResponse);
if (markBtn) markBtn.addEventListener("click", toggleMark);
if (langBtn) langBtn.addEventListener("click", switchLanguage);
if (submitBtn) submitBtn.addEventListener("click", ()=>{
  if (confirm("Are you sure you want to submit the test?")) {
    clearInterval(timerId);
    finishTest();
  }
});

// ==== Boot: Load Questions JSON ====
(async function boot(){
  if (!examFile) return; // on home page
  try{
    const resp = await fetch(`questions/${examFile}.json`);
    const data = await resp.json();
    QUESTIONS = data.questions;

    // Init state arrays
    const n = QUESTIONS.length;
    answers = Array(n).fill(null);
    marked  = Array(n).fill(false);
    visited = Array(n).fill(false);

    // shuffled order for numbering
    order = shuffle([...Array(n).keys()]);

    buildPalette(n);
    loadQuestion(current);
    startTimer();
  }catch(e){
    console.error("Failed to load questions:", e);
    alert("Could not load test. Check JSON path/naming.");
  }
})();
