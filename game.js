class ConnectionGame {
  constructor(puzzles) {
    this.puzzles = puzzles;
    this.bindUI();
    this.resetGame();
  }

  bindUI = () => {
    document.getElementById('submit')
      .addEventListener('click', () => this.checkSelection());
    document.getElementById('reset')
      .addEventListener('click', () => this.resetGame());
  }

  resetGame = () => {
    // clear state & UI
    this.selected = [];
    this.foundGroups = [];
    document.getElementById('connections').innerHTML = '';
    this.showMessage('');
    // pick & render new puzzle
    const idx = Math.floor(Math.random() * this.puzzles.length);
    this.current = JSON.parse(JSON.stringify(this.puzzles[idx]));
    this.allWords = this.shuffleArray(this.current.words);
    this.renderGrid();
  }

  // Fisher–Yates shuffle
  shuffleArray = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  renderGrid = () => {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    this.allWords.forEach(word => {
      const cell = document.createElement('div');
      cell.textContent = word;
      cell.className = 'cell';
      cell.addEventListener('click', () => this.toggleSelect(cell, word));
      grid.appendChild(cell);
    });
  }

  toggleSelect = (cell, word) => {
    if (cell.classList.contains('found')) return;
    const i = this.selected.indexOf(word);
    if (i > -1) {
      this.selected.splice(i, 1);
      cell.classList.remove('selected');
    } else if (this.selected.length < 4) {
      this.selected.push(word);
      cell.classList.add('selected');
    }
  }

  checkSelection = () => {
    if (this.selected.length !== 4) {
      this.showMessage('Select exactly 4 words.');
      return;
    }

    // order-independent match
    const matchIndex = this.current.groups.findIndex(group =>
      group.words.every(w => this.selected.includes(w))
    );

    if (matchIndex > -1 && !this.foundGroups.includes(matchIndex)) {
      this.foundGroups.push(matchIndex);
      this.markFound(this.current.groups[matchIndex]);
      this.displayConnection(matchIndex);
      this.showMessage('Correct!');
      if (this.foundGroups.length === this.current.groups.length) {
        this.showMessage('🎉 Congrats! You found all connections!');
      }
    } else {
      this.showMessage('Not quite—try again.');
    }

    this.clearSelection();
  }

  markFound = ({ words }) => {
    document.querySelectorAll('.cell').forEach(cell => {
      if (words.includes(cell.textContent)) {
        cell.classList.remove('selected');
        cell.classList.add('found');
      }
    });
  }

  displayConnection = index => {
    const { description } = this.current.groups[index];
    const p = document.createElement('p');
    p.textContent = `Connection ${index + 1}: ${description}`;
    document.getElementById('connections').appendChild(p);
  }

  clearSelection = () => {
    this.selected = [];
    document.querySelectorAll('.cell.selected')
      .forEach(cell => cell.classList.remove('selected'));
  }

  showMessage = text => {
    document.getElementById('message').textContent = text;
  }
}

// Example philosophical puzzle
const puzzles = [
  {
    words: [
      'Being','Essence','Existence','Reality',
      'Virtue','Justice','Courage','Wisdom',
      'Utilitarianism','Golden Mean','Eudaimonia','Imperative',
      'Dialectic','Phenomenology','Ontology','Socratic'
    ],
    groups: [
      { words: ['Being','Essence','Existence','Reality'], description: 'Metaphysical Concepts' },
      { words: ['Virtue','Justice','Courage','Wisdom'], description: 'Cardinal Virtues' },
      { words: ['Utilitarianism','Golden Mean','Eudaimonia','Imperative'], description: 'Ethical Theories' },
      { words: ['Dialectic','Phenomenology','Ontology','Socratic'], description: 'Philosophical Methods' }
    ]
  }
];

document.addEventListener('DOMContentLoaded', () => {
  new ConnectionGame(puzzles);
});
