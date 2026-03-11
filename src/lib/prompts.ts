import type { QualityMode } from '@/types/project';

export const MASTER_SYSTEM_PROMPT = `You are an expert AI assistant specialized in creating viral bunker restoration timelapse video projects. You generate creative concepts for abandoned military bunkers, Cold War shelters, and underground fortifications that can be visually transformed through a 9-scene restoration sequence.

Your outputs must be:
- Photorealistic and architecturally plausible
- Visually dramatic with strong before/after potential
- Geographically and historically accurate
- Suitable for vertical 9:16 video format
- Focused on real construction/restoration processes
- Worker and tool presence required for any visible structural repair
- No magical self-repair — all improvements must show construction equipment, scaffolding, or tool marks`;

export function getIdeaGenerationPrompt(): string {
  return `Generate exactly 10 unique bunker restoration video concepts. Each must be a distinct real-world military bunker type from a different location and era.

For each concept, return a JSON array with objects containing:
- "id": number (1-10)
- "title": string (specific bunker type name)
- "location": string (city/region, country)
- "era": string (decade or year)
- "description": string (2-3 sentences describing the bunker's current state and restoration potential)
- "visualHook": string (one compelling visual detail that makes this concept stand out)

Return ONLY the JSON array, no markdown formatting or code blocks.`;
}

export function getScenePlanPrompt(ideaTitle: string, ideaDescription: string): string {
  return `Create a detailed 9-scene bunker restoration plan for this concept:
Title: ${ideaTitle}
Description: ${ideaDescription}

The 9 scenes MUST follow this exact sequence:
1. Before - Abandoned state (atmosphere only: dust, decay, no workers)
2. Arrival - Team arrives on site (atmosphere only: vehicle tracks, fresh footprints in dust)
3. Exterior Work Start - Beginning exterior restoration (WORKERS REQUIRED: show scaffolding, power tools, welding equipment, construction materials)
4. Exterior Near Completion - Exterior nearly done (WORKERS REQUIRED: show scaffolding nearly complete, fresh concrete, finishing equipment)
5. Entering Underground - Camera enters the bunker interior (atmosphere only: beam of light entering, dust particles)
6. Interior Work In Progress - Active interior renovation (WORKERS REQUIRED: show interior scaffolding, work lights, debris removal equipment, cable installation)
7. Interior Finalization - Finishing touches (WORKERS REQUIRED: show finishing tools, paint equipment, lighting fixtures being mounted)
8. Interior Design Transformation - Design elements being placed (WORKERS REQUIRED: show furniture positioning, decorative panels, final adjustments)
9. Final Reveal - Fully restored, magazine-quality result (atmosphere only: pristine, well-lit, completed)

For EACH scene, return a JSON array with objects containing:
- "title": string (the scene name from above)
- "imagePrompt": string (detailed text-to-image prompt for Imagen 4. Must specify: same bunker structure, same camera angle, same framing, same environment, 9:16 vertical, photorealistic. DO NOT mention any people, workers, hands, or human figures - the image generator cannot render people. Show tools, equipment, scaffolding, and construction materials instead to imply worker presence.)
- "motionPrompt": string (short motion description for Veo video transition. Must be VERY restrained: minimal camera movement, no dramatic effects, construction timelapse style. Same bunker, same angle, same framing.)
- "narration": string (1-2 sentence voiceover narration for this scene)
- "notes": string (technical notes about maintaining continuity with previous scene)

CRITICAL RULES:
- Every prompt must maintain the EXACT same bunker identity, entrance geometry, and camera angle
- NEVER mention people, workers, humans, hands, or figures in imagePrompt
- For repair scenes (3,4,6,7,8): Show progress through tools, scaffolding, building materials, and equipment
- For atmosphere scenes (1,2,5,9): Show only environmental changes — dust, light, decay, or pristine state
- NO magical self-repair. Structural changes must have visible tool/equipment evidence
- Motion prompts must be minimal — x1 speed, no dramatic camera movement, no orbit, no zoom

Return ONLY the JSON array, no markdown formatting or code blocks.`;
}

export function getAudioPlanPrompt(scenes: { title: string; narration: string }[]): string {
  const sceneList = scenes.map((s, i) => `Scene ${i + 1} (${s.title}): ${s.narration}`).join('\n');
  return `Create a complete audio plan for this 9-scene bunker restoration video.

Scenes:
${sceneList}

Return a JSON object with:
- "fullScript": string (the complete voiceover script, scene by scene, with [Scene X] markers)
- "sceneNarrations": string[] (array of 9 narration texts, polished and broadcast-ready)
- "ambienceNotes": string[] (array of 9 ambient sound descriptions)
- "sfxNotes": string[] (array of 9 sound effect cues)

Return ONLY the JSON object, no markdown formatting or code blocks.`;
}

/**
 * Build a strict pair transition prompt.
 * Prioritizes image pair fidelity over creative interpretation.
 */
export function buildStrictTransitionPrompt(
  motionPrompt: string,
  settings: { motionStrength: number; cameraIntensity: number; realismPriority: number; morphSuppression: number; continuityStrictness: number },
  startSceneTitle: string,
  endSceneTitle: string,
  hasRepairActivity: boolean
): string {
  const workerNote = hasRepairActivity
    ? 'Visible construction progress: tools, scaffolding, equipment marks present.'
    : 'Atmosphere only: dust, light changes, no structural modification.';

  return `${motionPrompt}

STRICT CONSTRAINTS:
- Same bunker structure, same entrance geometry
- Same camera angle, same framing, same composition
- Same environment, same structural proportions
- Minimal realistic changes only
- No dramatic motion, no orbit, no camera swing
- No fast zoom, no redesign, no magical self-repair
- No random workers, no random objects, no heavy morphing
- Motion strength: ${settings.motionStrength}/100
- Camera intensity: ${settings.cameraIntensity}/100
- Realism priority: ${settings.realismPriority}%
- Morph suppression: ${settings.morphSuppression}%
- Continuity strictness: ${settings.continuityStrictness}%
- ${workerNote}
- Image A (${startSceneTitle}) evolving into Image B (${endSceneTitle})
- Prioritize the image pair over any style interpretation`;
}

/**
 * Build a continuity review prompt for Gemini to analyze scene images.
 */
export function getContinuityReviewPrompt(): string {
  return `You are analyzing a sequence of 9 bunker restoration scene images for visual continuity.

Check each consecutive pair of images for:
1. BUNKER IDENTITY: Is it the same bunker structure throughout?
2. ENTRANCE GEOMETRY: Does the entrance shape/size stay consistent?
3. CAMERA ANGLE: Is the viewing angle maintained?
4. FRAMING: Is the composition consistent?
5. ENVIRONMENT: Are surrounding elements stable?
6. STAGE PROGRESSION: Does the restoration progress logically?
7. WORKER LOGIC: For repair scenes (3,4,6,7,8), are there visible construction cues? For atmosphere scenes (1,2,5,9), is there NO magical repair?

For each issue found, return a JSON array of flag objects:
- "sceneIndex": number (0-8, which scene has the issue)
- "type": "identity" | "angle" | "framing" | "environment" | "progression" | "worker-logic"
- "message": string (brief description of the drift/issue)
- "severity": "warning" | "error"

If all scenes pass, return an empty array: []

Return ONLY the JSON array, no markdown or code blocks.`;
}
