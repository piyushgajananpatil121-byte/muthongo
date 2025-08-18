// script.js - load questions from /questions/
// NOTE: make sure question JSON files exist in /questions/ folder with the filenames below.

const examFiles = [
  // JEE Main 2025 shifts (example filenames)
  { id: 'jee_main_2025_shift1', name: 'JEE Main 2025 — Shift 1', file: 'jee_main_2025_shift1.json' },
  { id: 'jee_main_2025_shift2', name: 'JEE Main 2025 — Shift 2', file: 'jee_main_2025_shift2.json' },
  { id: 'jee_main_2025_shift3', name: 'JEE Main 2025 — Shift 3', file: 'jee_main_2025_shift3.json' },

  // JEE Advanced 2025 both papers
  { id: 'jee_adv_2025_paper1', name: 'JEE Advanced 2025 — Paper 1', file: 'jee_adv_2025_paper1.json' },
  { id: 'jee_adv_2025_paper2', name: 'JEE Advanced 2025 — Paper 2', file: 'jee_adv_2025_paper2.json' },

  // MHT CET 2025 single shift
  { id: 'mhtcet_2025', name: 'MHT-CET 2025', file: 'mhtcet_2025.json' }
];

const examSelect = document.getElementById('examSelect');
const loadBtn = document.getElementById('loadBtn');
const downloadBtn = document.getElementById('downloadBtn');
const questionsArea = document.getElementById('questionsArea');

function populateExamDropdown(){
  examFiles.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.file;
    opt.textContent = e.name;
    examSelect.appendChild(opt);
  });
}

async function loadQuestions(filename){
  questionsArea.innerHTML = `<p class="hint">Loading ${filename} …</p>`;
  try {
    const res = await fetch(`questions/${filename}`);
    if(!res.ok) throw new Error('Not found or network issue: ' + res.status);
    const data = await res.json();
    renderQuestions(data, filename);
  } catch(err){
    questionsArea.innerHTML = `<p class="hint">Error: ${err.message}</p>`;
  }
}

function renderQuestions(data, filename){
  // expected data: array of {id?, question: string, options?:[], answer?:string, meta?:{section, marks}}
  if(!Array.isArray(data)){
    questionsArea.innerHTML = `<p class="hint">Invalid file format — expected JSON array of questions.</p>`;
    return;
  }
  questionsArea.innerHTML = '';
  data.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'qcard';
    const meta = document.createElement('div');
    meta.className = 'qmeta';
    meta.textContent = `#${i+1} ${q.meta?.section ? `| ${q.meta.section}` : ''} ${q.meta?.marks ? `| ${q.meta.marks} marks` : ''}`;
    const qtext = document.createElement('div');
    qtext.className = 'qtext';
    qtext.textContent = q.question || '[No question text]';

    card.appendChild(meta);
    card.appendChild(qtext);

    if(Array.isArray(q.options)){
      q.options.forEach(opt => {
        const d = document.createElement('div');
        d.className = 'choice';
        d.textContent = opt;
        card.appendChild(d);
      });
    }

    if(q.answer){
      const ans = document.createElement('div');
      ans.className = 'qmeta';
      ans.style.marginTop = '8px';
      ans.textContent = `Answer: ${q.answer}`;
      card.appendChild(ans);
    }

    questionsArea.appendChild(card);
  });
}

function downloadCurrentJSON(){
  const filename = examSelect.value;
  if(!filename){ alert('Select an exam first'); return; }
  const url = `questions/${filename}`;
  fetch(url)
    .then(r => {
      if(!r.ok) throw new Error('Not found');
      return r.blob();
    })
    .then(blob => {
      const a = document.createElement('a');
      const u = URL.createObjectURL(blob);
      a.href = u;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(u);
    })
    .catch(e => alert('Download failed: ' + e.message));
}

loadBtn.addEventListener('click', () => {
  const fname = examSelect.value;
  if(!fname){ alert('Choose an exam'); return; }
  loadQuestions(fname);
});

downloadBtn.addEventListener('click', downloadCurrentJSON);

populateExamDropdown();


