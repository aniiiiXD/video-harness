---
name: motion-review
description: Improve and verify product-film motion, scene variety, alignment and readability using full-cut playback and targeted frame inspection.
---

Review the actual film, not just the code. `vh validate .` checks structure, references and timing; it cannot judge visual quality or certify claims and licenses.

## Direct the motion

Give each move a purpose: reveal context, inspect evidence, connect states or emphasize a changed result. Use a short acceleration and eased landing. Zoom in logarithmic scale; avoid repeated bobbing, aimless drift and constant motion on every object. Choose speed from the action and amount of reading. A fast transition does not justify an unreadable result.

Use the supplied brand and choose a coherent visual language. Vary the form when the meaning changes: a route for a process, a dial for a parameter, a comparison for a decision, real footage for a place. Do not put every idea inside a browser rectangle. Preserve a clear visual hierarchy and sufficient contrast over footage. Do not copy another film's identity.

In Remotion, animate from `useCurrentFrame()`/`useVideoConfig()`, with clamped interpolation. No CSS animation clocks, unseeded randomness, timers or network-loaded state in the render path. Keep images in `public/`, use Remotion media components, and keep typography within safe frame boundaries. Load any custom fonts deterministically before measuring text.

## Review and fix

1. Build a complete cut and play it end to end. Note pacing, confusing actions and repeated imagery at timestamps.
2. Inspect entry, maximum zoom, result hold and exit for every scene. Include both sides of cuts and any overlapping transition. Render stills with one shared Remotion bundle where possible.
3. Check headings, source labels, text wrapping, safe margins, cursor targets, crop quality and numerically consistent examples. Read disclosures at playback size.
4. Fix visible defects, render the affected frames again, then verify their transitions. Automated checks supplement this pass.
5. Check the ending and, when audio exists, its timing and final decay. Do not add music when the user deferred it.

Use the storyboard to find review times. For an exported `out/film.mp4`, call the `review_frame` MCP tool with `projectId` and `atSeconds`, or run `vh review-frame . --at 8.5 --out out/review-8.5.jpg`. Both use FFmpeg on the host. Open the resulting image in a viewer or use a vision-capable reviewer. Compare the same time in the revised export to confirm the fix.

Report what you actually checked. Distinguish a preview, a rendered MP4 and a tested provider integration. Keep the original design and asset records with the editable project. A good-looking frame is not evidence that the entire film was watched.
