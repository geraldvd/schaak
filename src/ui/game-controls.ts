import { GameMode, ColorChoice, type AIConfig } from '../types';

export interface GameControlsCallbacks {
  onNewGame: () => void;
  onUndo: () => void;
  onFlipBoard: () => void;
  onModeChange: (mode: GameMode) => void;
  onDepthChange: (depth: number) => void;
  onAIConfigChange: (config: AIConfig) => void;
  onColorChoiceChange: (choice: ColorChoice) => void;
}

export interface GameControls {
  setThinking(thinking: boolean): void;
  setMode(mode: GameMode): void;
  setDepth(depth: number): void;
  updateThinkingProgress(depth: number, maxDepth: number, nodes: number): void;
  showSearchResult(depth: number, nodes: number, timeMs: number, score: number): void;
  clearStats(): void;
}

export function createGameControls(callbacks: GameControlsCallbacks): GameControls {
  const container = document.getElementById('controls')!;
  const aiStatsEl = document.getElementById('ai-stats')!;
  container.innerHTML = '';

  // --- Quick Action Buttons ---
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
  container.appendChild(btnRow);

  // --- Thinking Indicator ---
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'thinking-indicator';
  thinkingDiv.style.display = 'none';
  thinkingDiv.id = 'thinking-indicator';

  const spinner = document.createElement('div');
  spinner.className = 'thinking-spinner';
  thinkingDiv.appendChild(spinner);
  const thinkingText = document.createElement('span');
  thinkingText.id = 'thinking-text';
  thinkingText.textContent = 'AI thinking...';
  thinkingDiv.appendChild(thinkingText);
  container.appendChild(thinkingDiv);

  // --- Settings Dialog ---
  const settingsDialog = document.getElementById('settings-dialog')!;
  const settingsBody = document.getElementById('settings-body')!;
  const settingsBtn = document.getElementById('settings-btn')!;
  const settingsClose = document.getElementById('settings-close')!;
  const settingsOverlay = settingsDialog.querySelector('.settings-overlay')!;

  function openSettings(): void {
    settingsDialog.classList.remove('hidden');
  }
  function closeSettings(): void {
    settingsDialog.classList.add('hidden');
  }

  settingsBtn.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', closeSettings);

  // Build settings body
  settingsBody.innerHTML = '';

  // --- Game Mode ---
  const modeGroup = createSettingGroup('Game Mode');
  const modeSelect = document.createElement('select');
  modeSelect.id = 'mode-select';

  const hvaiOption = document.createElement('option');
  hvaiOption.value = GameMode.HumanVsAI.toString();
  hvaiOption.textContent = 'Human vs AI';

  const hvhOption = document.createElement('option');
  hvhOption.value = GameMode.HumanVsHuman.toString();
  hvhOption.textContent = 'Human vs Human';

  modeSelect.appendChild(hvaiOption);
  modeSelect.appendChild(hvhOption);
  modeSelect.value = GameMode.HumanVsAI.toString();

  const aiSettingsSection = document.createElement('div');
  aiSettingsSection.id = 'ai-settings-section';

  modeSelect.addEventListener('change', () => {
    const mode = parseInt(modeSelect.value) as GameMode;
    aiSettingsSection.style.display = mode === GameMode.HumanVsAI ? 'block' : 'none';
    callbacks.onModeChange(mode);
  });

  modeGroup.appendChild(modeSelect);
  settingsBody.appendChild(modeGroup);

  // --- Play As (color choice) ---
  const colorGroup = createSettingGroup('Play as');
  const colorSelect = document.createElement('select');
  colorSelect.id = 'color-select';

  const colorOptions: { value: ColorChoice; label: string }[] = [
    { value: ColorChoice.Random, label: 'Random' },
    { value: ColorChoice.White, label: 'White' },
    { value: ColorChoice.Black, label: 'Black' },
  ];

  for (const opt of colorOptions) {
    const el = document.createElement('option');
    el.value = opt.value.toString();
    el.textContent = opt.label;
    colorSelect.appendChild(el);
  }

  colorSelect.addEventListener('change', () => {
    callbacks.onColorChoiceChange(parseInt(colorSelect.value) as ColorChoice);
  });

  colorGroup.appendChild(colorSelect);
  aiSettingsSection.appendChild(colorGroup);

  // --- AI Depth ---
  const depthGroup = createSettingGroup('Search Depth');
  const depthRow = document.createElement('div');
  depthRow.className = 'setting-slider-row';

  const depthSlider = document.createElement('input');
  depthSlider.type = 'range';
  depthSlider.min = '1';
  depthSlider.max = '8';
  depthSlider.value = '5';
  depthSlider.id = 'depth-slider';

  const depthValue = document.createElement('span');
  depthValue.className = 'setting-value';
  depthValue.textContent = '5';

  depthSlider.addEventListener('input', () => {
    depthValue.textContent = depthSlider.value;
    callbacks.onDepthChange(parseInt(depthSlider.value));
    updateAIConfig();
  });

  const depthHint = document.createElement('div');
  depthHint.className = 'setting-hint';
  depthHint.textContent = 'Higher = stronger but slower';

  depthRow.appendChild(depthSlider);
  depthRow.appendChild(depthValue);
  depthGroup.appendChild(depthRow);
  depthGroup.appendChild(depthHint);
  aiSettingsSection.appendChild(depthGroup);

  // --- Style (Aggression) ---
  const styleGroup = createSettingGroup('Play Style');
  const styleRow = document.createElement('div');
  styleRow.className = 'setting-slider-row';

  const styleLabels = document.createElement('div');
  styleLabels.className = 'setting-labels';
  styleLabels.innerHTML = '<span>Defensive</span><span>Balanced</span><span>Aggressive</span>';

  const styleSlider = document.createElement('input');
  styleSlider.type = 'range';
  styleSlider.min = '-50';
  styleSlider.max = '50';
  styleSlider.value = '0';
  styleSlider.id = 'style-slider';

  const styleValue = document.createElement('span');
  styleValue.className = 'setting-value';
  styleValue.textContent = '0';

  styleSlider.addEventListener('input', () => {
    styleValue.textContent = styleSlider.value;
    updateAIConfig();
  });

  styleRow.appendChild(styleSlider);
  styleRow.appendChild(styleValue);
  styleGroup.appendChild(styleRow);
  styleGroup.appendChild(styleLabels);
  aiSettingsSection.appendChild(styleGroup);

  // --- Opening Book ---
  const bookGroup = createSettingGroup('Opening Book');
  const bookRow = document.createElement('div');
  bookRow.className = 'setting-toggle-row';

  const bookLabel = document.createElement('span');
  bookLabel.textContent = 'Use opening book';
  const bookToggle = document.createElement('input');
  bookToggle.type = 'checkbox';
  bookToggle.checked = true;
  bookToggle.id = 'book-toggle';
  bookToggle.className = 'toggle-checkbox';

  bookToggle.addEventListener('change', () => {
    updateAIConfig();
  });

  bookRow.appendChild(bookLabel);
  bookRow.appendChild(bookToggle);
  bookGroup.appendChild(bookRow);
  aiSettingsSection.appendChild(bookGroup);

  // --- Randomness ---
  const randGroup = createSettingGroup('Randomness');
  const randRow = document.createElement('div');
  randRow.className = 'setting-slider-row';

  const randLabels = document.createElement('div');
  randLabels.className = 'setting-labels';
  randLabels.innerHTML = '<span>Precise</span><span>Varied</span>';

  const randSlider = document.createElement('input');
  randSlider.type = 'range';
  randSlider.min = '0';
  randSlider.max = '50';
  randSlider.value = '0';
  randSlider.id = 'rand-slider';

  const randValue = document.createElement('span');
  randValue.className = 'setting-value';
  randValue.textContent = '0';

  const randHint = document.createElement('div');
  randHint.className = 'setting-hint';
  randHint.textContent = 'Adds randomness to make AI less predictable';

  randSlider.addEventListener('input', () => {
    randValue.textContent = randSlider.value;
    updateAIConfig();
  });

  randRow.appendChild(randSlider);
  randRow.appendChild(randValue);
  randGroup.appendChild(randRow);
  randGroup.appendChild(randLabels);
  randGroup.appendChild(randHint);
  aiSettingsSection.appendChild(randGroup);

  // --- Min. Answer Time ---
  const timeGroup = createSettingGroup('Min. Answer Time');
  const timeRow = document.createElement('div');
  timeRow.className = 'setting-slider-row';

  const timeSlider = document.createElement('input');
  timeSlider.type = 'range';
  timeSlider.min = '0';
  timeSlider.max = '5';
  timeSlider.step = '0.5';
  timeSlider.value = '0';
  timeSlider.id = 'time-slider';

  const timeValue = document.createElement('span');
  timeValue.className = 'setting-value';
  timeValue.textContent = '0s';

  const timeHint = document.createElement('div');
  timeHint.className = 'setting-hint';
  timeHint.textContent = 'Minimum time before AI moves';

  timeSlider.addEventListener('input', () => {
    timeValue.textContent = timeSlider.value + 's';
    updateAIConfig();
  });

  timeRow.appendChild(timeSlider);
  timeRow.appendChild(timeValue);
  timeGroup.appendChild(timeRow);
  timeGroup.appendChild(timeHint);
  aiSettingsSection.appendChild(timeGroup);

  settingsBody.appendChild(aiSettingsSection);

  function updateAIConfig(): void {
    const config: AIConfig = {
      depth: parseInt(depthSlider.value),
      useBook: bookToggle.checked,
      aggression: parseInt(styleSlider.value),
      randomness: parseInt(randSlider.value),
      minAnswerTime: parseFloat(timeSlider.value),
    };
    callbacks.onAIConfigChange(config);
  }

  function createSettingGroup(label: string): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'setting-group';
    const title = document.createElement('label');
    title.className = 'setting-label';
    title.textContent = label;
    group.appendChild(title);
    return group;
  }

  // --- AI Stats Panel ---
  aiStatsEl.innerHTML = '';

  return {
    setThinking(thinking: boolean) {
      thinkingDiv.style.display = thinking ? 'flex' : 'none';
      undoBtn.disabled = thinking;
      newGameBtn.disabled = thinking;
    },
    setMode(mode: GameMode) {
      modeSelect.value = mode.toString();
      aiSettingsSection.style.display = mode === GameMode.HumanVsAI ? 'block' : 'none';
    },
    setDepth(depth: number) {
      depthSlider.value = depth.toString();
      depthValue.textContent = depth.toString();
    },
    updateThinkingProgress(depth: number, maxDepth: number, nodes: number) {
      const thinkText = document.getElementById('thinking-text');
      if (thinkText) {
        const nodesStr = nodes > 1000 ? `${(nodes / 1000).toFixed(1)}k` : nodes.toString();
        thinkText.textContent = `Thinking... depth ${depth}/${maxDepth}, ${nodesStr} positions`;
      }
    },
    showSearchResult(depth: number, nodes: number, timeMs: number, score: number) {
      aiStatsEl.classList.remove('hidden');
      const nodesStr = nodes > 1000000
        ? `${(nodes / 1000000).toFixed(1)}M`
        : nodes > 1000
          ? `${(nodes / 1000).toFixed(1)}k`
          : nodes.toString();
      const nps = timeMs > 0 ? Math.round(nodes / (timeMs / 1000)) : 0;
      const npsStr = nps > 1000000
        ? `${(nps / 1000000).toFixed(1)}M`
        : nps > 1000
          ? `${(nps / 1000).toFixed(0)}k`
          : nps.toString();
      const scoreStr = formatScore(score);
      aiStatsEl.innerHTML =
        `<div class="stat-row"><span>Depth</span><span>${depth}</span></div>` +
        `<div class="stat-row"><span>Positions</span><span>${nodesStr}</span></div>` +
        `<div class="stat-row"><span>Time</span><span>${timeMs}ms</span></div>` +
        `<div class="stat-row"><span>Speed</span><span>${npsStr}/s</span></div>` +
        `<div class="stat-row"><span>Eval</span><span>${scoreStr}</span></div>`;
    },
    clearStats() {
      aiStatsEl.classList.add('hidden');
      aiStatsEl.innerHTML = '';
    },
  };
}

function formatScore(score: number): string {
  const MATE_SCORE = 900000;
  if (Math.abs(score) > MATE_SCORE - 200) {
    const movesToMate = Math.ceil((MATE_SCORE - Math.abs(score)) / 2);
    return score > 0 ? `M${movesToMate}` : `-M${movesToMate}`;
  }
  const pawns = score / 100;
  return (pawns >= 0 ? '+' : '') + pawns.toFixed(1);
}
