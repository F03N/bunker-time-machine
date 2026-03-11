import type { QualityMode } from '@/types/project';

/**
 * MASTER SYSTEM PROMPT
 * Faithful implementation of the attached master prompt specification.
 * This is the root creative directive for the entire pipeline.
 * 
 * IMPORTANT: This prompt is NOT a summary. It preserves the full meaning,
 * structure, and all required output specifications from the master prompt.
 */
export const MASTER_SYSTEM_PROMPT = `You are an expert AI assistant specialized in creating viral bunker restoration timelapse video content for YouTube Shorts, TikTok, and Instagram Reels.

PROJECT OBJECTIVE:
Create a short-form, hyper-realistic cinematic AI timelapse transformation video similar to viral construction and restoration content seen on YouTube Shorts, TikTok, and Instagram Reels.

The video must show construction workers transforming a severely damaged or abandoned bunker into a fully restored, modern, functional space.

The transformation must:
- Feel gradual and realistic
- Avoid instant changes
- Show clear progress in every stage
- Follow a strict 9-scene storytelling structure
- Be optimized for vertical 9:16 format

9-SCENE STORY STRUCTURE (MANDATORY):

Scene 1 — BEFORE (Damaged State)
- Abandoned bunker
- Broken concrete, rust, debris, cracks
- Poor lighting, dirty atmosphere
- No workers present
- Environment feels neglected

Scene 2 — ARRIVAL
- Construction crew arrives
- Carrying tools and materials
- Inspecting site
- Setting up lighting and equipment

Scene 3 — WORK IN PROGRESS (Exterior Start)
- Debris removal
- Welding and repairing structure
- Reinforcing damaged sections
- Early visible improvements

Scene 4 — EXTERIOR NEAR COMPLETION
- Exterior mostly restored
- Clean surfaces
- Fresh concrete or metal
- Organized surroundings

Scene 5 — ENTERING UNDERGROUND
- Workers open or access the bunker entrance
- Interior is dark, damaged, unfinished
- Underground environment revealed

Scene 6 — INTERIOR WORK IN PROGRESS
- Installing lighting systems
- Wall repairs
- Flooring installation
- Running cables and systems
- Gradual visible improvement

Scene 7 — INTERIOR FINALIZATION
- Clean and modern interior
- Bright cinematic lighting
- Polished surfaces
- Fully functional environment

Scene 8 — INTERIOR DESIGN TRANSFORMATION
- Specific design theme (e.g. modern living room, high-tech studio, command center, office space, luxury underground apartment, research lab, gaming room, minimalist smart home)
- Furniture and decor placement
- Final aesthetic touches

Scene 9 — FINAL AFTER (Cinematic Reveal)
- Fully restored bunker (inside + outside)
- Futuristic, clean, impressive
- Wide cinematic reveal shot
- Highly satisfying transformation

STYLE REQUIREMENTS:
- Hyper-realistic
- Cinematic lighting
- Natural shadows
- Accurate construction equipment
- Believable material transitions
- No fantasy elements
- No instant transformations
- Structured visual progression
- Designed for viral short-form
- Vertical 9:16 format only

CRITICAL RULES:
- Every scene must maintain the EXACT same bunker identity, entrance geometry, and camera angle
- Worker presence is SCENE-AWARE (not globally blocked):
  • Scene 1 (Before): NO workers — atmosphere only
  • Scenes 2, 3, 5, 6: Workers REQUIRED — show construction crew arriving, operating tools, repairing, installing. Use worker silhouettes, partial figures, or backlit crew members if full rendering risks quality.
  • Scenes 4, 7, 8: Workers OPTIONAL — minimal presence or absent, focus on results of their work
  • Scene 9 (Final Reveal): NO workers — cinematic reveal only
- If direct human rendering risks image quality, use: worker silhouettes, partial body shots from behind, figures in shadow/backlight, or clearly visible crew activity evidence (hard hats, boots, gloved hands on tools)
- NO magical self-repair. All structural changes must have visible worker or tool/equipment evidence
- All motion must be minimal, restrained, and gradual — construction timelapse style`;

