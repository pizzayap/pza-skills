# Codex Browser Evidence Recipes

Use these recipes only when the active browser surface exposes the matching capability. Follow the browser documentation returned in the current session when it differs from these examples.

## Compact Style Probe

Prefer a small, representative computed-style result over a full HTML or CSS dump. Run a read-only page evaluation similar to this and retain only fields that affect the recreation:

```javascript
const designEvidence = await tab.playwright.evaluate(() => {
  const properties = [
    "display", "position", "color", "backgroundColor", "fontFamily",
    "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform",
    "width", "maxWidth", "minHeight", "padding", "margin", "gap",
    "border", "borderRadius", "boxShadow", "opacity", "overflow",
    "transition", "animationName", "animationDuration", "transform",
  ];

  const describe = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
      ariaLabel: element.getAttribute("aria-label"),
      classes: [...element.classList].slice(0, 8),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      styles: Object.fromEntries(properties.map((name) => [name, style[name]])),
    };
  };

  const sample = (selector, limit) =>
    [...document.querySelectorAll(selector)]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
      })
      .slice(0, limit)
      .map(describe);

  const rootStyle = getComputedStyle(document.documentElement);
  const rootVariables = {};
  for (const name of rootStyle) {
    if (name.startsWith("--")) rootVariables[name] = rootStyle.getPropertyValue(name).trim();
  }

  const fonts = [];
  if (document.fonts?.forEach) {
    document.fonts.forEach((font) => {
      fonts.push({ family: font.family, weight: font.weight, style: font.style, status: font.status });
    });
  }

  return {
    page: { title: document.title, url: location.href },
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    rootVariables,
    fonts,
    samples: {
      body: sample("body", 1),
      landmarks: sample("header, nav, main, section, footer", 16),
      headings: sample("h1, h2, h3", 16),
      controls: sample("button, [role='button'], input, textarea, select", 16),
      links: sample("a[href]", 12),
      media: sample("img, picture, video, svg", 16),
    },
  };
});
```

This is a sampling aid, not a complete design-system detector. Add selectors for visually important components the generic probe misses. Avoid returning page-wide `innerHTML`, all text, every node, or all CSS declarations; those usually add noise and may reproduce excessive third-party content.

## Experiential Runtime Probe

Use a separate compact probe when the page may contain WebGL, custom scrolling, or substantial runtime motion:

```javascript
const experienceEvidence = await tab.playwright.evaluate(() => {
  const canvases = [...document.querySelectorAll("canvas")].map((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const style = getComputedStyle(canvas);
    return {
      backingSize: [canvas.width, canvas.height],
      cssSize: [Math.round(rect.width), Math.round(rect.height)],
      position: style.position,
      zIndex: style.zIndex,
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      classes: [...canvas.classList].slice(0, 8),
    };
  });

  const possibleScrollers = [
    document.scrollingElement,
    ...document.querySelectorAll(
      "body, main, [data-scroll], [data-lenis], [class*='scroll'], [class*='lenis'], [style*='overflow']",
    ),
  ].filter(Boolean);

  const scrollOwners = [...new Set(possibleScrollers)]
    .map((element) => {
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id,
        classes: [...element.classList].slice(0, 8),
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        clientSize: [element.clientWidth, element.clientHeight],
        scrollSize: [element.scrollWidth, element.scrollHeight],
      };
    })
    .filter((item) => item.scrollSize[0] > item.clientSize[0] + 8 || item.scrollSize[1] > item.clientSize[1] + 8)
    .slice(0, 24);

  const animations = document.getAnimations ? document.getAnimations() : [];
  const resources = window.performance?.getEntriesByType
    ? window.performance.getEntriesByType("resource").map((entry) => entry.name)
    : [];

  return {
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    documentScroll: {
      clientHeight: document.documentElement.clientHeight,
      scrollHeight: document.documentElement.scrollHeight,
      overflow: getComputedStyle(document.documentElement).overflow,
    },
    canvases,
    scrollOwners,
    media: {
      videoCount: document.querySelectorAll("video").length,
      audioCount: document.querySelectorAll("audio").length,
      iframeCount: document.querySelectorAll("iframe").length,
    },
    webAnimationCount: animations.length,
    resourceApiAvailable: Boolean(window.performance?.getEntriesByType),
    interestingResourceUrls: resources
      .filter((url) => /(?:three|gsap|lenis|webgl|shader|\.glb|\.gltf|\.hdr|\.exr|\.ktx2?|\.basis|\.glsl|\.wgsl|\.vert|\.frag|\.wasm)/i.test(url))
      .slice(0, 60),
    globalHints: {
      THREE: Boolean(window.THREE),
      gsap: Boolean(window.gsap),
      ScrollTrigger: Boolean(window.ScrollTrigger),
      Lenis: Boolean(window.Lenis),
    },
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
});
```

