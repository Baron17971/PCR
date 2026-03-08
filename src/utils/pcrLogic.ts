// This utility calculates the exact DNA strands that exist at any given PCR cycle.
// We differentiate between:
// - Original Temple (infinite length for our purposes)
// - Long strands (created from Original, bound on one side by a primer but continues indefinitely)
// - Target strands (Short strands bound by both primers, the exact sequence we want)

export type StrandType = 'original' | 'long' | 'target';

export interface Strand {
  id: string;
  type: StrandType;
  polarity: 'top' | 'bot'; 
  parentId?: string;
}

export interface Molecule {
  id: string;
  top: Strand;
  bot: Strand;
}

export function generateMoleculesForCycle(cycle: number): Molecule[] {
  // Cycle 0: 1 Original Molecule
  let molecules: Molecule[] = [
    {
      id: 'm-orig',
      top: { id: 's-orig-top', type: 'original', polarity: 'top' },
      bot: { id: 's-orig-bot', type: 'original', polarity: 'bot' }
    }
  ];

  let nextStrandId = 0;

  for (let c = 1; c <= cycle; c++) {
    const nextMolecules: Molecule[] = [];
    
    // Each existing molecule splits into two
    for (const m of molecules) {
      
      // Top strand gets a new bottom strand
      let newBotType: StrandType = 'target';
      if (m.top.type === 'original') newBotType = 'long';
      // if m.top.type === 'long', new bottom strand is bound by the other primer, making it a 'target'
      
      nextMolecules.push({
        id: `m-c${c}-${nextStrandId++}`,
        top: m.top, // old top
        bot: { id: `s-c${c}-${nextStrandId++}`, type: newBotType, polarity: 'bot', parentId: m.top.id }
      });

      // Bottom strand gets a new top strand
      let newTopType: StrandType = 'target';
      if (m.bot.type === 'original') newTopType = 'long';

      nextMolecules.push({
        id: `m-c${c}-${nextStrandId++}`,
        top: { id: `s-c${c}-${nextStrandId++}`, type: newTopType, polarity: 'top', parentId: m.bot.id },
        bot: m.bot // old bot
      });
    }

    molecules = nextMolecules;
  }

  return molecules;
}
