import {
  type WorkerSearchRequest,
  type WorkerSearchResult,
  type WorkerProgressUpdate,
  type WorkerMessage,
} from '../types';
import { SearchEngine } from '../ai/search';
import { cloneState } from '../engine/board';

const engine = new SearchEngine();

/**
 * Handle incoming search request from the main thread.
 */
function handleMessage(data: WorkerSearchRequest): void {
  const startTime = performance.now();

  // Clone state to avoid mutation issues
  const state = cloneState(data.state);

  const result = engine.search(state, {
    maxDepth: data.depth,
    positionHistory: data.positionHistory,
    onProgress: (update: WorkerProgressUpdate) => {
      self.postMessage(update);
    },
  });

  const timeMs = Math.round(performance.now() - startTime);

  if (result.bestMove) {
    const response: WorkerSearchResult = {
      type: 'result',
      bestMove: result.bestMove,
      score: result.score,
      depth: result.depth,
      nodesSearched: result.nodesSearched,
      timeMs,
    };
    self.postMessage(response);
  }
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  if (event.data.type === 'search') {
    handleMessage(event.data);
  }
};
