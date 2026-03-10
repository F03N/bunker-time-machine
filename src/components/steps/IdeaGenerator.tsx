import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import type { BunkerIdea } from '@/types/project';
import { MapPin, Clock, Eye } from 'lucide-react';
import { callGemini, getPlanningModel } from '@/lib/google-ai';
import { MASTER_SYSTEM_PROMPT, getIdeaGenerationPrompt } from '@/lib/prompts';
import { toast } from 'sonner';

export function IdeaGenerator() {
  const { ideas, setIdeas, selectedIdeaIndex, selectIdea, goToNextStep, goToPrevStep, qualityMode } = useProjectStore();
  const [generating, setGenerating] = useState(false);
  const displayIdeas = ideas.length > 0 ? ideas : [];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const text = await callGemini({
        messages: [{ role: 'user', content: getIdeaGenerationPrompt() }],
        model: getPlanningModel(qualityMode),
        systemPrompt: MASTER_SYSTEM_PROMPT,
      });

      // Parse JSON from response (handle potential markdown wrapping)
      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed: BunkerIdea[] = JSON.parse(cleanText);
      setIdeas(parsed);
      toast.success('Generated 10 bunker concepts');
    } catch (err) {
      console.error('Idea generation failed:', err);
      toast.error(`Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Idea Generator</h1>
        <p className="text-sm text-muted-foreground">Generate 10 unique bunker concepts. Choose one.</p>
      </div>

      {displayIdeas.length === 0 ? (
        <WorkshopCard generating={generating}>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4 text-sm">
              {generating ? 'Generating 10 bunker concepts via Gemini…' : 'Ready to generate concepts from master prompt.'}
            </p>
            {!generating && (
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-md touch-target"
              >
                Generate 10 Concepts
              </button>
            )}
          </div>
        </WorkshopCard>
      ) : (
        <div className="flex flex-col gap-3">
          {displayIdeas.map((idea, idx) => (
            <button
              key={idea.id}
              onClick={() => selectIdea(idx)}
              className="text-left transition-all"
            >
              <WorkshopCard className={selectedIdeaIndex === idx ? 'border-primary ring-1 ring-primary/30' : ''}>
                <div className="flex items-start gap-3">
                  <span className={`
                    shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${selectedIdeaIndex === idx ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}
                  `}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{idea.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{idea.location}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{idea.era}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{idea.description}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-primary">
                      <Eye className="w-3 h-3" />
                      <span>{idea.visualHook}</span>
                    </div>
                  </div>
                </div>
              </WorkshopCard>
            </button>
          ))}
        </div>
      )}

      <StickyAction
        label="Use Selected Concept"
        onClick={goToNextStep}
        disabled={selectedIdeaIndex === null}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
