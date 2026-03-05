// UI Rendering and Event Handling

class GameUI {
  constructor(game, diceController, onStateChange) {
    this.game = game;
    this.dice = diceController;
    this.onStateChange = onStateChange;
    this.elements = {};
  }

  init() {
    this.cacheElements();
    this.renderScoreSheets();
    this.bindEvents();
  }

  cacheElements() {
    this.elements = {
      setupScreen: document.getElementById('setup-screen'),
      gameScreen: document.getElementById('game-screen'),
      gameoverScreen: document.getElementById('gameover-screen'),
      resumeModal: document.getElementById('resume-modal'),
      player1Name: document.getElementById('player1-name'),
      player2Name: document.getElementById('player2-name'),
      startGameBtn: document.getElementById('start-game-btn'),
      resumeBtn: document.getElementById('resume-btn'),
      newGameBtn: document.getElementById('new-game-btn'),
      rollBtn: document.getElementById('roll-btn'),
      menuBtn: document.getElementById('menu-btn'),
      playAgainBtn: document.getElementById('play-again-btn'),
      whiteSum: document.getElementById('white-sum'),
      finalScores: document.getElementById('final-scores'),
      playerSheets: [
        document.getElementById('player1-sheet'),
        document.getElementById('player2-sheet')
      ]
    };
  }

  bindEvents() {
    this.elements.startGameBtn.addEventListener('click', () => this.startNewGame());
    this.elements.resumeBtn.addEventListener('click', () => this.resumeGame());
    this.elements.newGameBtn.addEventListener('click', () => this.declineResume());
    this.elements.rollBtn.addEventListener('click', () => this.handleRoll());
    this.elements.menuBtn.addEventListener('click', () => this.showSetup());
    this.elements.playAgainBtn.addEventListener('click', () => this.showSetup());

    // Bind done buttons
    this.elements.playerSheets.forEach((sheet, index) => {
      const doneBtn = sheet.querySelector('.btn-done');
      doneBtn.addEventListener('click', () => this.handleDone(index));
    });
  }

