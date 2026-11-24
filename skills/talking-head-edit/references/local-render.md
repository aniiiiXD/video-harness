# Local talking-head edit

The compositor uses Apple Vision to generate a portrait matte and AVFoundation to preserve the picture timestamps. Use it on macOS with Swift, FFmpeg, FFprobe, and Python 3 with Pillow installed. Stage an upright SDR MP4 or MOV with even frame dimensions and square pixels. Normalize rotation or HDR to an upright SDR working clip when the source requires it. Review the normalized clip before timing the text.

## Get word timings

Use the transcript the user supplies if it includes reliable timings. When MLX Whisper and a model are already installed, point the transcriber at the local model directory.

```sh
ffmpeg -n -i original.mp4 -map 0:a:0 -ac 1 -ar 16000 speech.wav
HF_HUB_OFFLINE=1 python3 - speech.wav /path/to/local-whisper-model <<'PY'
import json
import sys
from pathlib import Path
import mlx_whisper

result = mlx_whisper.transcribe(sys.argv[1], path_or_hf_repo=sys.argv[2], word_timestamps=True)
Path("transcript.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
PY
```

Use the same working clip for transcription and rendering. If the audio starts after the picture, add that offset to the transcript's times. Listen again around unfamiliar names or low-confidence words. When context prompting helps, compare the result with the original pass and the speech. Use user-authorized media processing and delivery channels.

## Plan the edit

All times in the plan are seconds from the first video frame. Each caption group contains sequential words for one readable line. Title ranges and caption groups are ordered and non-overlapping on their respective tracks. Camera keyframes use a scale of 1 for the original view and an optional focus point in normalized coordinates measured from the top left.

```json
{
  "titles": [
    { "text": "first draft", "start": 0.7, "end": 1.8, "top": 0.28, "accent": true }
  ],
  "captions": [
    [
      { "text": "The", "start": 0.28, "end": 0.49 },
      { "text": "first", "start": 0.7, "end": 0.98 },
      { "text": "draft.", "start": 1.02, "end": 1.52 }
    ]
  ],
  "camera": [
    { "at": 0.7, "scale": 1 },
    { "at": 1.0, "scale": 1.09, "focus": [0.5, 0.38] }
  ]
}
```

Set each title's `top` to the visible top of its letters. Start near 0.28 for a centered portrait, then tune from a frame of the actual speaker. Use an empty or omitted track when the shot calls for a simpler edit. This helper works on a continuous clip. For cuts, prepare the cut and its output-time cue map first.

## Render and check

```sh
python3 /path/to/talking-head-edit/scripts/render_face_titles.py \
  original.mp4 edit.json revised.mp4 \
  --title-font /path/to/title.ttf --caption-font /path/to/captions.ttf
```

Pass `--project .` from a Video Harness project to use imported TTF or OTF assets assigned to the `face-title` and `caption` roles in `film.json`. The explicit font flags take precedence. The local defaults are Georgia and Arial Bold. The renderer reuses AAC audio packets. It encodes other input audio as AAC for the MP4. The original clip, transcript, and edit plan are the inputs for another revision.

Use FFprobe to check the streams and duration. Inspect frames where the head crosses the text and, when possible, play the complete cut with the audio. Review a short, representative segment before processing long or high-resolution footage.
