/* script.js
 - Handles: index dropdown population (from manifest), loading paper list,
   launching test.html with proper query params.
 - On test.html: loads questions JSON, runs timer, marking, palette, language toggle,
   score calc, autosave to localStorage.
*/

/* ------------------- Utility ------------------- */
const $ = id => document.getElementById(id);
const q = sel => document.querySelector(sel);

function fetchJSON(path){ return fetch(path).then(r=>{ if(!r.ok) throw new Error('Fetch failed '+path); return r.json(); }); }
function shuffle(arr){ return arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]); }
function formatTime(s){ const m = Math.floor(s/60).toString().padStart(2,'0'); const ss = (s%60).toString().padStart(2,'0'); return `${m}:${ss}`; }

/* ------------------- Index Page Logic ------------------- */
if (document.body && document.querySelector('.exam-select')) {
  const examSelect = $('examSelect');
  const yearSelect = $('yearSelect');
  const loadBtn = $('loadBtn');
  const previewText = $('previewText');
  const paperList = $('paperList');
  const startTest = $('startTest');

  async function loadManifestFor(examKey){
    const manifestPath = `questions/${examKey}_manifest.json`;
    try {
      const manifest = await fetchJSON(manifestPath);
      return manifest; // { exam:..., years: [2010,2011,...], files: { "2010":"jee_main_2010.json" } }
    } catch(e){
      console.error(e);
      return null;
    }
  }

  async function populateYears(){
    const examKey = examSelect.value;
    const manifest = await loadManifestFor(examKey);
    yearSelect.innerHTML = '';
    if (!manifest || !manifest.years) {
      yearSelect.innerHTML = `<option value="">No years</option>`;
      return;
    }
    manifest.years.forEach(y=>{
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });
  }

  examSelect.addEventListener('change', populateYears);
  populateYears();

  loadBtn.addEventListener('click', async ()=>{
    const examKey = examSelect.value;
    const year = yearSelect.value;
    if (!year) { previewText.textContent = 'Select a year first.'; return; }
    const manifest = await loadManifestFor(examKey);
    if (!manifest) { previewText.textContent = 'No manifest found'; return; }
    const fileKey = `${examKey}_${year}.json`;
    if (!manifest.files || !manifest.files[fileKey]) {
      previewText.textContent = 'No file for selected year';
      paperList.innerHTML = '';
      startTest.href = '#';
      return;
    }
    previewText.textContent = `Loaded ${examKey} — ${year}`;
    // show basic info and first few questions preview
    try {
      const data = await fetchJSON(`questions/${fileKey}`);
      paperList.innerHTML = `<p>Questions in file: ${data.questions.length}</p>`;
      const ul = document.createElement('ul');
      data.questions.slice(0,6).forEach(q=>{
        const li = document.createElement('li');
        li.textContent = q.text.en;
        ul.appendChild(li);
      });
      paperList.appendChild(ul);
      startTest.href = `test.html?exam=${examKey}&year=${year}&file=${fileKey}`;
    } catch(e){
      previewText.textContent = 'Failed to load questions JSON (check path)';
      console.error(e);
    }
  });

  // open the first available test quickly
  startTest.addEventListener('click', (ev)=>{
    if (startTest.href === '#' || !startTest.href) { ev.preventDefault(); alert('Load a year first'); }
  });
}