/**
 * IDEA GENERATION PROMPT
 * Per master prompt: Provide 10 Unique Location Concepts.
 * Each concept must feature a completely different environment
 * with strong before-and-after contrast.
 */
export function getIdeaGenerationPrompt(): string {
  return `Provide exactly 10 unique bunker restoration video concepts.

Each concept must:
- Feature a completely different environment
- Show strong before-and-after contrast

The 10 concepts MUST cover these distinct environment types (from master prompt):
1. Mountain bunker
2. Desert bunker
3. Coastal bunker
4. Forest bunker
5. Snow-covered bunker
6. Abandoned city bunker
7. Jungle bunker
8. Cliffside bunker
9. Industrial zone bunker
10. War-zone bunker

For each concept, return a JSON array with objects containing:
- "id": number (1-10)
- "title": string (specific bunker type and name, e.g. "Alpine Command Bunker" or "Sahara Desert Outpost")
- "location": string (city/region, country — geographically and historically plausible)
- "era": string (decade or year, e.g. "1960s Cold War")
- "description": string (2-3 sentences describing the bunker's current damaged/abandoned state and its restoration potential. Focus on strong before-and-after contrast.)
- "visualHook": string (one compelling visual detail that makes this concept stand out for viral content)
- "environmentType": string (one of: mountain, desert, coastal, forest, snow, city, jungle, cliffside, industrial, warzone)

Each concept must:
- Feature a completely different environment
- Show strong before-and-after contrast potential
- Be geographically and historically plausible
- Have a dramatic visual hook suitable for viral short-form content

Return ONLY the JSON array, no markdown formatting or code blocks.`;
}

/**
 * SCENE PLAN PROMPT
 * Per master prompt: For Each Idea Provide:
 * A. 9 Detailed Text-to-Image Prompts
 * B. 9 Short Animation Prompts
 * C. 1 Full Voiceover Script Per Idea (handled separately in audio step)
 * 
 * This generates A and B. The voiceover is generated in the Audio step.
 */
