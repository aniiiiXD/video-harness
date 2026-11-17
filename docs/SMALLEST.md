# Smallest.ai narration

Smallest.ai is the first TTS adapter. The host and project format remain independent of it: adapters implement `id`, `configured()`, `prepare(input)`, `listVoices()` and `synthesize(request)`. Synthesis returns audio bytes, an extension and measured duration. The workspace owns approval, storage and receipts. Currently the workspace importer expects WAV output; future adapters should return WAV or add explicit format handling.

Set `SMALLEST_API_KEY` on the host. Never put it in `film.json`. The adapter uses the official `POST https://api.smallest.ai/waves/v1/tts` endpoint with model `lightning_v3.1_pro`, WAV output at 24 kHz, and explicit language (default `en`). It obtains Pro voices from `GET /waves/v1/lightning-v3.1-pro/get_voices`. Select a compatible voice from that catalog; no specific voice is silently chosen.

MCP flow:

```json
{
  "projectId": "product-film",
  "provider": "smallest",
  "assetId": "intro-voice",
  "text": "Make intelligence your own.",
  "voiceId": "VOICE_ID_FROM_CATALOG",
  "language": "en",
  "speed": 1
}
```

Pass this to `tts_prepare`. The result contains the exact provider request, character count and `planId`. Preparation does not contact the provider. After the user authorizes that generation, call `tts_generate` with the project ID, plan ID and `approved: true`. The flag is a host/client assertion of consent, not a separate identity or billing-authorization system. Pricing is governed by the connected account; the harness does not claim a dollar estimate.

The server writes a durable claim before submission, makes one synthesis request, checks the WAV response and imports an audio asset with voice/model/duration provenance. It does not retry provider errors, timeouts or interrupted submissions automatically. Use `tts_status` after an interrupted call. Completed plans return the existing asset; uncertain outcomes require inspecting the provider account. If audio was saved but the import failed, execution can resume the local import without regenerating. Disk corruption, an orphaned partial import or manually edited receipts may still require operator repair. Do not delete claims to force a retry.

The script is stored locally in `.harness/speech/` and is sent to Smallest.ai only during synthesis. Keep this directory private and preserve it across host restarts. The harness does not override the provider's data retention policies or infer commercial usage rights from a successful API response. Imported narration starts unreviewed.

After listening, add the voice asset to `film.json`:

```json
{
  "audio": {"asset": "music-bed"},
  "narration": [
    {"asset": "intro-voice", "startSeconds": 0, "durationSeconds": 2.4, "volume": 1}
  ]
}
```

Use the actual measured duration returned by synthesis. The example assumes those two audio assets already exist. Narration and music play independently; automatic ducking, word timestamps, subtitle alignment and mastering are not included. Narration that exceeds the film duration is rejected. Extend the relevant scenes before attaching it.

Verified against official documentation on 2026-11-17:

- [Synthesize speech](https://docs.smallest.ai/api-reference/models/text-to-speech/synthesize-speech)
- [Pro voice catalog endpoint](https://docs.smallest.ai/models/changelog/lightning-v-3-1/2026/8/28)
- [Voice/model pairing](https://docs.smallest.ai/models/text-to-speech/voices-languages)

The adapter is tested with mock HTTP responses and synthetic WAVs. A live Smallest.ai generation has not been performed in this release; voice quality, account access and billable behavior remain unverified.
