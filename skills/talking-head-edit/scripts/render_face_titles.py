#!/usr/bin/env python3
"""Render a timed talking-head edit on macOS."""

import argparse
import json
import math
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw, ImageFilter, ImageFont


SYSTEM_FONTS = Path("/System/Library/Fonts/Supplemental")


def probe(source):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(source)],
        capture_output=True, text=True, check=True,
    )
    metadata = json.loads(result.stdout)
    video = next((stream for stream in metadata["streams"] if stream["codec_type"] == "video"), None)
    if video is None:
        raise ValueError("The source has no video stream.")
    width, height = video["width"], video["height"]
    if width % 2 or height % 2 or video.get("sample_aspect_ratio") not in (None, "N/A", "1:1"):
        raise ValueError("Prepare an upright, even-sized working clip with square pixels.")
    if video.get("color_transfer") in ("smpte2084", "arib-std-b67"):
        raise ValueError("Convert this HDR clip to SDR before using the face-title renderer.")
    duration = float(video.get("duration", metadata["format"]["duration"]))
    audio = next((stream["codec_name"] for stream in metadata["streams"] if stream["codec_type"] == "audio"), None)
    return (width, height), duration, float(video.get("start_time", 0)), audio


def number(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{label} must be a finite number.")
    return float(value)


def timed_text(items, duration, label):
    if not isinstance(items, list):
        raise ValueError(f"{label} must be a list of timed text cues.")
    previous_end = 0.0
    for item in items:
        if not isinstance(item, dict) or not isinstance(item.get("text"), str) or not item["text"].strip():
            raise ValueError(f"Every {label} cue needs text.")
        start = number(item.get("start"), f"{label} start")
        end = number(item.get("end"), f"{label} end")
        if not previous_end <= start < end <= duration + 0.001 or start >= duration:
            raise ValueError(f"Keep {label} cues in order, non-overlapping and within the clip.")
        previous_end = end
        yield {**item, "text": item["text"].strip(), "start": start, "end": min(end, duration)}


def camera_keyframes(items, duration):
    if not isinstance(items, list):
        raise ValueError("Camera keyframes must be a list.")
    previous_time = -1.0
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Every camera keyframe needs a time and scale.")
        at = number(item.get("at"), "Camera time")
        scale = number(item.get("scale"), "Camera scale")
        focus = item.get("focus", [0.5, 0.4])
        if not isinstance(focus, list) or len(focus) != 2:
            raise ValueError("Camera focus must contain an x and y position.")
        focus = [number(value, "Camera focus") for value in focus]
        if not (0 <= at <= duration and at > previous_time and 1 <= scale <= 3 and all(0 <= p <= 1 for p in focus)):
            raise ValueError("Use increasing in-clip camera times, scales from 1 to 3, and focus positions from 0 to 1.")
        previous_time = at
        yield {"at": at, "scale": scale, "focus": focus}


def fit_font(path, size, max_width, measure):
    font = ImageFont.truetype(str(path), size)
    while measure(font) > max_width:
        next_size = min(size - 1, int(size * max_width / measure(font)))
        if next_size < 8:
            raise ValueError("Use shorter text or a narrower font for this frame.")
        size = next_size
        font = ImageFont.truetype(str(path), size)
    return font


def title_layer(cue, dimensions, font_path):
    width, height = dimensions
    top = number(cue.get("top", 0.28), "Title top")
    if not 0 <= top <= 0.85:
        raise ValueError("Set title top between 0 and 0.85 of the frame height.")
    text = cue["text"]

    def glyph_width(font):
        left, _, right, _ = font.getbbox(text)
        return right - left

    font = fit_font(font_path, max(8, int(min(width * 0.56, height * 0.32))), width * 0.96, glyph_width)
    left, upper, right, lower = font.getbbox(text)
    x = (width - (right - left)) / 2 - left
    y = min(height * top, height * 0.90 - (lower - upper)) - upper
    shadow_mask = Image.new("L", dimensions)
    ImageDraw.Draw(shadow_mask).text((x, y + 3), text, font=font, fill=110)
    background = Image.new("RGBA", dimensions, (17, 13, 22, 0))
    background.putalpha(shadow_mask.filter(ImageFilter.GaussianBlur(3)))
    layer = Image.new("RGBA", dimensions)
    fill = (255, 209, 149, 255) if cue.get("accent") else (252, 241, 218, 255)
    ImageDraw.Draw(layer).text((x, y), text, font=font, fill=fill)
    return Image.alpha_composite(background, layer)


def caption_layers(group, dimensions, font_path):
    width, height = dimensions
    tokens = [cue["text"] for cue in group]

    def line_width(font):
        return sum(font.getlength(token) for token in tokens) + (len(tokens) - 1) * font.getlength(" ")

    size = max(8, round(min(width * 0.051, height * 0.048)))
    font = fit_font(font_path, size, width * 0.84, line_width)
    center_y = round(height * 0.88)
    pad_x, pad_y = max(5, round(width * 0.03)), max(4, round(font.size * 0.44))
    line = line_width(font)
    x_start = (width - line) / 2
    gap = font.getlength(" ")
    for active, cue in enumerate(group):
        layer = Image.new("RGBA", dimensions)
        draw = ImageDraw.Draw(layer)
        half_height = font.size / 2 + pad_y
        draw.rounded_rectangle(
            (x_start - pad_x, center_y - half_height, x_start + line + pad_x, center_y + half_height),
            radius=pad_y, fill=(17, 18, 25, 215),
        )
        x = x_start
        for index, token in enumerate(tokens):
            fill = (255, 211, 155, 255) if index == active else (249, 245, 239, 255)
            draw.text((x, center_y), token, font=font, anchor="lm", fill=fill)
            x += font.getlength(token) + gap
        end = group[active + 1]["start"] if active + 1 < len(group) else cue["end"]
        yield cue["start"], end, layer


def prepare(plan, folder, dimensions, duration, title_font, caption_font):
    if not isinstance(plan, dict) or set(plan) - {"titles", "captions", "camera"}:
        raise ValueError("The edit plan accepts titles, captions, and camera.")
    timeline = {"titles": [], "captions": [], "camera": list(camera_keyframes(plan.get("camera", []), duration))}
    for cue in timed_text(plan.get("titles", []), duration, "title"):
        name = f"title-{len(timeline['titles'])}.png"
        title_layer(cue, dimensions, title_font).save(folder / name)
        timeline["titles"].append({"start": cue["start"], "end": cue["end"], "file": name})
    previous_end = 0.0
    groups = plan.get("captions", [])
    if not isinstance(groups, list):
        raise ValueError("Captions must be a list of word groups.")
    for items in groups:
        group = list(timed_text(items, duration, "caption"))
        if not group or group[0]["start"] < previous_end:
            raise ValueError("Caption groups need words and must be ordered and non-overlapping.")
        previous_end = group[-1]["end"]
        for start, end, layer in caption_layers(group, dimensions, caption_font):
            name = f"caption-{len(timeline['captions'])}.png"
            layer.save(folder / name)
            timeline["captions"].append({"start": start, "end": end, "file": name})
    (folder / "layers.json").write_text(json.dumps(timeline), encoding="utf-8")


def project_font(project, role):
    if project is None:
        return None
    manifest = json.loads((project / "film.json").read_text(encoding="utf-8"))
    asset_id = manifest.get("brand", {}).get("fonts", {}).get(role)
    if asset_id is None:
        return None
    asset = next((item for item in manifest.get("assets", []) if item["id"] == asset_id), None)
    if asset is None or asset.get("kind") != "font":
        raise ValueError(f"The {role} role needs a font asset in film.json.")
    public = (project / "public").resolve()
    font = (public / asset["path"]).resolve()
    if not font.is_relative_to(public) or not font.is_file() or font.suffix.lower() not in (".ttf", ".otf"):
        raise ValueError(f"The {role} role needs a project-local .ttf or .otf font.")
    return font


def render(args):
    if sys.platform != "darwin":
        raise ValueError("This compositor runs on macOS with Swift and Apple Vision.")
    source, output = args.source.resolve(), args.output.absolute()
    if not source.is_file() or not os.access(source, os.R_OK):
        raise ValueError("Use a readable source clip.")
    if output.suffix.lower() != ".mp4" or output.exists() or output.is_symlink():
        raise ValueError("Choose a new .mp4 output path.")
    plan = json.loads(args.plan.read_text(encoding="utf-8"))
    title_font = args.title_font or project_font(args.project, "face-title") or SYSTEM_FONTS / "Georgia.ttf"
    caption_font = args.caption_font or project_font(args.project, "caption") or SYSTEM_FONTS / "Arial Bold.ttf"
    dimensions, duration, start, audio = probe(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix=".talking-head-", dir=output.parent) as temporary:
        folder = Path(temporary)
        prepare(plan, folder, dimensions, duration, title_font, caption_font)
        tool = Path(__file__).with_name("face_compositor.swift")
        executable = folder / "face-compositor"
        subprocess.run(["swiftc", "-O", "-suppress-warnings", str(tool), "-o", str(executable)], check=True)
        picture = folder / "picture.mp4"
        subprocess.run(
            [str(executable), str(source), str(folder / "layers.json"), str(picture)],
            check=True,
        )
        staged = folder / "edited.mp4"
        command = [
            "ffmpeg", "-nostdin", "-v", "error", "-n", "-copyts",
            "-i", str(picture), "-itsoffset", str(-start), "-i", str(source),
            "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "copy",
        ]
        if audio == "aac":
            command += ["-c:a", "copy"]
        elif audio:
            command += ["-c:a", "aac", "-b:a", "192k"]
        subprocess.run([*command, "-movflags", "+faststart", str(staged)], check=True)
        os.link(staged, output)
    print(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("plan", type=Path, help="JSON with timed titles, caption groups, and camera keyframes")
    parser.add_argument("output", type=Path)
    parser.add_argument("--project", type=Path, help="Use the face-title and caption fonts from this project's film.json")
    parser.add_argument("--title-font", type=Path)
    parser.add_argument("--caption-font", type=Path)
    try:
        render(parser.parse_args())
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        sys.exit(f"Face-title render failed. {error}")
