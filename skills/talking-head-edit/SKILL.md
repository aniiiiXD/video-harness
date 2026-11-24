---
name: talking-head-edit
description: Edit supplied talking-head footage with a reviewed transcript, speech-timed captions, animated titles behind the face, and camera moves timed to speech.
---

Use the earliest readable source clip and keep the edit as a separate project or export. Work from the actual words in the source audio. Get word-level timestamps and correct uncertain words using the recording, surrounding speech, and supplied product names. A transcription tool and speech synthesis serve different jobs.

## Direct the edit

- Group the transcript into readable captions, with the active word highlighted if it helps follow the speech. Keep these captions in a stable position within the delivery frame.
- Choose a few short phrases from the transcript for large, speech-timed titles. For **behind the face**, put their letterforms across the face at eye or cheek height, with room to see letters on either side. Inspect the result as the person moves. A masthead above the hair has a different effect.
- Stack the original picture at the back, the animated title next, and a synchronized cutout of the person above it. Transform these three layers together for a camera move. Place the readable captions in front. A still portrait needs one matte and moving footage needs a mask sequence.
- Tie an entry, hold, or punch-in to the word or idea it emphasizes. Keep the camera and title movement paced for a short clip, and adjust their position around the subject. Use the supplied font or choose a face suited to the footage.
- Keep the speaker's original audio synchronized. When trimming or rearranging the picture, map word timings from source time to edit time before animating the text.

## Work and review

For an upright SDR clip on a Mac, read [local-render.md](references/local-render.md) to transcribe locally and run the bundled face-title renderer from a timed plan. With a different renderer, use the same layer order, a time-aligned portrait matte, and editable cues.

Check the beginning, the strongest occlusion, each title change, and the end. The text should disappear behind the face with stable edges. Check the captions at phone size, the voice after any cuts, and the exported duration. Keep the cue plan with the project for revisions.

The MCP resource carries these instructions. A coding agent with the full skill folder and host access runs the local helper.
