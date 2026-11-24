import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Film,project,durationInFrames} from './timeline.generated';
import {loadProjectFonts} from './typography';
loadProjectFonts(project);
const Root=()=> <Composition id="Journey" component={Film} width={project.width} height={project.height} fps={project.fps} durationInFrames={durationInFrames}/>;
registerRoot(Root);
