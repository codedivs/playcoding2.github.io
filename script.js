// ==================== script.js – FINAL MOBILE-FRIENDLY VERSION ====================

const questionPad = document.getElementById('question_pad');
const answerPad = document.getElementById('answer_pad');
const questionAnswers = document.getElementById('question_answers');
const timerDisplay = document.getElementById('timer');
const resultDiv = document.getElementById('result');
const scoreDisplay = document.getElementById('score');
const totalTimeDisplay = document.getElementById('total_time');
const retryBtn = document.getElementById('retry_btn');
const cancelBtn = document.getElementById('cancel_btn');
const startScreen = document.getElementById('start_screen');
const startBtn = document.getElementById('start_btn');
const quitBtn = document.getElementById('quit_btn');

let allQuestions = [], selectedQuestions = [], curIdx = 0, curQ = null;
let correctCount = 0, startTime = 0, intervalId = null, isQuizActive = false;
let quizData = null;

// Detect mobile
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
document.body.classList.toggle('mobile', isMobile);

// Allow scrolling on start screen only
function enableScroll() {
  document.documentElement.style.overflowY = 'auto';
  document.body.style.overflowY = 'auto';
}
function disableScroll() {
  document.documentElement.style.overflowY = 'hidden';
  document.body.style.overflowY = 'hidden';
}
enableScroll();

// Add Help Button if not exists
if (!document.getElementById('help_btn')) {
  startScreen.insertAdjacentHTML('beforeend', `
    <button id="help_btn" title="How to play">?</button>
  `);
}

// Language & Difficulty selection
document.querySelectorAll('.select-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    document.querySelectorAll(`[data-type="${type}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Fetch questions
fetch('questions.json')
  .then(r => r.ok ? r.json() : Promise.reject('Failed to load questions.json'))
  .then(data => {
    quizData = data;
    questionPad.textContent = 'Ready to code? Choose and tap Start!';
  })
  .catch(err => {
    questionPad.textContent = 'Error loading questions. Check questions.json';
    console.error(err);
  });

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showStartScreen() {
  isQuizActive = false;
  stopTimer();
  timerDisplay.style.display = 'none';
  startScreen.style.display = 'block';
  resultDiv.style.display = 'none';
  questionPad.textContent = 'Ready to code? Choose and tap Start!';
  answerPad.innerHTML = '';
  questionAnswers.innerHTML = '';
  enableScroll();
}

function startQuiz() {
  if (!quizData) {
    alert('Questions not loaded yet. Try again in a second.');
    return;
  }

  const selectedLang = document.querySelector('[data-type="lang"].active')?.dataset.value || 'python';
  const selectedDiff = document.querySelector('[data-type="diff"].active')?.dataset.value || 'easy';

  allQuestions = quizData[selectedLang]?.[selectedDiff] || [];
  if (allQuestions.length < 20) {
    alert(`Not enough questions for ${selectedLang} ${selectedDiff}!`);
    return;
  }

  selectedQuestions = shuffle(allQuestions).slice(0, 20);
  curIdx = 0;
  correctCount = 0;
  startTime = Date.now();
  isQuizActive = true;

  answerPad.innerHTML = '';
  questionAnswers.innerHTML = '';
  resultDiv.style.display = 'none';
  startScreen.style.display = 'none';
  timerDisplay.style.display = 'block';
  disableScroll();
  startTimer();
  loadQuestion(0);
}

function startTimer() {
  if (intervalId) clearInterval(intervalId);
  const quizStart = Date.now();
  intervalId = setInterval(() => {
    const secs = Math.floor((Date.now() - quizStart) / 1000);
    timerDisplay.textContent = `Time: ${secs}s`;
  }, 1000);
}

function stopTimer() {
  if (intervalId) clearInterval(intervalId);
}

function loadQuestion(idx) {
  if (idx >= selectedQuestions.length || !isQuizActive) {
    endQuiz();
    return;
  }

  curQ = selectedQuestions[idx];
  questionPad.textContent = curQ.question;
  answerPad.innerHTML = '';
  questionAnswers.innerHTML = '';

  // Create answer blocks
  curQ.answers.forEach((txt, i) => {
    const block = document.createElement('div');
    block.className = 'answer-block';
    block.textContent = txt;
    block.dataset.idx = i;

    if (isMobile) {
      block.style.cursor = 'pointer';
      block.addEventListener('click', handleTap);
    } else {
      block.draggable = true;
      block.addEventListener('dragstart', dragStart);
      block.addEventListener('dragend', () => block.classList.remove('dragging'));
    }
    answerPad.appendChild(block);
  });

  // Create slots
  for (let i = 0; i < curQ.answer_divs; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.placeholder = `Slot ${i + 1}`;
    slot.dataset.slot = i;
    if (!isMobile) {
      slot.addEventListener('dragover', e => e.preventDefault());
      slot.addEventListener('drop', drop);
    }
    questionAnswers.appendChild(slot);
  }

  if (!isMobile) {
    answerPad.addEventListener('dragover', e => e.preventDefault());
    answerPad.addEventListener('drop', e => drop(e, true));
  }
}

// Mobile: Tap to place/remove
function handleTap(e) {
  e.preventDefault();
  const block = e.currentTarget;

  // Visual feedback
  block.style.transform = 'scale(0.92)';
  setTimeout(() => block.style.transform = '', 150);

  // If already in a slot → return to pad
  if (block.parentElement.classList.contains('slot')) {
    answerPad.appendChild(block);
    checkIfComplete();
    return;
  }

  // Place in next empty slot
  const emptySlot = questionAnswers.querySelector('.slot:not(:has(.answer-block))');
  if (emptySlot) {
    emptySlot.innerHTML = '';
    emptySlot.appendChild(block);
    checkIfComplete();
  }
}

function checkIfComplete() {
  if (questionAnswers.querySelectorAll('.slot .answer-block').length === curQ.answer_divs) {
    setTimeout(checkAnswerAndProceed, 600);
  }
}

// Desktop drag & drop
function dragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.dataset.idx);
  e.target.classList.add('dragging');
}

