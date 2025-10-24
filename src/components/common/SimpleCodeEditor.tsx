/**
 * Simple Code Editor Component
 * 
 * A simple wrapper around CodeMirror 6 for use in dialogs and modals
 * Replaces Monaco Editor usage in QueryBuilder, IntelligentQueryEngine, etc.
 */

import React, { useRef } from 'react';
import { CodeMirrorEditor, type CodeMirrorEditorRef, basicPreset, createEditorTheme, getDialectExtensions, type QueryDialect } from '@/editor/cm6';
import { useTheme } from '@/components/providers/ThemeProvider';

interface SimpleCodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  height?: string;
  language?: QueryDialect;
  readOnly?: boolean;
  className?: string;
}

/**
 * Simple code editor component using CodeMirror 6
 */
export const SimpleCodeEditor: React.FC<SimpleCodeEditorProps> = ({
  value,
  onChange,
  height = '200px',
  language = 'sql',
  readOnly = false,
  className = '',
}) => {
  const editorRef = useRef<CodeMirrorEditorRef | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const handleChange = (newValue: string) => {
    onChange?.(newValue);
  };

  const extensions = [
    basicPreset({
      readOnly,
    }),
    ...createEditorTheme(isDark),
    ...getDialectExtensions(language),
  ];

  return (
    <div className={className}>
      <CodeMirrorEditor
        ref={editorRef}
        value={value}
        onChange={handleChange}
        extensions={extensions}
        height={height}
      />
    </div>
  );
};

export default SimpleCodeEditor;

