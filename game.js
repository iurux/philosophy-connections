class ConnectionGame {
  constructor(puzzles) {
    this.puzzles = puzzles;
    // 0 = not started, 1 = in‐progress, 2 = completed correctly, 3 = failed
    this.progress = Array(puzzles.length).fill(0);
    this.currentIndex = null;
    this.selected = [];
    this.foundGroups = [];
    this.submissionChances = 5;
    this.bindUI();
    this.resetGame();  // always load the first puzzle (index 0) initially
  }

  bindUI = () => {
    document
      .getElementById('shuffleBtn')
      .addEventListener('click', () => this.shuffleGrid());

    document
      .getElementById('deselectBtn')
      .addEventListener('click', () => this.clearSelection());

    document
      .getElementById('submitBtn')
      .addEventListener('click', () => this.onSubmit());

    document
      .getElementById('helpBtn')
      .addEventListener('click', () => this.toggleModal('helpModal'));

    document
      .getElementById('statsBtn')
      .addEventListener('click', () => this.toggleModal('statsModal'));

    // New: Hint button opens hintModal
    document
      .getElementById('hintBtn')
      .addEventListener('click', () => this.showHint());

    document.querySelectorAll('.close-modal').forEach((span) => {
      const modalId = span.dataset.modal;
      span.addEventListener('click', () => this.toggleModal(modalId));
    });

    window.addEventListener('click', (e) => {
      const helpModal = document.getElementById('helpModal');
      const statsModal = document.getElementById('statsModal');
      const hintModal = document.getElementById('hintModal');
      if (e.target === helpModal) helpModal.style.display = 'none';
      if (e.target === statsModal) statsModal.style.display = 'none';
      if (e.target === hintModal) hintModal.style.display = 'none';
    });
  };

  /**
   * If puzzleIndex is provided, load that puzzle.
   * Otherwise, always load index 0 on initial load.
   */
  resetGame = (puzzleIndex = null) => {
    this.selected = [];
    this.foundGroups = [];
    this.submissionChances = 5;

    if (puzzleIndex !== null) {
      this.currentIndex = puzzleIndex;
    } else {
      this.currentIndex = 0;
    }

    // Mark “in‐progress” if not yet started
    if (this.progress[this.currentIndex] === 0) {
      this.progress[this.currentIndex] = 1;
    }

    document.getElementById('found-container').innerHTML = '';

    // Deep‐clone and derive words from groups
    const base = JSON.parse(
      JSON.stringify(this.puzzles[this.currentIndex])
    );
    base.words = base.groups.flatMap((g) => g.words);

    this.current = base;
    this.allWords = this.shuffleArray(this.current.words);

    this.renderGrid();
    this.updateButtons();
    this.updateChancesUI();

    // Update archive via archive.js
    updateArchive(
      this.progress,
      this.puzzles,
      (idx) => this.resetGame(idx)
    );
  };

  shuffleArray = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  renderGrid = () => {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    this.allWords.forEach((word) => {
      const cell = document.createElement('div');
      cell.textContent = word;
      cell.className = 'cell';

      for (let grpIdx of this.foundGroups) {
        if (this.current.groups[grpIdx].words.includes(word)) {
          cell.classList.add('found');
        }
      }

      cell.addEventListener('click', () => this.toggleSelect(cell, word));
      grid.appendChild(cell);
    });
  };

  toggleSelect = (cell, word) => {
    if (cell.classList.contains('found')) return;

    const idx = this.selected.indexOf(word);
    if (idx > -1) {
      this.selected.splice(idx, 1);
      cell.classList.remove('selected');
    } else if (this.selected.length < 4) {
      this.selected.push(word);
      cell.classList.add('selected');
    }

    this.updateButtons();
  };

  updateButtons = () => {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled =
      this.selected.length !== 4 || this.submissionChances <= 0;
  };

  onSubmit = () => {
    const selectedCells = Array.from(
      document.querySelectorAll('.cell.selected:not(.found)')
    );
    if (selectedCells.length !== 4 || this.submissionChances <= 0) return;

    // Animate each selected cell in sequence (100ms apart)
    selectedCells.forEach((cell, i) => {
      setTimeout(() => {
        cell.classList.add('checking');
        cell.addEventListener(
          'animationend',
          () => cell.classList.remove('checking'),
          { once: true }
        );
      }, i * 100);
    });

    // After the last cell’s jump ends, evaluate
    const lastCell = selectedCells[selectedCells.length - 1];
    lastCell.addEventListener(
      'animationend',
      () => {
        this.checkSelection(selectedCells);
      },
      { once: true }
    );
  };

  checkSelection = (selectedCells) => {
    const words = selectedCells.map((c) => c.textContent);
    const matchIndex = this.current.groups.findIndex((group) =>
      group.words.every((w) => words.includes(w))
    );

    if (matchIndex > -1 && !this.foundGroups.includes(matchIndex)) {
      // Correct: show found bar, remove cells
      this.foundGroups.push(matchIndex);
      this.createFoundBar(matchIndex, true);
      this.removeFoundCells(this.current.groups[matchIndex].words);

      // If all groups found → completed correctly
      if (this.foundGroups.length === this.current.groups.length) {
        this.progress[this.currentIndex] = 2; // completed correctly
        updateArchive(
          this.progress,
          this.puzzles,
          (idx) => this.resetGame(idx)
        );
      }
    } else {
      // Wrong: decrement chance, animate wrong cells
      this.submissionChances -= 1;
      this.updateChancesUI();
      this.animateWrongCells(selectedCells);

      // If no chances left → failed
      if (this.submissionChances <= 0) {
        this.progress[this.currentIndex] = 3; // failed
        updateArchive(
          this.progress,
          this.puzzles,
          (idx) => this.resetGame(idx)
        );
        this.revealAllRemaining();
      }
    }

    this.clearSelection();
  };

  removeFoundCells = (wordsArray) => {
    document.querySelectorAll('.cell').forEach((cell) => {
      if (wordsArray.includes(cell.textContent)) {
        cell.remove();
      }
    });
  };

  createFoundBar = (groupIndex, correct) => {
    const { description, words } = this.current.groups[groupIndex];
    const bar = document.createElement('div');
    bar.className = 'found-bar hidden';

    const titleEl = document.createElement('div');
    titleEl.className = 'found-title';
    titleEl.textContent = description;

    const wordsEl = document.createElement('div');
    wordsEl.className = 'found-words';
    wordsEl.textContent = words.join(', ');

    bar.appendChild(titleEl);
    bar.appendChild(wordsEl);

    const container = document.getElementById('found-container');
    container.appendChild(bar);

    requestAnimationFrame(() => {
      bar.classList.add('visible');
      bar.classList.remove('hidden');
      if (correct) {
        this.animateCorrectBar(bar);
      }
    });
  };

  revealAllRemaining = () => {
    this.current.groups.forEach((group, idx) => {
      if (!this.foundGroups.includes(idx)) {
        this.foundGroups.push(idx);
        this.createFoundBar(idx, false);
        this.removeFoundCells(group.words);
      }
    });
  };

  clearSelection = () => {
    this.selected = [];
    document.querySelectorAll('.cell.selected').forEach((cell) =>
      cell.classList.remove('selected')
    );
    this.updateButtons();
  };

  shuffleGrid = () => {
    const currentCells = Array.from(document.querySelectorAll('.cell')).map(
      (c) => c.textContent
    );
    const shuffled = this.shuffleArray(currentCells);

    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    shuffled.forEach((word) => {
      const cell = document.createElement('div');
      cell.textContent = word;
      cell.className = 'cell';
      cell.addEventListener('click', () => this.toggleSelect(cell, word));
      grid.appendChild(cell);
    });
    this.clearSelection();
  };

  updateChancesUI = () => {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      dot.style.opacity = i < this.submissionChances ? '1' : '0.2';
    });

    if (this.submissionChances <= 0) {
      document.getElementById('submitBtn').disabled = true;
    }
  };

  toggleModal = (modalId) => {
    const modal = document.getElementById(modalId);
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
  };

  showHint = () => {
    // Populate hint list with the four group descriptions
    const hintList = document.getElementById('hint-list');
    hintList.innerHTML = '';
    this.current.groups.forEach((grp) => {
      const li = document.createElement('li');
      li.textContent = grp.description;
      hintList.appendChild(li);
    });
    // Open the modal
    this.toggleModal('hintModal');
  };

  animateCorrectBar = (barElement) => {
    barElement.classList.add('correct-animation');
    barElement.addEventListener(
      'animationend',
      () => barElement.classList.remove('correct-animation'),
      { once: true }
    );
  };

  animateWrongCells = (cells) => {
    cells.forEach((cell) => {
      setTimeout(() => {
        cell.classList.add('wrong-check');
        cell.addEventListener(
          'animationend',
          () => cell.classList.remove('wrong-check'),
          { once: true }
        );
      }, 400); // after checking jump ends
    });
  };
}

