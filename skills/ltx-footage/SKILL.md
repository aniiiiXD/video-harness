---
name: ltx-footage
description: Direct footage with an existing LTX runner and edit it into a Video Harness film. Use when a brief calls for LTX shots, image-to-video, or importing LTX clips.
---

# LTX footage

Read the film brief and identify where generated footage serves it. A short opener, transition, or illustrative cutaway can establish context. Use captured screens and observed results for product claims. Use the Journey Director skill to carry those sources into the timeline.

## Direct the shot

- Define what the viewer sees at the start, what moves, and where the shot should land. Give camera movement a purpose, such as revealing the subject or following a physical action.
- Choose framing, duration, and audio to fit the edit. Write a shot prompt with the subject, action, camera, lighting, and final composition. Reserve visible space for any typography the edit will add.
- Use image-to-video when a supplied still establishes the composition, subject, or art direction. Use text-to-video when the shot starts from a description. Use the reference and controls the available runner supports.

## Use the available runner

If the user supplied a finished clip, import it. To generate a shot, use the runner available to the agent and preserve its working settings.

- **ComfyUI.** Open the supplied workflow in its configured instance. Find the prompt, image conditioning, duration, size, and output nodes in that graph. Queue it with the existing UI or the agent's connected runner using the API-format workflow. Save the resulting MP4 and record the workflow version. [Lightricks ComfyUI workflows](https://github.com/Lightricks/ComfyUI-LTXVideo#example-workflows)
- **Python.** Run the supplied working command with the documented prompt, image input when available, and output path. Preserve the selected checkpoint and adapters. Stage the MP4 on the Video Harness host if the runner is remote. [Lightricks Python pipelines](https://github.com/Lightricks/LTX-2/blob/main/packages/ltx-pipelines/README.md)
- **Hosted LTX API.** Use the configured key to submit `POST /v2/text-to-video` or `POST /v2/image-to-video`. Pick model and output settings supported by the endpoint. For image-to-video, use the documented `image_uri`. Save the job ID and poll its `GET` endpoint at least five seconds apart. Download `result.video_url` promptly after completion. If a paid submission loses its response, check the provider for that job before submitting again. [LTX API quick start](https://docs.ltx.io/quickstart/) · [LTX job status and output retention](https://docs.ltx.io/async-jobs/)

Use the user's authorization for the chosen run, including any paid generation. When a job already exists, resume it by its ID and collect its output. Save the chosen prompt, model or workflow, and job ID or seed when available. Keep credentials and signed download URLs in the runner's environment or transient output.

## Edit the returned clip

1. Stage the MP4 inside the film project, for example `source/ltx/opening.mp4`. Check the dimensions, duration, and audio with FFprobe. Give the clip enough duration to cover its scene.
2. Call `asset_import` with the project-relative `file`, an `assetId`, `kind: "video"`, and the actual `source` and `license`. With the CLI, supply the file path from your working directory.

   ```sh
   node bin/vh.mjs import ./my-film ./my-film/source/ltx/opening.mp4 \
     --kind video --id ltx-opening --source "LTX / opening-shot workflow" --license pending-review
   ```

3. Reference the asset in a `footage` scene and mark generated illustration as `evidence.kind: "concept"`. Compose titles and captions in the editable scene. The starter footage renderer mutes clips. Mix any selected source audio deliberately with narration and music.
4. Use Motion Review on the cut. Play through the shot and its transitions. Inspect the peak crop and landing frame for continuity, legibility, and unwanted generated details. Use `review_frame` on the export to revisit exact moments after a revision.
