---
name: motion-typography
description: Direct and render typography for video, including opening titles, kinetic type, product labels, and captions. Use when the user asks for designer-led text, custom fonts, or a distinct treatment for a film.
---

## Direct the type

1. Give the words a job in the shot. A title can carry a beat, a label can guide a viewer through the UI, and a caption can keep speech readable. Choose the most important line and give it a clear place in the frame.
2. Look at the person's footage, brand, subject, and rhythm. Use a supplied family when it fits. A second face earns its place through a distinct role, such as a serif opener with a simple caption face. Test the actual words, including any diacritics and numerals.
3. Compose a still frame before animating it. Decide the line breaks, left edge or center axis, size, weight, tracking, and line spacing. Relate the type to an existing edge, a sightline, a shape, or the negative space in a shot. Check it at delivery size.
4. Use a cut for immediate reading, a mask when an edge or a reveal motivates it, or a fade when the shot needs a softer entrance. Let the line settle while it is being read. Time expressive changes to a cut, a sound, or a meaningful word. Change the scale or placement across shots when the story calls for it.
5. For speech, keep caption groups aligned and time changes to the actual recording. Treat behind-the-face titles as an expressive layer. Review both layers for occlusion and legibility with [talking-head-edit](../talking-head-edit/SKILL.md).

## Choose a direction for this film

- **Editorial.** Try a display serif such as Instrument Serif, a deliberate two-line break, and a held cut into the title. Use the frame margins and the line ending to give the words their character.
- **Product.** Start with the product's own face. Let a short title or callout share a baseline with the UI it explains. Give a key label a mask reveal when a button, panel edge, or camera move gives the mask a purpose.
- **Kinetic.** Try a condensed face such as Barlow Condensed at a scale the footage can support. Pick one strong word or phrase for the beat and give its final form a readable hold.

Studio Dumbar designed animated type for North Sea Jazz around the rhythm of live performance. Pentagram designed a Western-influenced face for *Landscapers* and projected it onto fabrics drawn from the story's visual world. Use the relation between topic, letterform, and motion as the reference. [North Sea Jazz](https://studiodumbar.com/work/north-sea-jazz) · [Landscapers](https://www.pentagram.com/work/landscapers)

## Work in the harness

Save the type direction and progress in the existing project brief. Import licensed font files with `vh import` and the `font` kind. Assign `display`, `body`, `face-title`, or `caption` with `--role`. A project can reuse a font asset in several roles. Use a static TTF or OTF when selecting a specific face for the talking-head renderer.

Use `vh fonts "quiet editorial" --role display` or MCP `fonts_search` to find candidates for the shot. The catalog describes what each face can convey and gives a treatment to try. Compare a few with the actual copy. Use `vh fetch-font <project> <catalog-id> --role <role>` or `font_fetch` to add one with its license. The Google provider can discover additional families by language and category.

Set `scene.typography` for a controlled title. It accepts a local font asset, a normalized text box, size relative to frame height, tracking, line height, alignment, weight, and a timed entrance. See the project format for the fields. In custom Remotion scenes, use the project font loader and family helper or follow the same local loading pattern.

Render or preview the real copy at the intended aspect ratio. Check the entrance, the reading hold, and the cut into the next shot. Inspect descenders, caption contrast, and any planned crop at phone size. Adjust the line, placement, or timing after seeing it.