function drop(e, toAnswerPad = false) {
  if (isMobile || !isQuizActive) return;
  e.preventDefault();
  const idx = e.dataTransfer.getData('text/plain');
  const block = document.querySelector(`.answer-block[data-idx="${idx}"]`);
  if (!block) return;

  block.classList.remove('dragging');

  if (toAnswerPad || !e.target.closest('.slot')) {
    answerPad.appendChild(block);
    return;
  }

  const slot = e.target.closest('.slot');
  if (!slot || slot.hasChildNodes()) return;

  slot.innerHTML = '';
  slot.appendChild(block);
  checkIfComplete();
}

function checkAnswerAndProceed() {
  const userOrder = Array.from(questionAnswers.querySelectorAll('.slot')).map(slot => {
    const b = slot.querySelector('.answer-block');
    return b ? +b.dataset.idx : -1;
  });

  if (JSON.stringify(userOrder) === JSON.stringify(curQ.correct_order)) {
    correctCount++;
    curIdx++;
    setTimeout(() => loadQuestion(curIdx), 500);
  } else {
    questionAnswers.classList.add('shake');
    setTimeout(() => {
      questionAnswers.classList.remove('shake');
      questionAnswers.querySelectorAll('.answer-block').forEach(b => answerPad.appendChild(b));
      questionAnswers.querySelectorAll('.slot').forEach(s => s.innerHTML = '');
    }, 700);
  }
}

function endQuiz() {
  if (!isQuizActive) return;
  isQuizActive = false;
  stopTimer();
  disableScroll();

  const total = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;

  scoreDisplay.textContent = `Score: ${correctCount} / 20`;
  totalTimeDisplay.textContent = `Time: ${m}m ${s}s`;
  resultDiv.style.display = 'block';
  questionPad.textContent = 'Quiz Complete!';
  timerDisplay.style.display = 'none';
  enableScroll();
}

// Custom Confirm Dialog
async function customConfirm(html = 'Confirm?') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;justify-content:center;align-items:center;z-index:9999;';
    overlay.innerHTML = `
      <div style="background:#0c121c;padding:24px 36px;border-radius:16px;text-align:center;max-width:90%;box-shadow:0 0 30px rgba(20,255,236,0.5);color:#d4d4d4;">
        <div style="line-height:1.6;margin-bottom:20px;">${html}</div>
        <button id="yes_btn" style="background:#14ffec;color:#0b0f19;padding:12px 28px;border:none;border-radius:12px;margin:0 10px;font-size:1.1rem;">Yes</button>
        <button id="no_btn" style="background:#ff416c;color:white;padding:12px 28px;border:none;border-radius:12px;margin:0 10px;font-size:1.1rem;">No</button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#yes_btn').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#no_btn').onclick = () => { overlay.remove(); resolve(false); };
  });
}

function showHelp() {
  const msg = isMobile
    ? 'Tap a code block to place it in the next empty slot.<br><br>Tap a placed block to remove it.'
    : 'Drag & drop code blocks into the correct order.<br><br>On mobile: just tap!';
  customConfirm(`
    <h3 style="color:#14ffec;margin-bottom:16px;">How to Play</h3>
    <p>${msg}</p>
    <p style="margin-top:16px;font-size:0.9rem;color:#8b9bb4;">Arrange the code correctly!</p>
  `);
}

function showGoodbyeScreen() {
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100dvh;color:#14ffec;background:radial-gradient(circle at 20% 20%, #0b0f19 0%, #02060f 100%);text-align:center;padding:20px;">
      <h2 style="font-size:2.8rem;margin-bottom:20px;">Thanks for playing!</h2>
      <p style="font-size:1.4rem;margin-bottom:30px;">Come back soon!</p>
      <button onclick="location.reload()" style="padding:16px 36px;background:linear-gradient(90deg,#14ffec,#0d7377);color:#0b0f19;border:none;border-radius:16px;font-size:1.3rem;cursor:pointer;">
        Play Again
      </button>
    </div>
  `;
}

// Event Listeners
startBtn.onclick = startQuiz;
retryBtn.onclick = startQuiz;
cancelBtn.onclick = async () => {
  if (await customConfirm('Restart quiz and go back to start?')) {
    showStartScreen();
  }
};
quitBtn.onclick = async () => {
  if (await customConfirm('Really quit the game?')) {
    showGoodbyeScreen();
  }
};
document.getElementById('help_btn')?.addEventListener('click', showHelp);

// Init
showStartScreen();
