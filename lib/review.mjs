import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { containedFile } from './project.mjs';

const exec = promisify(execFile);
const exportPath = 'out/film.mp4';

async function runMediaTool(command, args, encoding) {
  try {
    const { stdout } = await exec(command, args, { encoding, timeout: 15000, maxBuffer: 8 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Install FFmpeg with ${command} on the host to inspect rendered frames`);
    throw new Error(`${command} could not read ${exportPath}`, { cause: error });
  }
}

export async function readReviewFrame(directory, atSeconds) {
  if (!Number.isFinite(atSeconds) || atSeconds < 0) {
    throw new Error('Review time must be a nonnegative number of seconds');
  }

  let video;
  try {
    video = await containedFile(directory, exportPath);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Render the film first to create ${exportPath}`);
    throw error;
  }

  const metadata = await runMediaTool('ffprobe', [
    '-v', 'error', '-protocol_whitelist', 'file', '-select_streams', 'v:0',
    '-show_entries', 'stream=duration,avg_frame_rate', '-of', 'json', video
  ], 'utf8');
  const stream = JSON.parse(metadata).streams?.[0];
  const duration = Number(stream?.duration);
  const [numerator, denominator] = (stream?.avg_frame_rate ?? '').split('/').map(Number);
  const fps = numerator / denominator;
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(fps) || fps <= 0) {
    throw new Error(`Could not read video timing from ${exportPath}`);
  }
  if (atSeconds >= duration) throw new Error(`No frame at ${atSeconds}s. Choose a time inside the export.`);

  // Seek at or just before the frame presented at this time in a constant-rate render.
  const frameTime = Math.floor(atSeconds * fps) / fps;
  const time = (Math.floor(frameTime * 1e6) / 1e6).toFixed(6);
  const frame = await runMediaTool('ffmpeg', [
    '-v', 'error', '-nostdin', '-ss', time, '-protocol_whitelist', 'file', '-i', video,
    '-map', '0:v:0', '-frames:v', '1',
    '-vf', "scale=w='min(iw,1920)':h='min(ih,1920)':force_original_aspect_ratio=decrease",
    '-c:v', 'mjpeg', '-pix_fmt', 'yuvj420p', '-q:v', '2', '-f', 'image2pipe', 'pipe:1'
  ], 'buffer');

  if (frame.length === 0) throw new Error(`No frame at ${atSeconds}s. Choose a time inside the export.`);
  return frame;
}
