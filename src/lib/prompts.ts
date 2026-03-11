import type { QualityMode } from '@/types/project';

/**
 * MASTER SYSTEM PROMPT
 * Faithful implementation of the attached master prompt specification.
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
 * Build a STRICT pair transition prompt.
 * 
 * DESIGN PHILOSOPHY: This prompt must behave like the manual workflow:
 *   Image A + Image B + one motion prompt + one strict request.
 * 
 * NO style injection. NO cinematic reinterpretation. NO prompt inflation.
 * The numeric settings (motionStrength etc.) are translated into natural
 * language constraints that Veo can actually interpret, rather than
 * arbitrary numbers that Veo ignores.
 */
export function buildStrictTransitionPrompt(
  motionPrompt: string,
  settings: { motionStrength: number; cameraIntensity: number; realismPriority: number; morphSuppression: number; continuityStrictness: number },
  startSceneTitle: string,
  endSceneTitle: string,
  hasRepairActivity: boolean,
  endSceneIndex?: number
): string {
  // Translate settings into strict natural language (Veo doesn't understand numbers)
  const isUltraStrict = settings.motionStrength <= 15 && settings.morphSuppression >= 95;
  const isStrict = settings.motionStrength <= 30 && settings.morphSuppression >= 85;
  
  // Worker note — scene-aware
  let workerNote: string;
  if (endSceneIndex !== undefined) {
    const workerRequired = [1, 2, 4, 5].includes(endSceneIndex);
    const noWorkers = [0, 8].includes(endSceneIndex);
    
    if (workerRequired) {
      workerNote = 'Workers visible in end state: construction crew silhouettes or partial figures operating tools.';
    } else if (noWorkers) {
      workerNote = 'No workers. Environmental state only.';
    } else {
      workerNote = 'Workers minimal or absent. Focus on completed work results.';
    }
  } else {
    workerNote = hasRepairActivity
      ? 'Construction activity visible: workers, tools, scaffolding.'
      : 'Atmosphere only. No construction activity.';
  }

  // Ultra-strict mode (x1) — closest to manual workflow
  if (isUltraStrict) {
    return `${motionPrompt}

ABSOLUTE CONSTRAINTS — DO NOT DEVIATE:
- Start frame: "${startSceneTitle}" — End frame: "${endSceneTitle}"
- LOCKED camera. No camera movement whatsoever. No pan, no tilt, no zoom, no orbit, no dolly.
- LOCKED composition. Same framing, same angle, same field of view throughout.
- LOCKED structure. Same bunker geometry, same entrance shape, same wall positions, same proportions.
- LOCKED environment. Same sky, same terrain, same surrounding elements.
- ALMOST STATIC video. Only extremely subtle, slow, realistic changes allowed.
- NO morphing. No shape-shifting. No warping. No melting. No stretching.
- NO new objects appearing from nowhere. NO objects disappearing.
- NO style changes. NO color grading shifts. NO lighting mood changes.
- NO creative interpretation. Reproduce the start image with only the minimal physical changes described in the motion prompt.
- Construction timelapse: changes happen through physical work, not magic.
- ${workerNote}`;
  }

  // Strict mode (x2)
  if (isStrict) {
    return `${motionPrompt}

STRICT CONSTRAINTS:
- Start: "${startSceneTitle}" → End: "${endSceneTitle}"
- Camera: stationary. No movement.
- Composition: identical framing and angle throughout.
- Structure: same bunker geometry, entrance, walls, proportions.
- Environment: same surroundings, sky, terrain.
- Motion: very minimal. Slow, subtle, realistic changes only.
- No morphing. No warping. No objects appearing/disappearing.
- No creative reinterpretation. Follow the motion prompt literally.
- Construction timelapse style.
- ${workerNote}`;
  }

  // Moderate mode (x3-x4)
  return `${motionPrompt}

CONSTRAINTS:
- Transition from "${startSceneTitle}" to "${endSceneTitle}".
- Maintain same bunker structure, entrance geometry, and camera angle.
- Keep same environment and composition.
- Controlled, gradual motion. Construction timelapse style.
- No heavy morphing. No dramatic camera movements.
- ${workerNote}`;
}

/**
 * Build a continuity review prompt for Gemini Vision to analyze actual scene images.
 */
export function getContinuityReviewPrompt(): string {
  return `You are analyzing a sequence of bunker restoration scene images for visual continuity.

The 9-scene structure is:
1. Before (Damaged State) — atmosphere only, no workers
2. Arrival — workers arriving with tools
3. Work in Progress (Exterior) — active repair
4. Exterior Near Completion — clean surfaces
5. Entering Underground — dark interior revealed
6. Interior Work In Progress — installing systems
7. Interior Finalization — clean, modern, bright
8. Interior Design — furnished with theme
9. Final Reveal — cinematic, no workers

ANALYZE EACH CONSECUTIVE PAIR for:
1. STRUCTURAL IDENTITY: Is it visually the same bunker? Same building shape, same entrance?
2. CAMERA ANGLE: Is the viewing angle consistent between frames?
3. COMPOSITION: Is the framing similar? Same subject positioning?
4. ENVIRONMENT: Are surroundings (terrain, sky, vegetation) consistent?
5. PROGRESSION: Does restoration progress logically and gradually?
6. COLOR/LIGHTING: Is the color palette and lighting style consistent?
7. WORKER PRESENCE: Scenes 2,3,5,6 should show workers. Scenes 1,9 should NOT.

For each issue found, return a JSON array of flag objects:
- "sceneIndex": number (0-8)
- "type": "identity" | "angle" | "framing" | "environment" | "progression" | "worker-logic"
- "message": string (specific visual observation)
- "severity": "warning" | "error"

If all scenes pass, return an empty array: []
Return ONLY the JSON array, no markdown or code blocks.`;
}

/**
 * Get the structural identity anchoring suffix for image generation.
 * This is appended to every image prompt to maximize structural consistency.
 */
export function getStructuralAnchor(sceneIndex: number, ideaTitle: string): string {
  if (sceneIndex === 0) {
    return `\n\nSTRUCTURAL IDENTITY LOCK: This establishes the canonical bunker appearance for "${ideaTitle}". All subsequent scenes must match this exact structure, entrance geometry, camera angle, framing, and environment.`;
  }
  return `\n\nSTRUCTURAL IDENTITY LOCK: This must show the EXACT SAME bunker as Scene 1 — same building shape, same entrance geometry, same camera angle, same framing, same environment, same surrounding terrain. Only the restoration state changes. "${ideaTitle}" — maintain complete visual identity continuity.`;
}
