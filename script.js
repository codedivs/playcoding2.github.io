// ==================== script.js – FULL & FINAL VERSION ====================
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
let isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
// Auto add Help Button + Mobile Class
document.body.classList.toggle('mobile', isMobile);
if (!document.getElementById('help_btn')) {
  startScreen.insertAdjacentHTML('beforeend', `
    <button id="help_btn" title="How to play">?</button>
  `);
}
// Select buttons event listeners
const selectBtns = document.querySelectorAll('.select-btn');
selectBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    document.querySelectorAll(`[data-type="${type}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});
// Add this new global
let quizData = null;  // Store fetched questions here
// Fetch questions
fetch('questions.json')
  .then(r => r.ok ? r.json() : Promise.reject('Failed to load'))
  .then(data => {
    quizData = data;  // Assign to global
    showStartScreen();  // No need to pass data anymore
  })
  .catch(err => {
    questionPad.textContent = 'Error: ' + err;
    console.error(err);
  });
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function showStartScreen() {
  isQuizActive = false; stopTimer(); timerDisplay.style.display = 'none';
  startScreen.style.display = 'block'; resultDiv.style.display = 'none';
  questionPad.textContent = 'You ready to code? Have fun.';
  answerPad.innerHTML = ''; questionAnswers.innerHTML = '';
  // Pre-select defaults
  document.querySelector('[data-type="lang"][data-value="python"]').classList.add('active');
  document.querySelector('[data-type="diff"][data-value="easy"]').classList.add('active');
}
function startQuiz() {
  const selectedLang = document.querySelector('[data-type="lang"].active')?.dataset.value || 'python';
  const selectedDiff = document.querySelector('[data-type="diff"].active')?.dataset.value || 'easy';
  allQuestions = quizData?.[selectedLang]?.[selectedDiff] || [];  // Use quizData here
  if (allQuestions.length < 20) { alert('Not enough questions for this selection!'); return; }
  selectedQuestions = shuffle([...allQuestions]).slice(0, 20);
  curIdx = 0; correctCount = 0; startTime = Date.now(); isQuizActive = true;
  answerPad.innerHTML = ''; questionAnswers.innerHTML = '';
  resultDiv.style.display = 'none'; startScreen.style.display = 'none';
  timerDisplay.style.display = 'block';
  startTimer();
  loadQuestion(0);
}
function startTimer() {
  if (intervalId) clearInterval(intervalId);
  const qTime = Date.now();
  intervalId = setInterval(() => {
    const secs = Math.floor((Date.now() - qTime) / 1000);
    timerDisplay.textContent = `Time: ${secs}s`;
  }, 1000);
}
function stopTimer() { if (intervalId) clearInterval(intervalId); }
function loadQuestion(idx) {
  if (idx >= selectedQuestions.length || !isQuizActive) { endQuiz(); return; }
  curQ = selectedQuestions[idx];
  questionPad.textContent = curQ.question;
  answerPad.innerHTML = ''; questionAnswers.innerHTML = '';
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
    slot.dataset.placeholder = `Drop answer ${i + 1} here`;
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
// Mobile: Tap to place / remove
function handleTap(e) {
  e.preventDefault();
  const block = e.currentTarget;
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
    setTimeout(checkAnswerAndProceed, 500);
  }
}
// Desktop: Drag & Drop
function dragStart(e) {
  if (isMobile) return;
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
    document.querySelectorAll('.slot').forEach(s => { if (!s.hasChildNodes()) s.innerHTML = ''; });
    return;
  }
  const slot = e.target.closest('.slot');
  if (!slot || slot.children.length > 0) return;
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
    setTimeout(() => loadQuestion(curIdx), 600);
  } else {
    questionAnswers.classList.add('shake');
    setTimeout(() => {
      questionAnswers.classList.remove('shake');
      questionAnswers.querySelectorAll('.answer-block').forEach(b => answerPad.appendChild(b));
      questionAnswers.querySelectorAll('.slot').forEach(s => s.innerHTML = '');
    }, 600);
  }
}
function endQuiz() {
  if (!isQuizActive) return;
  isQuizActive = false; stopTimer();
  const total = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(total / 60), s = total % 60;
  scoreDisplay.textContent = `Score: ${correctCount} / 20`;
  totalTimeDisplay.textContent = `Time: ${m}m ${s}s`;
  resultDiv.style.display = 'block';
  questionPad.textContent = 'Quiz Complete!';
  timerDisplay.style.display = 'none';
}
// Custom Confirm + Help
async function customConfirm(html = '') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);display:flex;justify-content:center;align-items:center;z-index:9999;';
    overlay.innerHTML = `
      <div style="background:#0c121c;padding:24px 36px;border-radius:14px;text-align:center;max-width:90%;box-shadow:0 0 30px rgba(20,255,236,0.4);">
        <div style="color:#d4d4d4;line-height:1.7;">${html || 'Confirm?'}</div>
        <div style="margin-top:20px;">
          <button id="yes" style="background:#14ffec;color:#0b0f19;padding:10px 24px;border:none;border-radius:8px;margin:0 8px;cursor:pointer;">Yes</button>
          <button id="no" style="background:#ff416c;color:white;padding:10px 24px;border:none;border-radius:8px;margin:0 8px;cursor:pointer;">No</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#yes').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#no').onclick = () => { overlay.remove(); resolve(false); };
  });
}
function showHelp() {
  const msg = isMobile
    ? 'Tap any code block to place it in the next slot.<br><br>Tap a placed block to return it.'
    : 'Drag & drop the code blocks into the correct order.<br><br>On mobile: just tap!';
  customConfirm(`
    <h3 style="color:#14ffec;margin:0 0 16px;">How to Play</h3>
    <p style="margin:12px 0;">${msg}</p>
    <p style="font-size:0.9rem;color:#8b9bb4;margin-top:16px;">
      Arrange the code correctly to complete the function or statement!
    </p>
  `);
}
function showGoodbyeScreen() {
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;color:#14ffec;font-family:'Fira Code',monospace;background:radial-gradient(circle at 20% 20%, #0b0f19 0%, #02060f 100%);text-align:center;">
      <h2 style="font-size:2.8rem;margin-bottom:16px;">Thanks for playing!</h2>
      <p style="font-size:1.3rem;">Come back soon!</p>
      <button onclick="location.reload()" style="margin-top:24px;padding:14px 32px;background:linear-gradient(90deg,#14ffec,#0d7377);color:#0b0f19;border:none;border-radius:12px;font-size:1.1rem;cursor:pointer;">
        Play Again
      </button>
    </div>
  `;
}
// Events
startBtn.onclick = startQuiz;
retryBtn.onclick = startQuiz;
cancelBtn.onclick = async () => { if (await customConfirm('Restart quiz?')) showStartScreen(); };
quitBtn.onclick = async () => { if (await customConfirm('Quit the game?')) showGoodbyeScreen(); };
document.getElementById('help_btn')?.addEventListener('click', showHelp);
// Cursor glow (desktop only)
if (!isMobile) {
  document.addEventListener('mousemove', e => {
    const glow = document.querySelector('.cursor-glow');
    glow.style.left = e.pageX + 'px';
    glow.style.top = e.pageY + 'px';
  });
}