  renderScoreSheets() {
    this.elements.playerSheets.forEach((sheet, playerIndex) => {
      const rows = sheet.querySelectorAll('.score-row');
      rows.forEach(row => {
        const color = row.dataset.color;
        const numbers = ROW_CONFIG[color].numbers;
        const lockNumber = ROW_CONFIG[color].lockNumber;

        row.innerHTML = '';

        // Add number cells
        numbers.forEach(num => {
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.dataset.value = num;
          cell.textContent = num;
          cell.addEventListener('click', () => this.handleCellClick(playerIndex, color, num));
          row.appendChild(cell);
        });

        // Add lock cell
        const lockCell = document.createElement('div');
        lockCell.className = 'cell lock-cell';
        lockCell.innerHTML = '<span class="lock-icon">&#128274;</span>';
        row.appendChild(lockCell);
      });

      // Render penalty boxes
      const penaltyContainer = sheet.querySelector('.penalty-boxes');
      penaltyContainer.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const box = document.createElement('div');
        box.className = 'penalty-box';
        box.textContent = '-5';
        penaltyContainer.appendChild(box);
      }
    });
  }

  updateUI() {
    this.updatePlayerSheets();
    this.updateDiceInfo();
    this.updateControls();
    this.updateScores();
  }

  updatePlayerSheets() {
    this.elements.playerSheets.forEach((sheet, playerIndex) => {
      const player = this.game.players[playerIndex];
      const isActive = this.game.isActivePlayer(playerIndex);

      // Update player name and status
      sheet.querySelector('.player-name').textContent = player.name;
      const statusEl = sheet.querySelector('.player-status');

      if (this.game.phase === 'rolling') {
        statusEl.textContent = isActive ? '(Roll dice)' : '';
      } else if (this.game.phase === 'marking') {
        if (isActive) {
          if (this.game.turnState.activeDone) {
            statusEl.textContent = '(Done)';
          } else {
            const hasWhite = this.game.turnState.activeWhiteMark !== null;
            const hasColor = this.game.turnState.activeColorMark !== null;

            if (!hasWhite && !hasColor) {
              statusEl.textContent = '(Pick white or color)';
            } else if (hasWhite && !hasColor) {
              statusEl.textContent = '(Pick color or Done)';
            } else if (!hasWhite && hasColor) {
              statusEl.textContent = '(Skipped white)';
            } else {
              statusEl.textContent = '(Both picked)';
            }
          }
        } else {
          if (this.game.turnState.nonActiveDone) {
            statusEl.textContent = '(Done)';
          } else {
            statusEl.textContent = this.game.turnState.nonActiveMark ? '(Done)' : '(White only)';
          }
        }
      }

      // Highlight active player
      sheet.classList.toggle('active', isActive);

      // Update rows
      const rows = sheet.querySelectorAll('.score-row');
      rows.forEach(row => {
        const color = row.dataset.color;
        const markedNumbers = player.rows[color];
        const isLocked = this.game.lockedRows.includes(color);

        const cells = row.querySelectorAll('.cell:not(.lock-cell)');
        cells.forEach(cell => {
          const value = parseInt(cell.dataset.value);
          const isMarked = markedNumbers.includes(value);
          const canMark = this.game.canMark(playerIndex, color, value);
          const canUnmark = this.game.canUnmark(playerIndex, color, value);
          const isMarkedThisTurn = this.game.isMarkedThisTurn(playerIndex, color, value);

          cell.classList.toggle('marked', isMarked);
          cell.classList.toggle('marked-this-turn', isMarkedThisTurn);
          cell.classList.toggle('available', canMark && this.game.phase === 'marking');
          cell.classList.toggle('undoable', canUnmark);
          cell.classList.toggle('disabled', isLocked || (isMarked && !canUnmark));
        });

        // Update lock cell
        const lockCell = row.querySelector('.lock-cell');
        const playerLockedThis = isLocked && markedNumbers.includes(ROW_CONFIG[color].lockNumber);
        lockCell.classList.toggle('locked', playerLockedThis);
        row.classList.toggle('row-locked', isLocked);
      });

      // Update penalties
      const penaltyBoxes = sheet.querySelectorAll('.penalty-box');
      penaltyBoxes.forEach((box, i) => {
        box.classList.toggle('marked', i < player.penalties);
      });

      // Update Done button
      const doneBtn = sheet.querySelector('.btn-done');
      const isDone = isActive ? this.game.turnState.activeDone : this.game.turnState.nonActiveDone;
      doneBtn.disabled = this.game.phase !== 'marking' || isDone;
      doneBtn.textContent = isDone ? 'Waiting...' : 'Done';

    });
  }

  updateDiceInfo() {
    if (this.game.phase === 'marking' || this.game.phase === 'gameOver') {
      this.elements.whiteSum.textContent = `White: ${this.game.getWhiteSum()}`;
    } else {
      this.elements.whiteSum.textContent = 'White: --';
    }
  }

  updateControls() {
    const canRoll = this.game.phase === 'rolling' && !this.dice.isRolling;
    this.elements.rollBtn.disabled = !canRoll;
    this.elements.rollBtn.textContent = this.dice.isRolling ? 'Rolling...' : 'Roll Dice';
  }

  updateScores() {
    this.elements.playerSheets.forEach((sheet, index) => {
      const score = this.game.calculateScore(index);
      sheet.querySelector('.player-score').textContent = score;
    });
  }

  handleCellClick(playerIndex, color, value) {
    if (this.game.phase !== 'marking') return;

    let success = false;

    // Try to unmark first (if it was marked this turn)
    if (this.game.canUnmark(playerIndex, color, value)) {
      success = this.game.unmark(playerIndex, color, value);
    } else {
      // Try to mark
      success = this.game.mark(playerIndex, color, value);
    }

    if (success) {
      this.updateUI();
      this.onStateChange();

      if (this.game.phase === 'gameOver') {
        this.showGameOver();
      }
    }
  }

  handleDone(playerIndex) {
    this.game.playerDone(playerIndex);
    this.updateUI();
    this.onStateChange();

    if (this.game.phase === 'gameOver') {
      this.showGameOver();
    }
  }

  async handleRoll() {
    if (this.game.phase !== 'rolling') return;

    this.elements.rollBtn.disabled = true;
    this.elements.rollBtn.textContent = 'Rolling...';

    await this.dice.roll();

    this.game.phase = 'marking';
    this.updateUI();
    this.onStateChange();
  }

  startNewGame() {
    const name1 = this.elements.player1Name.value.trim() || 'Player 1';
    const name2 = this.elements.player2Name.value.trim() || 'Player 2';

    this.game.reset();
    this.game.setPlayerNames(name1, name2);
    this.dice.renderCurrentState();

    this.showScreen('game');
    this.updateUI();
    this.onStateChange();
  }

  resumeGame() {
    this.elements.resumeModal.classList.add('hidden');
    this.dice.renderCurrentState();
    this.showScreen('game');
    this.updateUI();
  }

  declineResume() {
    this.elements.resumeModal.classList.add('hidden');
    localStorage.removeItem('qwixx-save');
    this.showScreen('setup');
  }

  showSetup() {
    localStorage.removeItem('qwixx-save');
    this.game.reset();
    this.showScreen('setup');
    this.elements.player1Name.value = '';
    this.elements.player2Name.value = '';
  }

  showResumePrompt() {
    this.elements.resumeModal.classList.remove('hidden');
  }

  showScreen(screen) {
    this.elements.setupScreen.classList.toggle('hidden', screen !== 'setup');
    this.elements.gameScreen.classList.toggle('hidden', screen !== 'game');
    this.elements.gameoverScreen.classList.toggle('hidden', screen !== 'gameover');
  }

  showGameOver() {
    const scores = [];
    for (let i = 0; i < 2; i++) {
      const breakdown = this.game.getScoreBreakdown(i);
      scores.push({
        name: this.game.players[i].name,
        breakdown
      });
    }

    let html = '';
    scores.forEach(s => {
      html += `<div class="final-score-card">`;
      html += `<h3>${s.name}</h3>`;
      html += `<div class="score-details">`;
      for (const color of ['red', 'yellow', 'green', 'blue']) {
        const row = s.breakdown.rows[color];
        html += `<div class="row-score ${color}">`;
        html += `<span class="color-indicator"></span>`;
        html += `<span>${row.marks}${row.locked ? '+1' : ''} marks = ${row.score}</span>`;
        html += `</div>`;
      }
      html += `<div class="penalty-score">Penalties: -${s.breakdown.penalties * 5}</div>`;
      html += `</div>`;
      html += `<div class="total-score">Total: ${s.breakdown.total}</div>`;
      html += `</div>`;
    });

    // Determine winner
    const winner = scores[0].breakdown.total > scores[1].breakdown.total ? scores[0].name :
                   scores[1].breakdown.total > scores[0].breakdown.total ? scores[1].name : 'Tie';
    html += `<div class="winner-announcement">${winner === 'Tie' ? "It's a tie!" : `${winner} wins!`}</div>`;

    this.elements.finalScores.innerHTML = html;
    this.showScreen('gameover');
  }
}

window.GameUI = GameUI;
