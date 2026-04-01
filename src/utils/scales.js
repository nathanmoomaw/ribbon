// Intervals in semitones from root
export const SCALES = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  blues: [0, 3, 5, 6, 7, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
}

// Single-letter display labels for scale buttons
export const SCALE_LABELS = {
  chromatic: 'C',
  major: 'M',
  minor: 'm',
  blues: 'b',
  phrygian: 'P',
  'double harmonic': 'egg',
}

// Hidden scales — unlockable via easter eggs
export const HIDDEN_SCALES = {
  'double harmonic': [0, 1, 4, 5, 7, 8, 11],
}
