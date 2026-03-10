import type { QualityMode } from '@/types/project';

export const MASTER_SYSTEM_PROMPT = `You are an expert AI assistant specialized in creating viral bunker restoration timelapse video projects. You generate creative concepts for abandoned military bunkers, Cold War shelters, and underground fortifications that can be visually transformed through a 9-scene restoration sequence.

Your outputs must be:
- Photorealistic and architecturally plausible
- Visually dramatic with strong before/after potential
- Geographically and historically accurate
- Suitable for vertical 9:16 video format
- Focused on real construction/restoration processes`;

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
1. Before - Abandoned state
2. Arrival - Team arrives on site
3. Exterior Work Start - Beginning exterior restoration
4. Exterior Near Completion - Exterior nearly done
5. Entering Underground - Camera enters the bunker interior
6. Interior Work In Progress - Active interior renovation
7. Interior Finalization - Finishing touches
8. Interior Design Transformation - Design elements being placed
9. Final Reveal - Fully restored, magazine-quality result

For EACH scene, return a JSON array with objects containing:
- "title": string (the scene name from above)
- "imagePrompt": string (detailed text-to-image prompt for Imagen. Must specify: same bunker structure, same camera angle, same framing, same environment, 9:16 vertical, photorealistic. DO NOT mention any people, workers, hands, or human figures - the image generator cannot render people. Show tools, equipment, scaffolding, and construction materials instead.)
- "motionPrompt": string (short motion description for video transition. Must be restrained: minimal camera movement, no dramatic effects, construction timelapse style.)
- "narration": string (1-2 sentence voiceover narration for this scene)
- "notes": string (technical notes about maintaining continuity with previous scene)

CRITICAL RULES:
- Every prompt must maintain the EXACT same bunker identity, entrance geometry, and camera angle
- NEVER mention people, workers, humans, hands, or figures in imagePrompt - this will cause generation to fail
- Show progress through tools, scaffolding, building materials, and equipment instead of people
- Motion prompts must be minimal - x1 speed, no dramatic camera movement

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
