import { useState, useEffect, useCallback } from 'react'
import './MilestoneToast.css'

/**
 * Achievement notification toast — slides in when a POAP milestone is unlocked.
 */
export function MilestoneToast({ milestone, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!milestone) return

    // Slide in
    requestAnimationFrame(() => setVisible(true))

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss?.(), 300)
    }, 4000)

    return () => clearTimeout(timer)
  }, [milestone, onDismiss])

  if (!milestone) return null

  return (
    <div className={`milestone-toast ${visible ? 'milestone-toast--visible' : ''}`}>
      <span className="milestone-toast__icon">{milestone.icon}</span>
      <div className="milestone-toast__content">
        <div className="milestone-toast__title">{milestone.name}</div>
        <div className="milestone-toast__desc">{milestone.description}</div>
      </div>
      <div className="milestone-toast__badge">POAP</div>
    </div>
  )
}

/**
 * Hook to manage milestone toast queue.
 * Returns [currentMilestone, showMilestone, dismissMilestone]
 */
export function useMilestoneToast() {
  const [queue, setQueue] = useState([])
  const [current, setCurrent] = useState(null)

  const show = useCallback((milestone) => {
    if (!milestone) return
    setQueue(prev => [...prev, milestone])
  }, [])

  const dismiss = useCallback(() => {
    setCurrent(null)
  }, [])

  // Pop from queue when current is cleared
  useEffect(() => {
    if (current || queue.length === 0) return
    const [next, ...rest] = queue
    setCurrent(next)
    setQueue(rest)
  }, [current, queue])

  return { current, show, dismiss }
}
