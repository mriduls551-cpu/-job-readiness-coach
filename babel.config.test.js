// Babel config used only by Jest (via babel-jest).
// Uses the Next.js preset so JSX, TypeScript, and module transforms work
// without needing the SWC native binary.
module.exports = {
  presets: [
    ['next/babel', { 'preset-react': { runtime: 'automatic' } }],
  ],
};