Capability checks are intentional. Some browser sandboxes do not expose `performance` or `document.getAnimations`. Bundled libraries may not create globals. Zero returned animations or false runtime globals never proves the page is static.

Do not call `getContext()` on a source canvas merely to identify its renderer. Use canvas geometry, asset/resource evidence, DOM hints, screenshots, and behavior without perturbing the running page.

## Structure

Use a fresh DOM or accessibility snapshot to identify semantic page order and interactive controls. Re-read it after opening a menu, tab, accordion, or dialog; node indexes may change after every interaction.

Use element roles, labels, text, or stable test IDs before coordinate clicks. After any interaction, inspect the new state before continuing.

## Screenshots And Viewports

Capture entry before settled overview images; see the fresh-entry section below. Set the verification viewport before navigation when supported, then capture normal/full-page views after entry. Use these viewport calls only when current browser documentation exposes this exact capability:

```javascript
const viewport = await browser.capabilities.get("viewport");
try {
  await viewport.set({ width: 1440, height: 900 });
  // Navigate and capture entry, then settled desktop evidence.
  await viewport.set({ width: 390, height: 844 });
  // Capture mobile evidence, including fresh entry when relevant.
} finally {
  await viewport.reset();
}
```

Capture the local implementation at identical dimensions. Reset the override even if a later capture fails. A full-page screenshot is useful for rhythm and section order; viewport crops are better for typography, controls, and fine alignment.

On custom smooth-scroll sites, the document may report a one-viewport height while a nested element owns tens of thousands of scroll pixels. Scroll over the detected owner and capture named viewport states. A browser “full-page” screenshot may otherwise repeat or freeze a single canvas state.

## Fresh Entry And Preloader Capture

Do not call a generic wait-for-load helper before collecting the first entry evidence. When the browser surface allows it, create a fresh task-scoped tab/context, set the viewport, start a short recording or immediate snapshot sequence, and only then navigate to the target. Repeat once in the same context for warm-load behavior. Never clear unrelated browser storage or cookies.

A new tab does not prove fresh storage or cache. If no isolated context is available, record the actual context and mark first-visit conditions unverified. Some surfaces navigate during tab creation and return only after load; document missed phases rather than assuming pre-navigation capture is possible.

After the visual sequence completes, a compact read-only probe can corroborate navigation timing and residual loader state:

```javascript
const entryEvidence = await tab.playwright.evaluate(() => {
  const nav = window.performance?.getEntriesByType?.("navigation")?.[0];
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  };
  const loaderCandidates = [...document.querySelectorAll(
    "[data-loader], [data-preloader], [aria-busy='true'], [class*='preloader'], [class*='loader']",
  )].slice(0, 24).map((element) => ({
    tag: element.tagName.toLowerCase(),
    id: element.id,
    classes: [...element.classList].slice(0, 8),
    visible: visible(element),
    ariaBusy: element.getAttribute("aria-busy"),
    text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
  }));

  return {
    readyState: document.readyState,
    navigationType: nav?.type,
    timings: nav ? {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      responseEnd: Math.round(nav.responseEnd),
    } : null,
    bodyOverflow: getComputedStyle(document.body).overflow,
    documentBusy: document.documentElement.getAttribute("aria-busy"),
    loaderCandidates,
  };
});
```

Selector names and navigation timings are corroborating signals, not proof of the loader's appearance or choreography. Use the captured frames/recording for visual facts. Record when a surface cannot start capture early enough, emulate reduced motion, or throttle a fresh context instead of claiming those states were verified.

## Page Assets

After visible lazy-loaded sections have been observed, inventory the browser-known assets:

```javascript
const pageAssets = await tab.capabilities.get("pageAssets");
const inventory = await pageAssets.list();
```

Summarize counts by kind and keep the inventory ID. Prefer a narrow bundle:

```javascript
const bundle = await pageAssets.bundle({
  inventoryId: inventory.id,
  kinds: ["image", "font", "stylesheet"],
});
```

Use `assetIds` instead of `kinds` when only a few files matter. Copy a returned temporary bundle into the workspace only when persistent evidence or authorized implementation requires it. Preserve the generated manifest and original URLs. Never navigate directly to each asset URL simply to fetch it, and never bundle scripts by default.

For experiential sites, inspect filenames and URLs in every asset kind, including `other`. GLB/glTF models, KTX/KTX2/Basis textures, HDR/EXR environments, GLSL/WGSL shader files, WASM decoders, and numbered image sequences often appear there even when runtime library globals are hidden.

## Evidence Hygiene

- Record browser state and viewport with every screenshot or measurement.
- If cookie banners or region selectors alter the page, record the chosen state.
- Note failed assets, cross-origin stylesheets, missing fonts, and dynamically changing content.
- Separate source-page evidence from local-implementation evidence.
- Treat visual comparison as required proof for a fidelity claim; static checks alone are not visual proof.
