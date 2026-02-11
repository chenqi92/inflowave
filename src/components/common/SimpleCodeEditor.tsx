/**
 * Simple Code Editor Component
 * 
 * A simple wrapper around CodeMirror 6 for use in dialogs and modals
 * Replaces Monaco Editor usage in QueryBuilder, IntelligentQueryEngine, etc.
 */

import React, { useRef } from 'react';
import { CodeMirrorEditor, type CodeMirrorEditorRef, getDialectExtensions, type QueryDialect } from '@/editor/cm6';


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

  const handleChange = (newValue: string) => {
    onChange?.(newValue);
  };

  const extensions = [
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
        readOnly={readOnly}
      />
    </div>
  );
};

export default SimpleCodeEditor;

