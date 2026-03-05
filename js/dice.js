// Dice rolling and animation system

class DiceController {
  constructor(game) {
    this.game = game;
    this.isRolling = false;
    this.diceElements = {};
    this.rollDuration = 600;
    this.intervalTime = 50;
  }

  init() {
    this.diceElements = {
      white1: document.getElementById('die-white1'),
      white2: document.getElementById('die-white2'),
      red: document.getElementById('die-red'),
      yellow: document.getElementById('die-yellow'),
      green: document.getElementById('die-green'),
      blue: document.getElementById('die-blue')
    };
  }

  // Generate random die value 1-6
  randomValue() {
    return Math.floor(Math.random() * 6) + 1;
  }

  // Roll all dice with animation
  roll() {
    return new Promise((resolve) => {
      if (this.isRolling) {
        resolve(false);
        return;
      }

      this.isRolling = true;

      // Add rolling class for animation
      Object.values(this.diceElements).forEach(el => {
        el.classList.add('rolling');
      });

      // Animate with random values
      const intervalId = setInterval(() => {
        Object.keys(this.diceElements).forEach(key => {
          const val = this.randomValue();
          this.updateDieDisplay(key, val);
        });
      }, this.intervalTime);

      // Stop after duration and set final values
      setTimeout(() => {
        clearInterval(intervalId);

        // Generate final values
        const finalValues = {
          white1: this.randomValue(),
          white2: this.randomValue(),
          red: this.randomValue(),
          yellow: this.randomValue(),
          green: this.randomValue(),
          blue: this.randomValue()
        };

        // Update game state
        this.game.dice = finalValues;

        // Update display with final values
        Object.keys(finalValues).forEach(key => {
          this.updateDieDisplay(key, finalValues[key]);
        });

        // Remove rolling class, add settle animation
        Object.values(this.diceElements).forEach(el => {
          el.classList.remove('rolling');
          el.classList.add('settle');
          setTimeout(() => el.classList.remove('settle'), 200);
        });

        this.isRolling = false;
        resolve(true);
      }, this.rollDuration);
    });
  }

  // Update die display to show dots pattern
  updateDieDisplay(dieKey, value) {
    const el = this.diceElements[dieKey];
    if (!el) return;

    el.dataset.value = value;
    el.innerHTML = this.generateDots(value);
  }

  // Generate dot pattern HTML for a die value
  generateDots(value) {
    const patterns = {
      1: [5],
      2: [1, 9],
      3: [1, 5, 9],
      4: [1, 3, 7, 9],
      5: [1, 3, 5, 7, 9],
      6: [1, 3, 4, 6, 7, 9]
    };

    const dots = patterns[value] || [];
    let html = '<div class="die-face">';
    for (let i = 1; i <= 9; i++) {
      const hasDot = dots.includes(i);
      html += `<div class="dot-position${hasDot ? ' dot' : ''}"></div>`;
    }
    html += '</div>';
    return html;
  }

  // Render current dice state (for loading saved game)
  renderCurrentState() {
    Object.keys(this.game.dice).forEach(key => {
      this.updateDieDisplay(key, this.game.dice[key]);
    });
  }
}

window.DiceController = DiceController;
