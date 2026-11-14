// Cross-cutting state container: project + UI state + undo history.

import { deepClone } from './util.js';

const MAX_HISTORY = 60;
const COALESCE_MS = 700;

export function createStore(project) {
  const listeners = new Set();
  const history = [];
  const future = [];
  let lastKey = null;
  let lastAt = 0;
  let lastEditKey = null;

  const state = {
    project,
    ui: {
      lang: project.primaryLanguage || 'en_us',
      selection: { kind: 'book', id: null },
      previewMode: 'book',
      previewPage: 0,
      dirty: false,
      savedPath: null,
      problems: [],
      showProblems: false,
      zoom: false,
    },
  };

  const notify = (kind = 'all', detail = {}) => {
    for (const listener of listeners) listener(state, kind, detail);
  };

  const snapshot = () => {
    history.push(JSON.stringify(state.project));
    if (history.length > MAX_HISTORY) history.shift();
    future.length = 0;
  };

  return {
    state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    notify,
    /** Mutates the project. `coalesce` groups rapid edits (typing) into one undo step. */
    apply(mutator, { kind = 'structure', coalesce = null } = {}) {
      const now = Date.now();
      if (!coalesce || coalesce !== lastKey || now - lastAt > COALESCE_MS) snapshot();
      lastKey = coalesce;
      lastAt = now;
      mutator(state.project);
      state.ui.dirty = true;
      notify(kind);
    },
    /** Mutates UI state only. */
    setUi(patch, kind = 'selection') {
      Object.assign(state.ui, patch);
      notify(kind);
    },
    /**
     * Called when a form control receives focus: takes the "before" snapshot so
     * Ctrl+Z always restores the state before the edit burst.
     */
    beginEdit(key) {
      if (key && key === lastEditKey) return;
      lastEditKey = key || null;
      snapshot();
    },
    /** Called after a form control mutated the project in place. */
    notifyEdit(kind = 'field') {
      state.ui.dirty = true;
      lastAt = Date.now();
      notify(kind);
    },
    markSaved(savedPath = null) {
      state.ui.dirty = false;
      if (savedPath) state.ui.savedPath = savedPath;
      notify('status');
    },
    replaceProject(nextProject, { savedPath = null } = {}) {
      snapshot();
      state.project = nextProject;
      state.ui.lang = nextProject.primaryLanguage || 'en_us';
      state.ui.selection = { kind: 'book', id: null };
      state.ui.previewPage = 0;
      state.ui.dirty = false;
      state.ui.savedPath = savedPath;
      notify('all');
    },
    undo() {
      if (!history.length) return false;
      future.push(JSON.stringify(state.project));
      state.project = JSON.parse(history.pop());
      state.ui.dirty = true;
      notify('all');
      return true;
    },
    redo() {
      if (!future.length) return false;
      history.push(JSON.stringify(state.project));
      state.project = JSON.parse(future.pop());
      state.ui.dirty = true;
      notify('all');
      return true;
    },
    canUndo: () => history.length > 0,
    canRedo: () => future.length > 0,
  };
}

/** Resolves the currently selected node. */
export function currentSelection(state) {
  const { project, ui } = state;
  if (ui.selection.kind === 'category') {
    return project.categories.find((c) => c.id === ui.selection.id) || null;
  }
  if (ui.selection.kind === 'entry') {
    return project.entries.find((e) => e.id === ui.selection.id) || null;
  }
  return null;
}

export const cloneForUndo = deepClone;