// Example puzzles array (each defines only `groups`)
const puzzles = [
  {
    name: 'Philosophy Puzzle 1',
    groups: [
      {
        words: ['DIVE', 'ESTABLISHMENT', 'HAUNT', 'JOINT'],
        description: 'LOCAL WATERING HOLE'
      },
      {
        words: ['FENCE', 'RIDE', 'SHOOT', 'SWIM'],
        description: 'COMPETE IN A MODERN PENTATHLON'
      },
      {
        words: ['CINCH', 'GUARANTEE', 'ICE', 'LOCK'],
        description: 'ENSURE, AS A VICTORY'
      },
      {
        words: ['HEDGE', 'MUTUAL', 'SLUSH', 'TRUST'],
        description: '___ FUND'
      }
    ]
  },
  {
    name: 'Philosophy Puzzle 2',
    groups: [
      {
        words: ['Being', 'Essence', 'Existence', 'Reality'],
        description: 'Metaphysical Concepts'
      },
      {
        words: ['Virtue', 'Justice', 'Courage', 'Wisdom'],
        description: 'Cardinal Virtues'
      },
      {
        words: [
          'Utilitarianism',
          'Eudaimonia',
          'Golden Mean',
          'Imperative'
        ],
        description: 'Ethical Theories'
      },
      {
        words: ['Dialectic', 'Phenomenology', 'Ontology', 'Socratic'],
        description: 'Philosophical Methods'
      }
    ]
  }
  // …add more puzzles as needed…
];

document.addEventListener('DOMContentLoaded', () => {
  new ConnectionGame(puzzles);
});
