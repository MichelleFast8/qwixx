// Qwixx Game Logic

const ROW_CONFIG = {
  red: { numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], lockNumber: 12 },
  yellow: { numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], lockNumber: 12 },
  green: { numbers: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2], lockNumber: 2 },
  blue: { numbers: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2], lockNumber: 2 }
};

const SCORE_TABLE = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78];
const PENALTY_POINTS = 5;
const MAX_PENALTIES = 4;
const MARKS_TO_LOCK = 5;

class QwixxGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.players = [
      this.createPlayer('Player 1'),
      this.createPlayer('Player 2')
    ];
    this.currentPlayer = 0;       // Who rolled the dice (active player)
    this.viewingPlayer = 0;       // Who is currently viewing the screen
    this.dice = { white1: 1, white2: 1, red: 1, yellow: 1, green: 1, blue: 1 };
    this.lockedRows = [];
    this.phase = 'rolling'; // rolling, marking, gameOver
    this.turnState = {
      activeWhiteMark: null,    // { color, value } if active used white sum
      activeColorMark: null,    // { color, value } if active used colored combo
      nonActiveMark: null,      // { color, value } if non-active marked
      activeDone: false,
      nonActiveDone: false
    };
  }

  // Get the player currently viewing the screen
  getViewingPlayer() {
    return this.players[this.viewingPlayer];
  }

  // Check if viewing player is the active player
  isViewingPlayerActive() {
    return this.viewingPlayer === this.currentPlayer;
  }

  // Switch to viewing the other player's board
  switchViewingPlayer() {
    this.viewingPlayer = 1 - this.viewingPlayer;
  }

  createPlayer(name) {
    return {
      name,
      rows: { red: [], yellow: [], green: [], blue: [] },
      penalties: 0
    };
  }

  setPlayerNames(name1, name2) {
    this.players[0].name = name1 || 'Player 1';
    this.players[1].name = name2 || 'Player 2';
  }

  getActivePlayer() {
    return this.players[this.currentPlayer];
  }

  getNonActivePlayer() {
    return this.players[1 - this.currentPlayer];
  }

  isActivePlayer(playerIndex) {
    return playerIndex === this.currentPlayer;
  }

  // Get the white dice sum
  getWhiteSum() {
    return this.dice.white1 + this.dice.white2;
  }

  // Get all available numbers for the active player
  getActivePlayerOptions() {
    const options = [];
    const whiteSum = this.getWhiteSum();

    // White sum can be used on any unlocked row
    ['red', 'yellow', 'green', 'blue'].forEach(color => {
      if (!this.lockedRows.includes(color)) {
        options.push({ color, value: whiteSum, isWhiteOnly: true });
      }
    });

    // Colored combinations
    ['red', 'yellow', 'green', 'blue'].forEach(color => {
      if (!this.lockedRows.includes(color)) {
        const colorValue = this.dice[color];
        const combo1 = this.dice.white1 + colorValue;
        const combo2 = this.dice.white2 + colorValue;

        if (combo1 >= 2 && combo1 <= 12) {
          options.push({ color, value: combo1, isWhiteOnly: false });
        }
        if (combo2 !== combo1 && combo2 >= 2 && combo2 <= 12) {
          options.push({ color, value: combo2, isWhiteOnly: false });
        }
      }
    });

    return options;
  }

  // Get available numbers for non-active player (white sum only)
  getNonActivePlayerOptions() {
    const options = [];
    const whiteSum = this.getWhiteSum();

    ['red', 'yellow', 'green', 'blue'].forEach(color => {
      if (!this.lockedRows.includes(color)) {
        options.push({ color, value: whiteSum, isWhiteOnly: true });
      }
    });

    return options;
  }

  // Check if this mark was made this turn (for undo)
  isMarkedThisTurn(playerIndex, color, value) {
    const isActive = this.isActivePlayer(playerIndex);
    if (isActive) {
      const whiteMark = this.turnState.activeWhiteMark;
      const colorMark = this.turnState.activeColorMark;
      return (whiteMark && whiteMark.color === color && whiteMark.value === value) ||
             (colorMark && colorMark.color === color && colorMark.value === value);
    } else {
      const mark = this.turnState.nonActiveMark;
      return mark && mark.color === color && mark.value === value;
    }
  }

  // Check if a number can be marked in a row
  canMark(playerIndex, color, value) {
    if (this.phase !== 'marking') return false;
    if (this.lockedRows.includes(color)) return false;

    const player = this.players[playerIndex];
    const row = player.rows[color];
    const config = ROW_CONFIG[color];
    const numbers = config.numbers;
    const valueIndex = numbers.indexOf(value);
    const isActive = this.isActivePlayer(playerIndex);

    if (valueIndex === -1) return false;

    // Check if player is done
    if (isActive && this.turnState.activeDone) return false;
    if (!isActive && this.turnState.nonActiveDone) return false;

    // Check turn limits
    if (isActive) {
      // Active player can have at most one white mark and one color mark
      const hasWhite = this.turnState.activeWhiteMark !== null;
      const hasColor = this.turnState.activeColorMark !== null;
      if (hasWhite && hasColor) return false;
    } else {
      // Non-active can only mark once
      if (this.turnState.nonActiveMark !== null) return false;
    }

    // Check left-to-right rule: can only mark numbers to the right of last marked
    // But ignore marks made this turn (they can be undone)
    const permanentMarks = row.filter(v => !this.isMarkedThisTurn(playerIndex, color, v));
    if (permanentMarks.length > 0) {
      const lastMarked = permanentMarks[permanentMarks.length - 1];
      const lastIndex = numbers.indexOf(lastMarked);
      if (valueIndex <= lastIndex) return false;
    }

    // Also check against marks made this turn (must still be left-to-right within turn)
    if (row.length > 0) {
      const lastMarked = row[row.length - 1];
      const lastIndex = numbers.indexOf(lastMarked);
      if (valueIndex <= lastIndex) return false;
    }

    // Check if trying to lock (rightmost number)
    if (value === config.lockNumber && row.length < MARKS_TO_LOCK - 1) {
      return false; // Need 5 marks including this one to lock
    }

    // Check if this is a valid option for this player
    const options = isActive ? this.getActivePlayerOptions() : this.getNonActivePlayerOptions();
    const matchingOptions = options.filter(opt => opt.color === color && opt.value === value);

    if (matchingOptions.length === 0) return false;

    // Check if any matching option is available based on current turn state
    if (isActive) {
      const availableViaWhite = matchingOptions.some(opt => opt.isWhiteOnly);
      const availableViaColored = matchingOptions.some(opt => !opt.isWhiteOnly);

      // Prioritize white slot - this preserves colored combo for numbers that ONLY have colored option
      if (availableViaWhite && this.turnState.activeWhiteMark === null) {
        return true;
      }

      // Fall back to colored slot if white not available or white slot taken
      if (availableViaColored && this.turnState.activeColorMark === null) {
        return true;
      }

      return false;
    }

    return true;
  }

  // Check if a number can be unmarked (was marked this turn)
  canUnmark(playerIndex, color, value) {
    if (this.phase !== 'marking') return false;

    const isActive = this.isActivePlayer(playerIndex);
    if (isActive && this.turnState.activeDone) return false;
    if (!isActive && this.turnState.nonActiveDone) return false;

    return this.isMarkedThisTurn(playerIndex, color, value);
  }

  // Check if marking this number requires a choice between white and colored slots
  // Returns { needsChoice, canUseWhite, canUseColored } for active player
  getMarkChoice(playerIndex, color, value) {
    const isActive = this.isActivePlayer(playerIndex);
    if (!isActive) {
      return { needsChoice: false, canUseWhite: false, canUseColored: false };
    }

    const options = this.getActivePlayerOptions();
    const matchingOptions = options.filter(opt => opt.color === color && opt.value === value);

    const canUseWhite = matchingOptions.some(opt => opt.isWhiteOnly) &&
                        this.turnState.activeWhiteMark === null;
    const canUseColored = matchingOptions.some(opt => !opt.isWhiteOnly) &&
                          this.turnState.activeColorMark === null;

    return {
      needsChoice: canUseWhite && canUseColored,
      canUseWhite,
      canUseColored
    };
  }

  // Mark a number
  // forceSlot: 'white' | 'colored' | null - if provided, use that slot; otherwise auto-decide
  mark(playerIndex, color, value, forceSlot = null) {
    if (!this.canMark(playerIndex, color, value)) return false;

    const player = this.players[playerIndex];
    const config = ROW_CONFIG[color];
    const isActive = this.isActivePlayer(playerIndex);

    // Determine which slot to use
    const options = isActive ? this.getActivePlayerOptions() : this.getNonActivePlayerOptions();
    const matchingOptions = options.filter(opt => opt.color === color && opt.value === value);
    const availableViaWhite = matchingOptions.some(opt => opt.isWhiteOnly);
    const availableViaColored = matchingOptions.some(opt => !opt.isWhiteOnly);

    // Make the mark
    player.rows[color].push(value);

    // Update turn state
    if (isActive) {
      let useWhiteSlot;

      if (forceSlot === 'white') {
        useWhiteSlot = true;
      } else if (forceSlot === 'colored') {
        useWhiteSlot = false;
      } else {
        // Auto-decide: use white slot first if available
        useWhiteSlot = availableViaWhite && this.turnState.activeWhiteMark === null;
      }

      if (useWhiteSlot) {
        this.turnState.activeWhiteMark = { color, value };
      } else {
        this.turnState.activeColorMark = { color, value };
      }
    } else {
      this.turnState.nonActiveMark = { color, value };
    }

    // Note: Lock and game-over checks are deferred until both players are done
    // This is handled in finalizeTurn()

    return true;
  }

  // Unmark a number (undo a mark made this turn)
  unmark(playerIndex, color, value) {
    if (!this.canUnmark(playerIndex, color, value)) return false;

    const player = this.players[playerIndex];
    const isActive = this.isActivePlayer(playerIndex);

    // Helper to remove a mark and handle unlocking
    const removeMark = (c, v) => {
      const idx = player.rows[c].lastIndexOf(v);
      if (idx !== -1) {
        player.rows[c].splice(idx, 1);
      }
      // If this was a lock number, unlock the row
      const config = ROW_CONFIG[c];
      if (v === config.lockNumber) {
        const lockIdx = this.lockedRows.indexOf(c);
        if (lockIdx !== -1) {
          this.lockedRows.splice(lockIdx, 1);
        }
      }
    };

    // Remove the mark from the row
    removeMark(color, value);

    // Update turn state
    if (isActive) {
      const whiteMark = this.turnState.activeWhiteMark;
      const colorMark = this.turnState.activeColorMark;

      if (whiteMark && whiteMark.color === color && whiteMark.value === value) {
        // Undoing white mark - also undo color mark if present (since it depended on white)
        this.turnState.activeWhiteMark = null;
        if (colorMark) {
          // Remove the color mark from the row too
          removeMark(colorMark.color, colorMark.value);
          this.turnState.activeColorMark = null;
        }
      } else if (colorMark && colorMark.color === color && colorMark.value === value) {
        this.turnState.activeColorMark = null;
      }
    } else {
      this.turnState.nonActiveMark = null;
    }

    return true;
  }

  // Check if active player made any marks this turn
  activeHasMarked() {
    return this.turnState.activeWhiteMark !== null || this.turnState.activeColorMark !== null;
  }

  // Player indicates they're done with their turn
  playerDone(playerIndex) {
    const isActive = this.isActivePlayer(playerIndex);

    if (isActive) {
      // Active player gets penalty if they marked nothing
      if (!this.activeHasMarked()) {
        this.players[playerIndex].penalties++;
      }
      this.turnState.activeDone = true;
    } else {
      this.turnState.nonActiveDone = true;
    }

    // Note: finalizeTurn() must be called by UI after both players are done
  }

  // Check if both players have completed their actions for this turn
  isTurnComplete() {
    return this.turnState.activeDone && this.turnState.nonActiveDone;
  }

  // Called after both players are done - applies locks, checks game over, advances turn
  finalizeTurn() {
    if (!this.isTurnComplete()) return false;

    // Check for locks - look at all players' rows for lock numbers
    for (const player of this.players) {
      for (const color of ['red', 'yellow', 'green', 'blue']) {
        if (this.lockedRows.includes(color)) continue; // Already locked

        const config = ROW_CONFIG[color];
        const row = player.rows[color];

        // Lock if player has the lock number and enough marks
        if (row.includes(config.lockNumber) && row.length >= MARKS_TO_LOCK) {
          this.lockedRows.push(color);
        }
      }
    }

    // Check for game over
    if (this.checkGameOver()) {
      return true;
    }

    // Advance to next turn
    this.endTurn();
    return true;
  }

  endTurn() {
    if (this.phase === 'gameOver') return;

    // Switch to next player
    this.currentPlayer = 1 - this.currentPlayer;
    this.viewingPlayer = this.currentPlayer; // New active player views first
    this.phase = 'rolling';
    this.turnState = {
      activeWhiteMark: null,
      activeColorMark: null,
      nonActiveMark: null,
      activeDone: false,
      nonActiveDone: false
    };
  }

  checkGameOver() {
    // Game ends if 2 rows are locked
    if (this.lockedRows.length >= 2) {
      this.phase = 'gameOver';
      return true;
    }

    // Game ends if any player has 4 penalties
    for (const player of this.players) {
      if (player.penalties >= MAX_PENALTIES) {
        this.phase = 'gameOver';
        return true;
      }
    }

    return false;
  }

  // Calculate score for a single row
  calculateRowScore(marks, isLocked) {
    let count = marks.length;
    if (isLocked) count++; // Lock symbol counts as extra mark
    return SCORE_TABLE[count] || 0;
  }

  // Calculate total score for a player
  calculateScore(playerIndex) {
    const player = this.players[playerIndex];
    let total = 0;

    for (const color of ['red', 'yellow', 'green', 'blue']) {
      const marks = player.rows[color];
      const isLocked = this.lockedRows.includes(color) &&
                       marks.includes(ROW_CONFIG[color].lockNumber);
      total += this.calculateRowScore(marks, isLocked);
    }

    total -= player.penalties * PENALTY_POINTS;
    return total;
  }

  // Get detailed score breakdown for a player
  getScoreBreakdown(playerIndex) {
    const player = this.players[playerIndex];
    const breakdown = { rows: {}, penalties: player.penalties, total: 0 };

    for (const color of ['red', 'yellow', 'green', 'blue']) {
      const marks = player.rows[color];
      const isLocked = this.lockedRows.includes(color) &&
                       marks.includes(ROW_CONFIG[color].lockNumber);
      breakdown.rows[color] = {
        marks: marks.length,
        locked: isLocked,
        score: this.calculateRowScore(marks, isLocked)
      };
      breakdown.total += breakdown.rows[color].score;
    }

    breakdown.total -= player.penalties * PENALTY_POINTS;
    return breakdown;
  }

  // Serialize game state for saving
  toJSON() {
    return {
      players: this.players,
      currentPlayer: this.currentPlayer,
      viewingPlayer: this.viewingPlayer,
      dice: this.dice,
      lockedRows: this.lockedRows,
      phase: this.phase,
      turnState: this.turnState
    };
  }

  // Load game state
  fromJSON(data) {
    this.players = data.players;
    this.currentPlayer = data.currentPlayer;
    this.viewingPlayer = data.viewingPlayer ?? data.currentPlayer; // Fallback for old saves
    this.dice = data.dice;
    this.lockedRows = data.lockedRows;
    this.phase = data.phase;
    this.turnState = data.turnState;
  }
}

// Export for use in other modules
window.QwixxGame = QwixxGame;
window.ROW_CONFIG = ROW_CONFIG;
