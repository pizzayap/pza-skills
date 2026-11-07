// Remotion entry for the handoff video. make-video.mjs bundles this file and passes the
// storyboard, already timed, as input props. Fonts ship with the skill (OFL), so rendering
// needs no network once the browser is downloaded.
import "@fontsource-variable/inter"
import "@fontsource/instrument-serif/400-italic.css"
import { registerRoot } from "remotion"
import { Root } from "./Root.jsx"

registerRoot(Root)
