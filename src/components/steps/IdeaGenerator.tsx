import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import type { BunkerIdea } from '@/types/project';
import { MapPin, Clock, Eye } from 'lucide-react';

const MOCK_IDEAS: BunkerIdea[] = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  title: [
    'Soviet Arctic Command Post', 'Swiss Alpine Fallout Shelter', 'East German Border Watchtower Bunker',
    'Yugoslav Mountain Artillery Fortress', 'British WWII Coastal Defense', 'Czech Cold War Nuclear Shelter',
    'Norwegian NATO Communications Vault', 'Albanian Underground Air Base', 'Finnish Winter War Dugout',
    'French Maginot Line Outpost',
  ][i],
  location: ['Murmansk, Russia', 'Bernese Alps, Switzerland', 'Thuringia, Germany', 'Montenegro', 'Dover, England', 'Brno, Czechia', 'Tromsø, Norway', 'Gjadër, Albania', 'Summa, Finland', 'Alsace, France'][i],
  era: ['1960s', '1970s', '1950s', '1940s', '1940s', '1960s', '1980s', '1970s', '1939', '1930s'][i],
  description: [
    'A heavily reinforced polar command post buried beneath permafrost, featuring blast doors and a collapsed communications array.',
    'A civilian fallout shelter carved into limestone, with intact ventilation systems and decaying supply caches.',
    'A concrete watchtower bunker along the former inner-German border, overgrown with decades of vegetation.',
    'A massive mountain fortress with artillery positions overlooking the Adriatic coast.',
    'A chalk-cliff defense position with gun emplacements and underground tunnels.',
    'A multi-level nuclear shelter beneath a residential block, designed for 500 civilians.',
    'A hardened NATO signals facility inside a mountain, with EMP-shielded electronics bays.',
    'A former MiG fighter base hidden inside a mountain with massive hangar doors.',
    'A timber-reinforced field bunker from the Winter War, partially collapsed under snow.',
    'A reinforced Maginot fortress with retractable turrets and underground rail connections.',
  ][i],
  visualHook: [
    'Frost-covered blast doors emerging from snow', 'Pristine limestone walls vs. rusted equipment',
    'Nature reclaiming brutalist concrete', 'Mediterranean light through artillery slits',
    'White chalk cliffs with dark gun ports', 'Domestic apartment above, bunker below',
    'Arctic wilderness outside, hi-tech inside', 'MiG silhouettes in dark hangars',
    'Snow and timber in golden winter light', 'Art deco military engineering',
  ][i],
}));

export function IdeaGenerator() {
  const { ideas, setIdeas, selectedIdeaIndex, selectIdea, goToNextStep, goToPrevStep } = useProjectStore();
  const [generating, setGenerating] = useState(false);
  const displayIdeas = ideas.length > 0 ? ideas : [];

  const handleGenerate = () => {
    setGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setIdeas(MOCK_IDEAS);
      setGenerating(false);
    }, 1500);
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
              {generating ? 'Generating 10 bunker concepts…' : 'Ready to generate concepts from master prompt.'}
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
              className={`text-left transition-all ${selectedIdeaIndex === idx ? '' : ''}`}
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