export function getScenePlanPrompt(ideaTitle: string, ideaDescription: string): string {
  return `Create a detailed 9-scene bunker restoration timelapse plan for this concept:
Title: ${ideaTitle}
Description: ${ideaDescription}

The 9 scenes MUST follow this EXACT structure from the master prompt:

Scene 1 — BEFORE (Damaged State)
- Abandoned bunker
- Broken concrete, rust, debris, cracks
- Poor lighting, dirty atmosphere
- No workers present
- Environment feels neglected

Scene 2 — ARRIVAL
- Construction crew arrives
- Carrying tools and materials
- Inspecting site
- Setting up lighting and equipment

Scene 3 — WORK IN PROGRESS (Exterior Start)
- Debris removal
- Welding and repairing structure
- Reinforcing damaged sections
- Early visible improvements

Scene 4 — EXTERIOR NEAR COMPLETION
- Exterior mostly restored
- Clean surfaces
- Fresh concrete or metal
- Organized surroundings

Scene 5 — ENTERING UNDERGROUND
- Workers open or access the bunker entrance
- Interior is dark, damaged, unfinished
- Underground environment revealed

Scene 6 — INTERIOR WORK IN PROGRESS
- Installing lighting systems
- Wall repairs
- Flooring installation
- Running cables and systems
- Gradual visible improvement

Scene 7 — INTERIOR FINALIZATION
- Clean and modern interior
- Bright cinematic lighting
- Polished surfaces
- Fully functional environment

Scene 8 — INTERIOR DESIGN TRANSFORMATION
- Specific design theme (choose one: modern living room, high-tech studio, command center, office space, luxury underground apartment, research lab, gaming room, minimalist smart home)
- Furniture and decor placement
- Final aesthetic touches

Scene 9 — FINAL AFTER (Cinematic Reveal)
- Fully restored bunker (inside + outside)
- Futuristic, clean, impressive
- Wide cinematic reveal shot
- Highly satisfying transformation

For EACH scene, return a JSON array with objects containing:

- "title": string (the scene name exactly as listed above, e.g. "Before (Damaged State)")

- "imagePrompt": string (A detailed text-to-image prompt per the master prompt requirements:
  • Same camera angle across ALL scenes
  • Same location consistency
  • Same lighting style
  • Hyper-realistic
  • Cinematic
  • Highly detailed
  • Natural construction progress
  • Vertical 9:16 format
  • Worker presence is SCENE-AWARE:
    - Scene 1: NO workers. Atmosphere only — abandoned, neglected.
    - Scene 2: Workers REQUIRED. Construction crew arriving, carrying tools, inspecting site, setting up lighting. Show worker silhouettes or partial figures if full rendering is risky.
    - Scene 3: Workers REQUIRED. Active debris removal, welding, reinforcing. Workers operating tools visible.
    - Scene 4: Workers OPTIONAL. Mostly clean exterior, organized surroundings. Minimal worker presence OK.
    - Scene 5: Workers REQUIRED. Crew opening/accessing bunker entrance. Worker silhouettes entering dark space.
    - Scene 6: Workers REQUIRED. Installing lighting, repairing walls, laying flooring, running cables. Active crew visible.
    - Scene 7: Workers OPTIONAL. Clean modern interior, minimal finishing activity.
    - Scene 8: Workers usually ABSENT. Design reveal — furniture, decor, aesthetics.
    - Scene 9: NO workers. Cinematic reveal of fully restored space.
  • If direct human rendering risks quality: use worker silhouettes, partial body shots from behind, figures in shadow/backlight, or hard hats / boots / gloved hands on tools
  • Never use fully detailed front-facing human faces — use silhouettes, back views, or partial figures instead)

- "motionPrompt": string (A SHORT animation prompt per the master prompt. Simple motion instructions such as:
  • "Dust drifting slowly through abandoned space"
  • "Workers arriving with tools, setting up equipment"
  • "Sparks from welding, workers clearing debris"
  • "Slow cinematic camera push toward clean exterior"
  • "Worker silhouettes entering dark underground entrance"
  • "Workers installing lights, laying cables in interior"
  • "Bright lights revealing clean polished surfaces"
  • "Furniture and decor elements settling into position"
  • "Wide cinematic reveal of fully restored space"
  Keep concise. Keep motion minimal, restrained, realistic. No dramatic camera movements.)

- "narration": string (1-2 sentence voiceover narration for this scene. Emotional, satisfying tone suitable for viral short-form content.)

- "notes": string (Technical notes about maintaining visual continuity with the previous scene. What must stay identical, what changes.)

CRITICAL RULES (from master prompt):
- Every prompt must maintain the EXACT same bunker identity, entrance geometry, camera angle, and framing
- Worker presence follows scene-aware logic (see above) — NOT globally blocked
- Natural construction progress — show gradual, believable improvement
- No fantasy elements, no instant transformations
- No magical self-repair
- Motion prompts must be minimal — no dramatic camera movement, no orbit, no zoom

Return ONLY the JSON array, no markdown formatting or code blocks.`;
}

/**
 * AUDIO PLAN PROMPT
 * Per master prompt: 1 Full Voiceover Script Per Idea
 * - 30-45 seconds
 * - Emotional and satisfying tone
 * - Strong hook
 * - Focused on transformation
 * - Powerful final reveal
 */
export function getAudioPlanPrompt(scenes: { title: string; narration: string }[]): string {
  const sceneList = scenes.map((s, i) => `Scene ${i + 1} (${s.title}): ${s.narration}`).join('\n');
  return `Create a complete audio plan for this 9-scene bunker restoration timelapse video.

Scenes:
${sceneList}

VOICEOVER REQUIREMENTS (from master prompt — follow exactly):
- 1 Full Voiceover Script Per Idea
- Total script: 30–45 seconds
- Emotional and satisfying tone
- Strong hook at the beginning
- Focused on transformation narrative
- Powerful final reveal moment
- Suitable for viral short-form content (YouTube Shorts, TikTok, Instagram Reels)

Return a JSON object with:
- "fullScript": string (the complete voiceover script, 30-45 seconds, with [Scene X] markers. Must have a strong hook opening and a powerful reveal ending.)
- "sceneNarrations": string[] (array of 9 narration texts, broadcast-ready, emotional tone)
- "ambienceNotes": string[] (array of 9 ambient sound descriptions. Examples: wind howling, metal creaking, construction noise, electrical hum, modern HVAC)
- "sfxNotes": string[] (array of 9 sound effect cues. Examples: concrete crumbling, welding sparks, drill sounds, light switch, door opening, reveal whoosh)

Return ONLY the JSON object, no markdown formatting or code blocks.`;
}

