// Qwixx PWA - Main Application

const STORAGE_KEY = 'qwixx-save';

class QwixxApp {
  constructor() {
    this.game = new QwixxGame();
    this.dice = new DiceController(this.game);
    this.ui = new GameUI(this.game, this.dice, () => this.saveGame());
  }

  init() {
    this.dice.init();
    this.ui.init();
    this.registerServiceWorker();
    this.checkSavedGame();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/qwixx/sw.js', { scope: '/qwixx/' })
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed:', err));
    }
  }

  checkSavedGame() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data && data.phase !== 'gameOver') {
          this.game.fromJSON(data);
          this.ui.showResumePrompt();
          return;
        }
      } catch (e) {
        console.log('Failed to load saved game:', e);
      }
    }
    this.ui.showScreen('setup');
  }

  saveGame() {
    if (this.game.phase === 'gameOver') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.game.toJSON()));
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new QwixxApp();
  app.init();
});
