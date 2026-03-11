import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { callGemini, callTts, getPlanningModel, getTtsModel } from '@/lib/google-ai';
import { MASTER_SYSTEM_PROMPT, getAudioPlanPrompt } from '@/lib/prompts';
import { toast } from 'sonner';
import { Check, Loader2, Volume2, AlertTriangle } from 'lucide-react';

export function AudioVoiceover() {
  const { scenes, audio, setAudio, goToNextStep, goToPrevStep, qualityMode, name } = useProjectStore();
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingTts, setGeneratingTts] = useState(false);
  const [ttsProgress, setTtsProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hasScript = audio.fullScript.length > 0;

  const handleGenerateScript = async () => {
    setGeneratingScript(true);
    setErrorMsg(null);
    try {
      const text = await callGemini({
        messages: [{ role: 'user', content: getAudioPlanPrompt(scenes.map(s => ({ title: s.title, narration: s.narration }))) }],
        model: getPlanningModel(qualityMode),
        systemPrompt: MASTER_SYSTEM_PROMPT,
      });

      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(cleanText);
      setAudio({
        fullScript: parsed.fullScript || '',
        sceneNarrations: parsed.sceneNarrations || [],
        ambienceNotes: parsed.ambienceNotes || [],
        sfxNotes: parsed.sfxNotes || [],
        ttsReady: true,
      });
      toast.success('Generated audio script');
    } catch (err) {
      console.error('Script generation failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(msg);
      toast.error(`Failed: ${msg}`);
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleGenerateTts = async () => {
    setGeneratingTts(true);
    setTtsProgress(0);
    setErrorMsg(null);

    const projectName = name.replace(/\s+/g, '_') || 'project';
    const ttsModel = getTtsModel(qualityMode);
    const newUrls = [...audio.generatedAudioUrls];
    let successCount = 0;

    for (let i = 0; i < audio.sceneNarrations.length; i++) {
      const narration = audio.sceneNarrations[i];
      if (!narration || narration.trim().length === 0) {
        setTtsProgress(i + 1);
        continue;
      }

      try {
        toast.info(`Generating audio for Scene ${i + 1}…`);
        const result = await callTts({
          text: narration,
          model: ttsModel,
          voiceName: 'Kore', // Deep narrator voice
          sceneIndex: i,
          projectName,
        });
        newUrls[i] = result.audioUrl;
        successCount++;
        setTtsProgress(i + 1);
      } catch (err) {
        console.error(`TTS Scene ${i + 1} failed:`, err);
        const msg = err instanceof Error ? err.message : 'Unknown error';
        // Rate limit — stop and let user retry
        if (msg.includes('429') || msg.includes('RATE_LIMITED') || msg.includes('quota')) {
          setErrorMsg(`Rate limited at Scene ${i + 1}. Wait a few minutes and retry.`);
          toast.error('API quota exceeded — partial audio generated');
          break;
        }
        toast.error(`Scene ${i + 1} TTS failed: ${msg}`);
        setTtsProgress(i + 1);
      }
    }

    setAudio({
      generatedAudioUrls: newUrls,
      audioGenerated: successCount > 0,
    });

    if (successCount > 0) {
      toast.success(`Generated ${successCount} audio clips via Google TTS`);
    }

    setGeneratingTts(false);
  };

  const audioCount = audio.generatedAudioUrls.filter(u => u && u.length > 0).length;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Audio / Voiceover</h1>
        <p className="text-sm text-muted-foreground">Generate narration script via Gemini, then produce real TTS audio via Google TTS.</p>
      </div>

      {/* Error display */}
      {errorMsg && (
        <WorkshopCard className="border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-destructive">Error</p>
              <p className="text-xs text-destructive/80 font-mono mt-1">{errorMsg}</p>
            </div>
          </div>
        </WorkshopCard>
      )}

      {/* Step 1: Generate Script */}
      {!hasScript ? (
        <WorkshopCard generating={generatingScript}>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4 text-sm">
              {generatingScript ? 'Generating voiceover script via Gemini…' : 'Step 1: Generate narration script for all 9 scenes.'}
            </p>
            {!generatingScript && (
              <Button onClick={handleGenerateScript} className="touch-target font-bold">
                Generate Audio Script
              </Button>
            )}
          </div>
        </WorkshopCard>
      ) : (
        <>
          {/* Full script preview */}
          <WorkshopCard>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Full Script</label>
              <span className="text-xs text-step-complete font-semibold">✓ Ready</span>
            </div>
            <pre className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {audio.fullScript}
            </pre>
          </WorkshopCard>

          {/* Step 2: Generate TTS Audio */}
          <WorkshopCard generating={generatingTts}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm">Step 2: Generate TTS Audio</h2>
              {audioCount > 0 && (
                <span className="text-xs text-step-complete font-semibold">{audioCount}/9 clips</span>
              )}
            </div>

            {generatingTts ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  Generating TTS audio… Scene {ttsProgress}/{audio.sceneNarrations.length}
                </p>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(ttsProgress / audio.sceneNarrations.length) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-3">
                  {audioCount > 0
                    ? `${audioCount} audio clips generated. Regenerate to replace all.`
                    : 'Generate real audio files using Google Gemini TTS.'}
                </p>
                <Button onClick={handleGenerateTts} className="touch-target font-bold">
                  <Volume2 className="w-4 h-4 mr-1" />
                  {audioCount > 0 ? 'Regenerate All TTS' : 'Generate TTS Audio'}
                </Button>
              </div>
            )}
          </WorkshopCard>

          {/* Per-scene narrations with audio players */}
          <Accordion type="single" collapsible className="flex flex-col gap-2">
            {scenes.map((scene, idx) => (
              <AccordionItem key={idx} value={`audio-${idx}`} className="border-0">
                <WorkshopCard>
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="flex items-center gap-3 text-left flex-1">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-sm flex-1">{scene.title}</span>
                      {audio.generatedAudioUrls[idx] && (
                        <Check className="w-4 h-4 text-step-complete shrink-0" />
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-3 space-y-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold uppercase">Narration</label>
                      <p className="text-xs font-mono mt-0.5">{audio.sceneNarrations[idx]}</p>
                    </div>

                    {/* Audio player */}
                    {audio.generatedAudioUrls[idx] && (
                      <div>
                        <label className="text-[10px] text-step-complete font-semibold uppercase">Generated Audio</label>
                        <audio
                          controls
                          src={audio.generatedAudioUrls[idx]}
                          className="w-full mt-1"
                          preload="metadata"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold uppercase">Ambience</label>
                      <p className="text-xs font-mono mt-0.5 text-muted-foreground">{audio.ambienceNotes[idx]}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold uppercase">SFX</label>
                      <p className="text-xs font-mono mt-0.5 text-muted-foreground">{audio.sfxNotes[idx]}</p>
                    </div>
                  </AccordionContent>
                </WorkshopCard>
              </AccordionItem>
            ))}
          </Accordion>
        </>
      )}

      <StickyAction
        label="Continue to Export"
        onClick={goToNextStep}
        disabled={!hasScript}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
