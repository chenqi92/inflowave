const fs = require('fs');
const path = require('path');

const dir = 'public/icons/completion';
const files = ['table', 'field', 'tag', 'keyword', 'function', 'type', 'constant'];

let output = `/**
 * Auto-generated SVG icon constants for CodeMirror completion icons
 * These are inlined to avoid path resolution issues in production builds
 * 
 * Generated from public/icons/completion/*.svg
 */

`;

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f + '.svg'), 'utf8')
    .replace(/\r?\n/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove fill colors to make icons colorable via CSS filter
  // Also remove unnecessary attributes to reduce size
  let cleanedContent = content
    .replace(/fill="#[0-9A-Fa-f]+"/g, 'fill="currentColor"')
    .replace(/\s*t="[^"]*"/g, '')
    .replace(/\s*class="[^"]*"/g, '')
    .replace(/\s*p-id="[^"]*"/g, '')
    .replace(/\s*id="[^"]*"/g, '');
  
  const varName = f.toUpperCase() + '_ICON_SVG';
  output += `export const ${varName} = \`${cleanedContent}\`;\n\n`;
});

// Create data URI helper
output += `/**
 * Helper function to create data URI from SVG string
 */
export function svgToDataUri(svg: string): string {
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
`;

fs.writeFileSync('src/editor/cm6/completionIcons.ts', output);
console.log('Created src/editor/cm6/completionIcons.ts');
