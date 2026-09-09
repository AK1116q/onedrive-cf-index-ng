import { useEffect, useState } from 'react'

const INTRO_KEY = 'archive-intro-seen-v1'

export default function CinematicChrome() {
  const [introVisible, setIntroVisible] = useState(true)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion || sessionStorage.getItem(INTRO_KEY)) {
      setIntroVisible(false)
      return
    }

    sessionStorage.setItem(INTRO_KEY, '1')
    const timer = window.setTimeout(() => setIntroVisible(false), 1900)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      <div className="archive-background" aria-hidden="true">
        <div className="archive-background__orb archive-background__orb--one" />
        <div className="archive-background__orb archive-background__orb--two" />
        <div className="archive-background__beam" />
        <div className="archive-background__grid" />
      </div>

      {introVisible && (
        <div className="archive-intro" aria-label="正在进入看番云盘">
          <div className="archive-intro__slice archive-intro__slice--one" />
          <div className="archive-intro__slice archive-intro__slice--two" />
          <div className="archive-intro__content">
            <div className="archive-intro__eyebrow">ANIME · ARCHIVE</div>
            <div className="archive-intro__title">看番云盘</div>
            <div className="archive-intro__line"><span /></div>
            <div className="archive-intro__status">CONNECTING TO ONEDRIVE</div>
          </div>
        </div>
      )}
    </>
  )
}
