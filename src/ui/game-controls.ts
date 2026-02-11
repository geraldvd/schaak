import { GameMode } from '../types';

export interface GameControlsCallbacks {
  onNewGame: () => void;
  onUndo: () => void;
  onFlipBoard: () => void;
  onModeChange: (mode: GameMode) => void;
  onDepthChange: (depth: number) => void;
}

export interface GameControls {
  setThinking(thinking: boolean): void;
  setMode(mode: GameMode): void;
  setDepth(depth: number): void;
}

export function createGameControls(callbacks: GameControlsCallbacks): GameControls {
  const container = document.getElementById('controls')!;
  container.innerHTML = '';

  // Button row: New Game + Undo
  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';

  const newGameBtn = document.createElement('button');
  newGameBtn.textContent = 'New Game';
  newGameBtn.className = 'primary';
  newGameBtn.addEventListener('click', callbacks.onNewGame);

  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Undo';
  undoBtn.addEventListener('click', callbacks.onUndo);

  const flipBtn = document.createElement('button');
  flipBtn.textContent = 'Flip';
  flipBtn.addEventListener('click', callbacks.onFlipBoard);

  btnRow.appendChild(newGameBtn);
  btnRow.appendChild(undoBtn);
  btnRow.appendChild(flipBtn);

  // Mode select
  const modeDiv = document.createElement('div');
  modeDiv.className = 'mode-select';
  const modeLabel = document.createElement('span');
  modeLabel.textContent = 'Mode:';
  const modeSelect = document.createElement('select');
  modeSelect.id = 'mode-select';

  const hvhOption = document.createElement('option');
  hvhOption.value = GameMode.HumanVsHuman.toString();
  hvhOption.textContent = 'Human vs Human';

  const hvaiOption = document.createElement('option');
  hvaiOption.value = GameMode.HumanVsAI.toString();
  hvaiOption.textContent = 'Human vs AI';

  modeSelect.appendChild(hvhOption);
  modeSelect.appendChild(hvaiOption);
  modeSelect.addEventListener('change', () => {
    const mode = parseInt(modeSelect.value) as GameMode;
    callbacks.onModeChange(mode);
    depthDiv.style.display = mode === GameMode.HumanVsAI ? 'flex' : 'none';
  });

  modeDiv.appendChild(modeLabel);
  modeDiv.appendChild(modeSelect);

  // Depth slider
  const depthDiv = document.createElement('div');
  depthDiv.className = 'depth-control';
  depthDiv.style.display = 'none';

  const depthLabel = document.createElement('span');
  depthLabel.textContent = 'Depth:';

  const depthSlider = document.createElement('input');
  depthSlider.type = 'range';
  depthSlider.min = '3';
  depthSlider.max = '8';
  depthSlider.value = '5';
  depthSlider.id = 'depth-slider';

  const depthValue = document.createElement('span');
  depthValue.className = 'depth-value';
  depthValue.textContent = depthSlider.value;

  depthSlider.addEventListener('input', () => {
    depthValue.textContent = depthSlider.value;
    callbacks.onDepthChange(parseInt(depthSlider.value));
  });

  depthDiv.appendChild(depthLabel);
  depthDiv.appendChild(depthSlider);
  depthDiv.appendChild(depthValue);

  // Thinking indicator
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'thinking-indicator';
  thinkingDiv.style.display = 'none';
  thinkingDiv.id = 'thinking-indicator';

  const spinner = document.createElement('div');
  spinner.className = 'thinking-spinner';
  thinkingDiv.appendChild(spinner);
  const thinkingText = document.createElement('span');
  thinkingText.textContent = 'AI thinking...';
  thinkingDiv.appendChild(thinkingText);

  container.appendChild(btnRow);
  container.appendChild(modeDiv);
  container.appendChild(depthDiv);
  container.appendChild(thinkingDiv);

  return {
    setThinking(thinking: boolean) {
      thinkingDiv.style.display = thinking ? 'flex' : 'none';
      undoBtn.disabled = thinking;
      newGameBtn.disabled = thinking;
    },
    setMode(mode: GameMode) {
      modeSelect.value = mode.toString();
      depthDiv.style.display = mode === GameMode.HumanVsAI ? 'flex' : 'none';
    },
    setDepth(depth: number) {
      depthSlider.value = depth.toString();
      depthValue.textContent = depth.toString();
    },
  };
}
