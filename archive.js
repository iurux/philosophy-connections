/**
 * Renders the Archive list based on:
 *   - progress: an array of status codes (0..3)
 *   - puzzles: the same puzzles array passed to ConnectionGame
 *   - loadCallback: a function(index) → reload that puzzle
 *
 * Status codes:
 *   0 = not started    → ⚪
 *   1 = in-progress    → ◑
 *   2 = completed      → ✅
 *   3 = failed (ran out) → ❌
 */
function updateArchive(progress, puzzles, loadCallback) {
  const list = document.getElementById('archive-list');
  list.innerHTML = '';

  puzzles.forEach((puzzle, idx) => {
    const li = document.createElement('li');
    li.className = 'archive-item';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    switch (progress[idx]) {
      case 0:
        iconSpan.textContent = '⚪'; // Not started
        break;
      case 1:
        iconSpan.textContent = '◑'; // In-progress
        break;
      case 2:
        iconSpan.textContent = '✅'; // Completed correctly
        break;
      case 3:
        iconSpan.textContent = '❌'; // Failed (used up all chances)
        break;
      default:
        iconSpan.textContent = '⚪';
    }

    const link = document.createElement('a');
    link.textContent = puzzle.name || `Puzzle ${idx + 1}`;
    link.href = '#';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      loadCallback(idx);
    });

    li.appendChild(iconSpan);
    li.appendChild(link);
    list.appendChild(li);
  });
}
