import React from "react"
import { Composition } from "remotion"
import { Handoff } from "./Handoff.jsx"

const sample = { fps: 30, total: 90, width: 1920, height: 1080, accent: "#1f56c9", acts: [], scenes: [] }

export const Root = () => (
  <Composition
    id="Handoff"
    component={Handoff}
    durationInFrames={90}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={sample}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, props.total),
      fps: props.fps,
      width: props.width,
      height: props.height,
    })}
  />
)
