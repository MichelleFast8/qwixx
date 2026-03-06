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
    this.renderScoreSheet();
    this.renderPeekSheet();
    this.bindEvents();
  }

  cacheElements() {
    this.elements = {
      setupScreen: document.getElementById('setup-screen'),
      gameScreen: document.getElementById('game-screen'),
      gameoverScreen: document.getElementById('gameover-screen'),
      transitionScreen: document.getElementById('transition-screen'),
      resumeModal: document.getElementById('resume-modal'),
      peekModal: document.getElementById('peek-modal'),
      choiceModal: document.getElementById('choice-modal'),
      confirmModal: document.getElementById('confirm-modal'),
      confirmNewBtn: document.getElementById('confirm-new-btn'),
      cancelNewBtn: document.getElementById('cancel-new-btn'),
      player1Name: document.getElementById('player1-name'),
      player2Name: document.getElementById('player2-name'),
      startGameBtn: document.getElementById('start-game-btn'),
      resumeBtn: document.getElementById('resume-btn'),
      newGameBtn: document.getElementById('new-game-btn'),
      rollBtn: document.getElementById('roll-btn'),
      menuBtn: document.getElementById('menu-btn'),
      playAgainBtn: document.getElementById('play-again-btn'),
      readyBtn: document.getElementById('ready-btn'),
      peekBtn: document.getElementById('peek-btn'),
      closePeekBtn: document.getElementById('close-peek-btn'),
      doneBtn: document.getElementById('done-btn'),
      choiceWhiteBtn: document.getElementById('choice-white-btn'),
      choiceColoredBtn: document.getElementById('choice-colored-btn'),
      choiceCancelBtn: document.getElementById('choice-cancel-btn'),
      choiceWhiteValue: document.getElementById('choice-white-value'),
      choiceColoredValue: document.getElementById('choice-colored-value'),
      choiceDescription: document.getElementById('choice-description'),
      whiteSum: document.getElementById('white-sum'),
      finalScores: document.getElementById('final-scores'),
      transitionMessage: document.getElementById('transition-message'),
      playerSheet: document.getElementById('current-player-sheet'),
      peekPlayerName: document.getElementById('peek-player-name'),
      peekScoreRows: document.getElementById('peek-score-rows'),
      peekPenalties: document.getElementById('peek-penalties'),
      peekScore: document.getElementById('peek-score')
    };

    // Pending choice info (for when choice modal is shown)
    this.pendingChoice = null;
  }

  bindEvents() {
    this.elements.startGameBtn.addEventListener('click', () => this.startNewGame());
    this.elements.resumeBtn.addEventListener('click', () => this.resumeGame());
    this.elements.newGameBtn.addEventListener('click', () => this.declineResume());
    this.elements.rollBtn.addEventListener('click', () => this.handleRoll());
    this.elements.menuBtn.addEventListener('click', () => this.showConfirmModal());
    this.elements.confirmNewBtn.addEventListener('click', () => this.confirmNewGame());
    this.elements.cancelNewBtn.addEventListener('click', () => this.hideConfirmModal());
    this.elements.playAgainBtn.addEventListener('click', () => this.showSetup());
    this.elements.readyBtn.addEventListener('click', () => this.handleReady());
    this.elements.peekBtn.addEventListener('click', () => this.showPeekModal());
    this.elements.closePeekBtn.addEventListener('click', () => this.hidePeekModal());
    this.elements.doneBtn.addEventListener('click', () => this.handleDone());
    this.elements.choiceWhiteBtn.addEventListener('click', () => this.handleSlotChoice('white'));
    this.elements.choiceColoredBtn.addEventListener('click', () => this.handleSlotChoice('colored'));
    this.elements.choiceCancelBtn.addEventListener('click', () => this.hideChoiceModal());
  }

  renderScoreSheet() {
    const sheet = this.elements.playerSheet;
    const rows = sheet.querySelectorAll('.score-row');

    rows.forEach(row => {
      const color = row.dataset.color;
      const numbers = ROW_CONFIG[color].numbers;

      row.innerHTML = '';

      // Add number cells
      numbers.forEach(num => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.value = num;
        cell.textContent = num;
        cell.addEventListener('click', () => this.handleCellClick(color, num));
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
  }

  renderPeekSheet() {
    const rows = this.elements.peekScoreRows.querySelectorAll('.score-row');

    rows.forEach(row => {
      const color = row.dataset.color;
      const numbers = ROW_CONFIG[color].numbers;

      row.innerHTML = '';

      // Add number cells (non-interactive)
      numbers.forEach(num => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.value = num;
        cell.textContent = num;
        row.appendChild(cell);
      });

      // Add lock cell
      const lockCell = document.createElement('div');
      lockCell.className = 'cell lock-cell';
      lockCell.innerHTML = '<span class="lock-icon">&#128274;</span>';
      row.appendChild(lockCell);
    });

    // Render penalty boxes
    this.elements.peekPenalties.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const box = document.createElement('div');
      box.className = 'penalty-box';
      box.textContent = '-5';
      this.elements.peekPenalties.appendChild(box);
    }
  }

  updateUI() {
    this.updateCurrentPlayerSheet();
    this.updateDiceInfo();
    this.updateControls();
  }

  updateCurrentPlayerSheet() {
    const playerIndex = this.game.viewingPlayer;
    const player = this.game.players[playerIndex];
    const isActive = this.game.isActivePlayer(playerIndex);
    const sheet = this.elements.playerSheet;

    // Update player name and status
    sheet.querySelector('.player-name').textContent = player.name;
    const statusEl = sheet.querySelector('.player-status');

    if (this.game.phase === 'rolling') {
      statusEl.textContent = isActive ? '(Roll dice)' : '';
    } else if (this.game.phase === 'marking') {
      if (isActive) {
        const isDone = this.game.turnState.activeDone;
        if (isDone) {
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
        const isDone = this.game.turnState.nonActiveDone;
        if (isDone) {
          statusEl.textContent = '(Done)';
        } else {
          statusEl.textContent = this.game.turnState.nonActiveMark ? '(Picked)' : '(White only)';
        }
      }
    }

    // Highlight if active player
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

    // Update score
    const score = this.game.calculateScore(playerIndex);
    sheet.querySelector('.player-score').textContent = score;

    // Update Done button
    const isDone = isActive ? this.game.turnState.activeDone : this.game.turnState.nonActiveDone;
    this.elements.doneBtn.disabled = this.game.phase !== 'marking' || isDone;
    this.elements.doneBtn.textContent = isDone ? 'Waiting...' : 'Done';

    // Update Peek button text
    const otherPlayer = this.game.players[1 - playerIndex];
    this.elements.peekBtn.textContent = `View ${otherPlayer.name}`;
    this.elements.peekBtn.disabled = this.game.phase === 'rolling';
  }

  updateDiceInfo() {
    if (this.game.phase === 'marking' || this.game.phase === 'gameOver') {
      this.elements.whiteSum.textContent = `White: ${this.game.getWhiteSum()}`;
    } else {
      this.elements.whiteSum.textContent = 'White: --';
    }
  }

  updateControls() {
    const canRoll = this.game.phase === 'rolling' &&
                    !this.dice.isRolling &&
                    this.game.isViewingPlayerActive();
    this.elements.rollBtn.disabled = !canRoll;
    this.elements.rollBtn.textContent = this.dice.isRolling ? 'Rolling...' : 'Roll Dice';
  }

  handleCellClick(color, value) {
    if (this.game.phase !== 'marking') return;

    const playerIndex = this.game.viewingPlayer;
    let success = false;

    // Try to unmark first (if it was marked this turn)
    if (this.game.canUnmark(playerIndex, color, value)) {
      success = this.game.unmark(playerIndex, color, value);
    } else if (this.game.canMark(playerIndex, color, value)) {
      // Check if this mark has ambiguity (available via both white and colored)
      const choice = this.game.getMarkChoice(playerIndex, color, value);

      if (choice.needsChoice) {
        // Show choice modal
        this.showChoiceModal(color, value);
        return;
      }

      // No ambiguity, mark directly
      success = this.game.mark(playerIndex, color, value);
    }

    if (success) {
      this.updateUI();
      this.onStateChange();
    }
  }

  showChoiceModal(color, value) {
    const whiteSum = this.game.getWhiteSum();

    // Store pending choice info
    this.pendingChoice = { color, value };

    // Update modal content
    this.elements.choiceWhiteValue.textContent = whiteSum;
    this.elements.choiceColoredValue.textContent = value;
    this.elements.choiceDescription.textContent =
      `${color.charAt(0).toUpperCase() + color.slice(1)} ${value} can be marked using either dice combination.`;

    // Style the colored button based on the row color
    const coloredBtn = this.elements.choiceColoredBtn;
    coloredBtn.classList.remove('red', 'yellow', 'green', 'blue');
    coloredBtn.classList.add(color);

    // Show modal
    this.elements.choiceModal.classList.remove('hidden');
  }

  hideChoiceModal() {
    this.elements.choiceModal.classList.add('hidden');
    this.pendingChoice = null;
  }

  handleSlotChoice(slot) {
    if (!this.pendingChoice) return;

    const { color, value } = this.pendingChoice;
    const playerIndex = this.game.viewingPlayer;

    // Hide modal first
    this.hideChoiceModal();

    // Make the mark with the chosen slot
    const success = this.game.mark(playerIndex, color, value, slot);

    if (success) {
      this.updateUI();
      this.onStateChange();
    }
  }

  handleDone() {
    const playerIndex = this.game.viewingPlayer;
    const isActive = this.game.isActivePlayer(playerIndex);

    this.game.playerDone(playerIndex);
    this.onStateChange();

    if (isActive) {
      // Active player done, show transition to inactive player
      const inactivePlayer = this.game.players[1 - this.game.currentPlayer];
      this.showTransition(`Pass to ${inactivePlayer.name}`);
    } else {
      // Inactive player done, finalize turn
      this.game.finalizeTurn();
      this.onStateChange();

      if (this.game.phase === 'gameOver') {
        this.showGameOver();
      } else {
        // Show transition to new active player
        const newActivePlayer = this.game.players[this.game.currentPlayer];
        this.showTransition(`${newActivePlayer.name}'s turn`);
      }
    }
  }

  handleReady() {
    // Switch to the appropriate player
    if (!this.game.turnState.activeDone) {
      // Active player's turn to view
      this.game.viewingPlayer = this.game.currentPlayer;
    } else if (!this.game.turnState.nonActiveDone) {
      // Inactive player's turn to view
      this.game.viewingPlayer = 1 - this.game.currentPlayer;
    } else {
      // Both done, new turn - viewing player should be new active
      this.game.viewingPlayer = this.game.currentPlayer;
    }

    this.showScreen('game');
    this.updateUI();
    this.onStateChange();
  }

  async handleRoll() {
    if (this.game.phase !== 'rolling') return;
    if (!this.game.isViewingPlayerActive()) return;

    this.elements.rollBtn.disabled = true;
    this.elements.rollBtn.textContent = 'Rolling...';

    await this.dice.roll();

    this.game.phase = 'marking';
    this.updateUI();
    this.onStateChange();
  }

  showTransition(message) {
    this.elements.transitionMessage.textContent = message;
    this.showScreen('transition');
  }

  showPeekModal() {
    const otherPlayerIndex = 1 - this.game.viewingPlayer;
    const otherPlayer = this.game.players[otherPlayerIndex];

    // Update peek modal content
    this.elements.peekPlayerName.textContent = `${otherPlayer.name}'s Board`;

    // Update rows
    const rows = this.elements.peekScoreRows.querySelectorAll('.score-row');
    rows.forEach(row => {
      const color = row.dataset.color;
      const markedNumbers = otherPlayer.rows[color];
      const isLocked = this.game.lockedRows.includes(color);

      const cells = row.querySelectorAll('.cell:not(.lock-cell)');
      cells.forEach(cell => {
        const value = parseInt(cell.dataset.value);
        const isMarked = markedNumbers.includes(value);

        cell.classList.toggle('marked', isMarked);
        cell.classList.toggle('disabled', isLocked);
      });

      // Update lock cell
      const lockCell = row.querySelector('.lock-cell');
      const playerLockedThis = isLocked && markedNumbers.includes(ROW_CONFIG[color].lockNumber);
      lockCell.classList.toggle('locked', playerLockedThis);
      row.classList.toggle('row-locked', isLocked);
    });

    // Update penalties
    const penaltyBoxes = this.elements.peekPenalties.querySelectorAll('.penalty-box');
    penaltyBoxes.forEach((box, i) => {
      box.classList.toggle('marked', i < otherPlayer.penalties);
    });

    // Update score
    this.elements.peekScore.textContent = this.game.calculateScore(otherPlayerIndex);

    // Show modal
    this.elements.peekModal.classList.remove('hidden');
  }

  hidePeekModal() {
    this.elements.peekModal.classList.add('hidden');
  }

  showConfirmModal() {
    this.elements.confirmModal.classList.remove('hidden');
  }

  hideConfirmModal() {
    this.elements.confirmModal.classList.add('hidden');
  }

  confirmNewGame() {
    this.hideConfirmModal();
    this.showSetup();
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

    // If in middle of turn, show appropriate screen
    if (this.game.turnState.activeDone && !this.game.turnState.nonActiveDone) {
      // Active done, inactive needs to go
      const inactivePlayer = this.game.players[1 - this.game.currentPlayer];
      this.showTransition(`Pass to ${inactivePlayer.name}`);
    } else {
      this.showScreen('game');
      this.updateUI();
    }
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
    this.elements.transitionScreen.classList.toggle('hidden', screen !== 'transition');
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
