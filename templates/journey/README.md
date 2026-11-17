# Your product film

The included Relay journey is a fictional 31-second example. Replace its story and brand in `film.json`. Run your coding agent from this folder; `AGENTS.md` points to the included project-local skills.

```sh
vh setup .
vh storyboard .
vh validate .
vh preview .
```

Open the local preview URL printed in the terminal. After changes to `film.json`, rerun `vh build .` to update the generated timeline. The renderer watches source changes. Edit `src/Scene.jsx` to change the actual motion design. Rendering is explicit: `vh render .` writes `out/film.mp4`.

`design/request.fig` and `design/request.html` are original synthetic examples. With OpenPencil CLI installed:

```sh
openpencil find design/request.fig --type FRAME --json
vh pencil-export . design/request.fig --node 0:4 --id pencil-request --license MIT
```

Check the node ID against your file if edited. Set the workspace scene's asset to `pencil-request` to show that exported wireframe. The original SVG workspace is included for an immediate preview without OpenPencil installed.

Asset sources and rights live in `film.json`; import does not certify them. The project contains no API credentials. Share only assets and designs you have permission to distribute.
