/**
 * CodeMirror 6 Preset Configuration
 *
 * Provides a comprehensive set of extensions for a fully-featured code editor
 * including history, search, folding, bracket matching, multi-cursor, theming, and VS Code-style keybindings
 */

import { Extension, EditorSelection } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, KeyBinding } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { foldGutter, indentOnInput, bracketMatching, foldKeymap, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';

/**
 * Preset configuration options
 */
export interface PresetOptions {
  // Basic features
  lineNumbers?: boolean;
  highlightActiveLineGutter?: boolean;
  highlightSpecialChars?: boolean;
  history?: boolean;
  foldGutter?: boolean;
  drawSelection?: boolean;
  dropCursor?: boolean;
  allowMultipleSelections?: boolean;
  indentOnInput?: boolean;
  syntaxHighlighting?: boolean;

  // Advanced features
  bracketMatching?: boolean;
  closeBrackets?: boolean;
  autocompletion?: boolean;
  rectangularSelection?: boolean;
  crosshairCursor?: boolean;
  highlightActiveLine?: boolean;
  highlightSelectionMatches?: boolean;

  // Keymaps
  closeBracketsKeymap?: boolean;
  defaultKeymap?: boolean;
  searchKeymap?: boolean;
  historyKeymap?: boolean;
  foldKeymap?: boolean;
  completionKeymap?: boolean;
  lintKeymap?: boolean;
  vscodeKeymap?: boolean; // VS Code-style keybindings

  // Editor settings
  tabSize?: number;
  indentUnit?: string;
  lineWrapping?: boolean;
  readOnly?: boolean;
  editable?: boolean;

  // Callbacks
  onExecute?: () => void;
  onFormat?: () => void;
}

/**
 * Default preset options
 */
const defaultOptions: PresetOptions = {
  lineNumbers: true,
  highlightActiveLineGutter: true,
  highlightSpecialChars: true,
  history: true,
  foldGutter: false, // Disabled to avoid duplicate fold gutters (language extensions may provide their own)
  drawSelection: true,
  dropCursor: true,
  allowMultipleSelections: true,
  indentOnInput: true,
  syntaxHighlighting: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: true,
  rectangularSelection: true,
  crosshairCursor: false,
  highlightActiveLine: true,
  highlightSelectionMatches: true,
  closeBracketsKeymap: true,
  defaultKeymap: true,
  searchKeymap: true,
  historyKeymap: true,
  foldKeymap: true,
  completionKeymap: true,
  lintKeymap: true,
  vscodeKeymap: true,
  tabSize: 2,
  indentUnit: '  ',
  lineWrapping: true,
  readOnly: false,
  editable: true,
};

/**
 * Create a basic preset with common editor features
 */
export function basicPreset(options: PresetOptions = {}): Extension[] {
  const opts = { ...defaultOptions, ...options };
  const extensions: Extension[] = [];

  // Basic features
  if (opts.lineNumbers) extensions.push(lineNumbers());
  if (opts.highlightActiveLineGutter) extensions.push(highlightActiveLineGutter());
  if (opts.highlightSpecialChars) extensions.push(highlightSpecialChars());
  if (opts.history) extensions.push(history());
  if (opts.foldGutter) extensions.push(foldGutter());
  if (opts.drawSelection) extensions.push(drawSelection());
  if (opts.dropCursor) extensions.push(dropCursor());
  if (opts.indentOnInput) extensions.push(indentOnInput());
  if (opts.syntaxHighlighting) extensions.push(syntaxHighlighting(defaultHighlightStyle, { fallback: true }));

  // Advanced features
  if (opts.bracketMatching) extensions.push(bracketMatching());
  if (opts.closeBrackets) extensions.push(closeBrackets());
  if (opts.autocompletion) extensions.push(autocompletion());
  if (opts.rectangularSelection) extensions.push(rectangularSelection());
  if (opts.crosshairCursor) extensions.push(crosshairCursor());
  if (opts.highlightActiveLine) extensions.push(highlightActiveLine());
  if (opts.highlightSelectionMatches) extensions.push(highlightSelectionMatches());

  // Keymaps - order matters, later keymaps have priority
  const keymaps: Extension[] = [];

  if (opts.closeBracketsKeymap) keymaps.push(keymap.of(closeBracketsKeymap));
  if (opts.searchKeymap) keymaps.push(keymap.of(searchKeymap));
  if (opts.historyKeymap) keymaps.push(keymap.of(historyKeymap));
  if (opts.foldKeymap) keymaps.push(keymap.of(foldKeymap));
  if (opts.completionKeymap) keymaps.push(keymap.of(completionKeymap));
  if (opts.lintKeymap) keymaps.push(keymap.of(lintKeymap));

  // Add indentWithTab for better tab handling
  keymaps.push(keymap.of([indentWithTab]));

  // Add clipboard keybindings with proper event handling
  keymaps.push(keymap.of(createClipboardKeybindings()));

  // Use default keymap for other operations
  if (opts.defaultKeymap) keymaps.push(keymap.of(defaultKeymap));

  // VS Code-style keybindings (Cmd/Ctrl+D for multi-cursor, etc.)
  if (opts.vscodeKeymap) {
    keymaps.push(keymap.of(createVSCodeKeybindings(opts.onExecute, opts.onFormat)));
  }

  extensions.push(...keymaps);

  // Editor configuration
  if (opts.tabSize) {
    extensions.push(EditorView.editorAttributes.of({ 'data-tab-size': opts.tabSize.toString() }));
  }

  if (opts.lineWrapping) {
    extensions.push(EditorView.lineWrapping);
  }

  if (opts.readOnly) {
    extensions.push(EditorView.editable.of(false));
  } else if (opts.editable !== undefined) {
    extensions.push(EditorView.editable.of(opts.editable));
  }

  // Add DOM event handlers for paste events
  // This handles right-click paste and other paste methods
  // For desktop apps, we should NOT prevent default paste behavior
  // Let the browser handle it naturally
  extensions.push(
    EditorView.domEventHandlers({
      paste: (event: ClipboardEvent, view: EditorView) => {
        console.log('📋 [Clipboard] DOM paste event triggered', {
          hasClipboardData: !!event.clipboardData,
          types: event.clipboardData?.types,
        });

        // Try to get text from the clipboard event
        const clipboardText = event.clipboardData?.getData('text/plain');

        if (clipboardText) {
          console.log('📋 [Clipboard] Got text from clipboard event:', clipboardText.length, 'chars');
          // Let CodeMirror handle the paste naturally
          // Don't prevent default - this allows native paste to work
          console.log('✅ [Clipboard] Allowing native paste');
          return false; // Let CodeMirror handle it
        }

        console.log('⚠️ [Clipboard] No data in clipboard event');
        return false; // Let CodeMirror try to handle it
      },
    })
  );

  return extensions;
}

/**
 * Create clipboard keybindings
 *
 * Uses Tauri's native clipboard API to avoid browser permission prompts.
 * This is a desktop-only application, so we use the native API for better UX.
 */
function createClipboardKeybindings(): KeyBinding[] {
  return [
    // Copy: Mod-c
    {
      key: 'Mod-c',
      run: (view) => {
        const selection = view.state.selection.main;

        // If no selection, let browser handle (copy line)
        if (selection.empty) {
          return false;
        }

        const text = view.state.sliceDoc(selection.from, selection.to);

        // Use Tauri's native clipboard API
        writeText(text).catch(err => {
          console.error('❌ [Clipboard] Copy failed:', err);
        });

        return true;
      },
    },
    // Cut: Mod-x
    {
      key: 'Mod-x',
      run: (view) => {
        const selection = view.state.selection.main;

        // If no selection, let browser handle (cut line)
        if (selection.empty) {
          return false;
        }

        const text = view.state.sliceDoc(selection.from, selection.to);

        // Use Tauri's native clipboard API
        writeText(text).then(() => {
          // Delete the selected text
          view.dispatch({
            changes: { from: selection.from, to: selection.to },
            selection: { anchor: selection.from },
          });
        }).catch(err => {
          console.error('❌ [Clipboard] Cut failed:', err);
        });

        return true;
      },
    },
    // Paste: Mod-v
    // For desktop apps, let the browser/CodeMirror handle paste naturally
    // Don't override the default paste behavior
    {
      key: 'Mod-v',
      run: (view) => {
        console.log('📋 [Clipboard] Paste keybinding triggered - using native paste');
        // Return false to let CodeMirror's default paste handler work
        // This will use the browser's native clipboard API
        return false;
      },
    },
  ];
}

/**
 * VS Code-style keybindings
 */
function createVSCodeKeybindings(onExecute?: () => void, onFormat?: () => void) {
  return [
  // Cmd/Ctrl+D for select next occurrence (multi-cursor)
  {
    key: 'Mod-d',
    run: (view: EditorView) => {
      const selection = view.state.selection.main;
      if (selection.empty) {
        // Select word at cursor
        const word = view.state.wordAt(selection.head);
        if (word) {
          view.dispatch({
            selection: { anchor: word.from, head: word.to },
          });
        }
      } else {
        // Find next occurrence and add to selection
        const selectedText = view.state.sliceDoc(selection.from, selection.to);
        const searchFrom = selection.to;
        const doc = view.state.doc;
        const text = doc.toString();
        const nextIndex = text.indexOf(selectedText, searchFrom);
        
        if (nextIndex !== -1) {
          view.dispatch({
            selection: EditorSelection.create([
              ...view.state.selection.ranges,
              EditorSelection.range(nextIndex, nextIndex + selectedText.length),
            ], view.state.selection.ranges.length),
          });
        }
      }
      return true;
    },
  },
  // Cmd/Ctrl+/ for toggle line comment
  {
    key: 'Mod-/',
    run: (view: EditorView) => {
      // This will be implemented with language-specific comment support
      console.log('Toggle line comment');
      return true;
    },
  },
  // Alt+Up/Down for move line up/down
  {
    key: 'Alt-ArrowUp',
    run: (view: EditorView) => {
      console.log('Move line up');
      return true;
    },
  },
  {
    key: 'Alt-ArrowDown',
    run: (view: EditorView) => {
      console.log('Move line down');
      return true;
    },
  },
  // Cmd/Ctrl+Shift+K for delete line
  {
    key: 'Mod-Shift-k',
    run: (view: EditorView) => {
      const { state } = view;
      const changes = state.changeByRange((range) => {
        const line = state.doc.lineAt(range.head);
        return {
          changes: { from: line.from, to: line.to + 1 },
          range,
        };
      });
      view.dispatch(changes);
      return true;
    },
  },
  // Cmd/Ctrl+Enter for execute query
  {
    key: 'Mod-Enter',
    run: () => {
      if (onExecute) {
        onExecute();
      } else {
        // Fallback to custom event
        window.dispatchEvent(new CustomEvent('cm6:execute-query'));
      }
      return true;
    },
  },
  // Cmd/Ctrl+Shift+F for format
  {
    key: 'Mod-Shift-f',
    run: () => {
      if (onFormat) {
        onFormat();
      } else {
        // Fallback to custom event
        window.dispatchEvent(new CustomEvent('cm6:format'));
      }
      return true;
    },
  },
];
}

/**
 * Minimal preset with only essential features
 */
export function minimalPreset(options: Partial<PresetOptions> = {}): Extension[] {
  return basicPreset({
    lineNumbers: true,
    highlightSpecialChars: true,
    history: true,
    drawSelection: true,
    syntaxHighlighting: true,
    defaultKeymap: true,
    historyKeymap: true,
    ...options,
  });
}

/**
 * Full-featured preset with all available features
 */
export function fullPreset(options: Partial<PresetOptions> = {}): Extension[] {
  return basicPreset({
    ...defaultOptions,
    ...options,
  });
}

