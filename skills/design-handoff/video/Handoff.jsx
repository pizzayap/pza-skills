import React from "react"
import { AbsoluteFill, Sequence, continueRender, delayRender } from "remotion"
import { ActBar, C, Caption } from "./parts.jsx"
import { SCENES } from "./scenes.jsx"

// Hold the first frame until the bundled fonts are ready, so no frame renders in a fallback face.
if (typeof document !== "undefined") {
  const handle = delayRender("Loading fonts")
  Promise.all([
    document.fonts.load('500 64px "Inter Variable"'),
    document.fonts.load('italic 400 64px "Instrument Serif"'),
  ])
    .catch(() => null)
    .then(() => continueRender(handle))
}

const NO_BAR = new Set(["title", "end"])

export const Handoff = ({ scenes = [], acts = [], accent = "#1f56c9", presenter, title, captions = true }) => (
  <AbsoluteFill style={{ background: C.paper }}>
    {scenes.map((s, i) => {
      const Scene = SCENES[s.type]
      if (!Scene) return null
      return (
        <Sequence key={i} from={s.from} durationInFrames={s.dur} name={`${i} ${s.type}`}>
          <Scene d={s.d} lines={s.lines} dur={s.dur} accent={accent} presenter={presenter} />
          {NO_BAR.has(s.type) ? null : <ActBar acts={acts} current={s.act} title={title} accent={accent} />}
        </Sequence>
      )
    })}
    {captions
      ? scenes.flatMap((s, i) =>
          s.lines.map((l, k) => (
            <Sequence key={`c${i}-${k}`} from={s.from + l.from} durationInFrames={l.dur} name={`caption ${i}.${k}`} layout="none">
              <Caption text={l.text} />
            </Sequence>
          )),
        )
      : null}
  </AbsoluteFill>
)