/* ------------------- Test Page Logic ------------------- */
if (document.body && document.querySelector('.test-layout')) {
  // query params
  const params = new URLSearchParams(location.search);
  const examKey = params.get('exam');   // jee_main
  const year = params.get('year');      // 2018
  const file = params.get('file');      // optional explicit filename

  const examLabel = $('examLabel');
  if (examLabel) examLabel.textContent = (examKey ? `• ${examKey.replace('_',' ').toUpperCase()}` : '');

  const qTitle = $('qTitle'), qText = $('qText'), optionsForm = $('options');
  const paletteGrid = $('paletteGrid');
  const prevBtn = $('prevBtn'), nextBtn = $('nextBtn'), clearBtn = $('clearBtn'), markBtn = $('markBtn');
  const langBtn = $('langBtn'), submitBtn = $('submitBtn');
  const timerEl = $('timer');
  const resultModal = $('resultModal'), summaryEl = $('summary');

  let QUESTIONS = [], order = [], current = 0, lang = 'en', answers = [], marked = [], visited = [];
  let timerSec = 60 * 60, timerId = null; // default 60min

  function buildPalette(){
    paletteGrid.innerHTML = '';
    for(let i=0;i<QUESTIONS.length;i++){
      const btn = document.createElement('button');
      btn.className = 'qbtn not-visited';
      btn.id = `qbtn-${i}`;
      btn.textContent = i+1;
      btn.addEventListener('click', ()=> {
        current = order.indexOf(i);
        loadQuestion(current);
      });
      paletteGrid.appendChild(btn);
    }
  }

  function updatePaletteBtn(realIndex){
    const btn = $(`qbtn-${realIndex}`);
    if (!btn) return;
    btn.className = 'qbtn';
    if (!visited[realIndex]) { btn.classList.add('not-visited'); return; }
    if (marked[realIndex]) { btn.classList.add('marked'); return; }
    if (answers[realIndex] == null) btn.classList.add('not-answered'); else btn.classList.add('answered');
  }

  function highlightCurrent(idxInOrder){
    const all = paletteGrid.querySelectorAll('.qbtn'); all.forEach(b=>b.classList.remove('current'));
    const realIndex = order[idxInOrder];
    const btn = $(`qbtn-${realIndex}`); if (btn) btn.classList.add('current');
  }

  function loadQuestion(idxInOrder){
    if (idxInOrder < 0 || idxInOrder >= order.length) return;
    const real = order[idxInOrder];
    const q = QUESTIONS[real];
    qTitle.textContent = `Question ${idxInOrder+1}`;
    qText.textContent = q.text[lang];
    optionsForm.innerHTML = '';
    q.options[lang].forEach((opt,i)=>{
      const id = `opt-${real}-${i}`;
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type='radio'; input.name='opt'; input.value=i; input.id=id;
      if (answers[real] === i) input.checked = true;
      input.addEventListener('change', ()=> { answers[real] = i; updatePaletteBtn(real); autosave(); });
      label.appendChild(input);
      label.appendChild(document.createTextNode(opt));
      optionsForm.appendChild(label);
    });
    visited[real] = true;
    updatePaletteBtn(real);
    highlightCurrent(idxInOrder);
  }

  function clearResponse(){ const real = order[current]; answers[real]=null; const radios = optionsForm.querySelectorAll('input[type=radio]'); radios.forEach(r=>r.checked=false); updatePaletteBtn(real); autosave(); }
  function toggleMark(){ const real = order[current]; marked[real] = !marked[real]; markBtn.textContent = marked[real] ? 'Unmark' : 'Mark'; updatePaletteBtn(real); autosave(); }
  function nextQ(){ if (current < order.length-1){ current++; loadQuestion(current); } }
  function prevQ(){ if (current > 0){ current--; loadQuestion(current); } }
  function switchLang(){ lang = (lang==='en'?'hi':'en'); loadQuestion(current); autosave(); }
  function startTimer(){ timerEl.textContent = formatTime(timerSec); timerId = setInterval(()=>{ timerSec--; timerEl.textContent = formatTime(timerSec); if(timerSec<=0){ clearInterval(timerId); finishTest(); } },1000); }

  function finishTest(){
    // scoring +4/-1
    let correct=0, wrong=0, unattempted=0;
    for(let i=0;i<QUESTIONS.length;i++){
      if (answers[i] == null) { unattempted++; continue; }
      if (Number(answers[i]) === Number(QUESTIONS[i].answer)) correct++; else wrong++;
    }
    const score = correct*4 - wrong;
    summaryEl.innerHTML = `
      <p><strong>Total:</strong> ${QUESTIONS.length}</p>
      <p><strong>Answered:</strong> ${QUESTIONS.length - unattempted}</p>
      <p><strong>Correct:</strong> ${correct}</p>
      <p><strong>Wrong:</strong> ${wrong}</p>
      <p><strong>Unattempted:</strong> ${unattempted}</p>
      <p><strong>Score:</strong> ${score}</p>
    `;
    resultModal.classList.remove('hidden');
    autosave(true); // clear or keep as done
  }

  function autosave(final=false){
    try {
      const key = `muthongo_${examKey}_${year}`;
      const payload = { answers, marked, visited, order, current, lang, timerSec, final };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch(e){ console.warn('autosave failed', e); }
  }

  // wire buttons
  if (prevBtn) prevBtn.addEventListener('click', prevQ);
  if (nextBtn) nextBtn.addEventListener('click', ()=>{ /* save & next */ autosave(); nextQ(); });
  if (clearBtn) clearBtn.addEventListener('click', clearResponse);
  if (markBtn) markBtn.addEventListener('click', toggleMark);
  if (langBtn) langBtn.addEventListener('click', switchLang);
  if (submitBtn) submitBtn.addEventListener('click', ()=>{ if(confirm('Submit test?')){ clearInterval(timerId); finishTest(); }});

  // boot: load file (either explicit file param or manifest mapping)
  (async function boot(){
    try {
      let fileToLoad = file || `${examKey}_${year}.json`;
      // try fetch
      const data = await fetchJSON(`questions/${fileToLoad}`);
      // adopt duration from meta if present
      if (data.meta && data.meta.duration_min) timerSec = data.meta.duration_min * 60;
      QUESTIONS = data.questions;
      // prepare arrays
      const n = QUESTIONS.length;
      answers = Array(n).fill(null);
      marked = Array(n).fill(false);
      visited = Array(n).fill(false);
      // shuffled numbering for attempt
      order = shuffle([...Array(n).keys()]);
      buildPalette();
      // try resume from localStorage
      const saved = localStorage.getItem(`muthongo_${examKey}_${year}`);
      if (saved){
        const s = JSON.parse(saved);
        if (!s.final){
          // restore some state
          answers = s.answers || answers;
          marked = s.marked || marked;
          visited = s.visited || visited;
          order = s.order || order;
          current = s.current || 0;
          lang = s.lang || lang;
          timerSec = s.timerSec || timerSec;
        }
      }
      loadQuestion(current);
      startTimer();
    } catch(e){
      alert('Failed to load test JSON; ensure file exists: ' + e.message);
    }
  })();
}

