# Contributing

Start with a concrete product workflow, design import problem or rendering defect. Include the expected result, actual result, Node/OS versions and a minimal synthetic project. Do not attach credentials, private customer records or media you cannot redistribute.

Run `npm ci` to install the pinned MCP SDK and schema dependency, then `npm test`. Tests do not install renderer dependencies or spend provider credits. `vh init` creates an isolated film project; `vh setup` installs its pinned Remotion dependencies.

Keep timeline data in the manifest and motion design in scene components. Provider adapters should discover live capabilities, preserve source metadata and make spending explicit. Do not hide missing authentication or provider failures behind successful-looking mock output.

For behavior changes, add focused tests for the user-visible result or relevant failure mode. For scene changes, inspect actual frames at entry, closest zoom, result and exit. Describe exactly what was checked in the pull request.

The `skills/` directory contains original, focused SKILL.md instructions. Keep skills portable; avoid local paths and assumptions about installed plugins. Do not copy another skill pack without verifying and preserving its license.