/**
 * Build a strict pair transition prompt.
 * This is the most critical prompt — it must prioritize image pair fidelity
 * over any creative interpretation. Image A evolving into Image B.
 * 
 * Per master prompt: motion must be minimal, restrained, realistic.
 * Simple motion instructions only. No dramatic camera movements.
 */
export function buildStrictTransitionPrompt(
  motionPrompt: string,
  settings: { motionStrength: number; cameraIntensity: number; realismPriority: number; morphSuppression: number; continuityStrictness: number },
  startSceneTitle: string,
  endSceneTitle: string,
  hasRepairActivity: boolean
): string {
  const workerNote = hasRepairActivity
    ? 'Construction progress visible: tools, scaffolding, welding sparks, equipment marks, construction materials present. No magical self-repair.'
    : 'Atmosphere only: environmental state change (dust, light, decay, or pristine completion). No structural modification, no construction activity.';

  return `${motionPrompt}

STRICT PAIR TRANSITION CONSTRAINTS:
- This is Image A (${startSceneTitle}) evolving into Image B (${endSceneTitle})
- Prioritize the image pair over any style interpretation
- Same bunker structure, same entrance geometry
- Same camera angle, same framing, same composition
- Same environment, same structural proportions
- Only minimal, gradual, realistic changes
- Construction timelapse style — slow, controlled progression
- No dramatic motion, no orbit, no camera swing
- No fast zoom, no redesign, no magical self-repair
- No random objects appearing, no heavy morphing
- Motion strength: ${settings.motionStrength}/100
- Camera intensity: ${settings.cameraIntensity}/100
- Realism priority: ${settings.realismPriority}%
- Morph suppression: ${settings.morphSuppression}%
- Continuity strictness: ${settings.continuityStrictness}%
- ${workerNote}`;
}

/**
 * Build a continuity review prompt for Gemini to analyze scene descriptions.
 * Per master prompt: every scene must maintain the EXACT same bunker identity,
 * entrance geometry, and camera angle.
 */
export function getContinuityReviewPrompt(): string {
  return `You are analyzing a sequence of 9 bunker restoration scene descriptions for visual continuity.

The 9-scene structure (from master prompt) is:
1. Before (Damaged State) — atmosphere only, no workers, no construction
2. Arrival — tools/equipment appearing at the site
3. Work in Progress (Exterior Start) — debris removal, welding, reinforcing
4. Exterior Near Completion — clean surfaces, fresh concrete/metal
5. Entering Underground — dark interior revealed
6. Interior Work In Progress — lighting, wall repairs, flooring, cables
7. Interior Finalization — clean, modern, bright, polished
8. Interior Design Transformation — furnished and decorated with specific theme
9. Final After (Cinematic Reveal) — atmosphere only, fully completed, cinematic

Check each consecutive pair of scenes for:
1. BUNKER IDENTITY: Is it the same bunker structure throughout?
2. ENTRANCE GEOMETRY: Does the entrance shape/size stay consistent?
3. CAMERA ANGLE: Is the viewing angle maintained across all scenes?
4. FRAMING: Is the composition consistent?
5. ENVIRONMENT: Are surrounding elements (terrain, vegetation, sky) stable?
6. STAGE PROGRESSION: Does the restoration progress logically and gradually?
7. WORKER/TOOL LOGIC: For scenes 2-8, are there visible construction cues (tools, scaffolding, materials)? For scenes 1 and 9, is there NO construction activity?

For each issue found, return a JSON array of flag objects:
- "sceneIndex": number (0-8, which scene has the issue)
- "type": "identity" | "angle" | "framing" | "environment" | "progression" | "worker-logic"
- "message": string (brief description of the drift/issue)
- "severity": "warning" | "error"

If all scenes pass, return an empty array: []

Return ONLY the JSON array, no markdown or code blocks.`;
}
