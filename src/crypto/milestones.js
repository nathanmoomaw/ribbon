/**
 * POAP Milestone tracking — stored in localStorage.
 * Each milestone triggers a toast notification when first achieved.
 */

const STORAGE_KEY = 'ribbon_milestones'

export const MILESTONES = {
  first_sound: {
    id: 'first_sound',
    name: 'First Sound',
    description: 'Played your first note on Puddle',
    icon: '🎵',
  },
  shared_preset: {
    id: 'shared_preset',
    name: 'Sound Shaper',
    description: 'Created and shared a QR preset',
    icon: '📱',
  },
  shake_master: {
    id: 'shake_master',
    name: 'Shake Master',
    description: 'Triggered 100 shakes',
    icon: '⚡',
  },
  loop_creator: {
    id: 'loop_creator',
    name: 'Loop Creator',
    description: 'Recorded your first loop',
    icon: '🔁',
  },
  goop_artist: {
    id: 'goop_artist',
    name: 'Goop Artist',
    description: 'Gooped up 5 or more controls',
    icon: '🫧',
  },
  vcf_explorer: {
    id: 'vcf_explorer',
    name: 'VCF Explorer',
    description: 'Routed all 3 oscillators through the VCF',
    icon: '🎛️',
  },
  first_mint: {
    id: 'first_mint',
    name: 'Puddle Maker',
    description: 'Minted your first Puddle token on Base',
    icon: '✦',
  },
}

// Load milestone state from localStorage
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Save milestone state to localStorage
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Silently fail — localStorage may be full or blocked
  }
}

/**
 * Check and unlock a milestone.
 * Returns the milestone object if newly unlocked, null if already achieved.
 */
export function checkMilestone(milestoneId) {
  const state = loadState()
  if (state[milestoneId]) return null // already achieved

  state[milestoneId] = { achieved: true, date: new Date().toISOString() }
  saveState(state)

  return MILESTONES[milestoneId] || null
}

/**
 * Increment a counter-based milestone.
 * Returns the milestone object when threshold is reached, null otherwise.
 */
export function incrementMilestone(milestoneId, threshold) {
  const state = loadState()
  if (state[milestoneId]?.achieved) return null

  const count = (state[milestoneId]?.count || 0) + 1
  state[milestoneId] = { ...state[milestoneId], count }

  if (count >= threshold) {
    state[milestoneId].achieved = true
    state[milestoneId].date = new Date().toISOString()
    saveState(state)
    return MILESTONES[milestoneId] || null
  }

  saveState(state)
  return null
}

/**
 * Get all achieved milestones.
 */
export function getAchievedMilestones() {
  const state = loadState()
  return Object.entries(state)
    .filter(([, v]) => v.achieved)
    .map(([id]) => ({ ...MILESTONES[id], ...state[id] }))
}
