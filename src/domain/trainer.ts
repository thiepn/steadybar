import type { TrainerConfig } from './models.js';

export function pyramidBpms(config: Extract<TrainerConfig,{mode:'pyramid'}>): number[] {
  const up=[config.start];
  for(let value=config.start+config.step;value<config.max;value+=config.step)up.push(value);
  if(up.at(-1)!==config.max)up.push(config.max);
  return [...up,...up.slice(0,-1).reverse()];
}

export function trainerTargetSeconds(config: TrainerConfig): number|undefined {
  switch(config.mode){
    case 'ladder':return config.bpms.length*config.seconds;
    case 'pyramid':return pyramidBpms(config).length*config.seconds;
    case 'burst':return config.cycles*(config.recoverySeconds+config.burstSeconds);
    case 'endurance':return config.seconds;
    default:return undefined;
  }
}

export function trainerBpm(config: TrainerConfig, activeSeconds: number, qualifyingRounds: number): number {
  const elapsed=Math.max(0,activeSeconds);
  switch(config.mode) {
    case 'progressive': return Math.min(config.max,config.start+Math.floor(elapsed/config.seconds)*config.step);
    case 'repetition':return Math.min(config.max,config.start+Math.floor(qualifyingRounds/config.rounds)*config.step);
    case 'ladder':return config.bpms[Math.min(config.bpms.length-1,Math.floor(elapsed/config.seconds))] ?? 80;
    case 'pyramid': {
      const stages=pyramidBpms(config),total=stages.length*config.seconds;
      if(elapsed>=total)return config.start;
      return stages[Math.floor(elapsed/config.seconds)] ?? config.start;
    }
    case 'burst': {
      const cycleSeconds=config.recoverySeconds+config.burstSeconds,total=config.cycles*cycleSeconds;
      if(elapsed>=total)return config.recoveryBpm;
      return elapsed%cycleSeconds<config.recoverySeconds ? config.recoveryBpm : config.burstBpm;
    }
    case 'endurance':return config.bpm;
  }
}

export function trainerLabel(config: TrainerConfig, activeSeconds: number, rounds: number): string {
  const elapsed=Math.max(0,activeSeconds);
  switch(config.mode) {
    case 'progressive':return trainerBpm(config,elapsed,rounds) >= config.max ? `Holding at ${config.max} BPM` : `+${config.step} BPM in ${Math.ceil(config.seconds - elapsed%config.seconds)} sec`;
    case 'repetition':return trainerBpm(config,elapsed,rounds) >= config.max ? `Holding at ${config.max} BPM` : `${rounds%config.rounds} / ${config.rounds} clean rounds · +${config.step} BPM next`;
    case 'ladder': {
      const total=trainerTargetSeconds(config)!;
      if(elapsed>=total)return `Ladder complete · holding ${config.bpms.at(-1)} BPM`;
      return `Stage ${Math.floor(elapsed/config.seconds)+1} / ${config.bpms.length} · ${trainerBpm(config,elapsed,rounds)} BPM · ${Math.ceil(config.seconds-elapsed%config.seconds)} sec`;
    }
    case 'pyramid': {
      const stages=pyramidBpms(config),total=trainerTargetSeconds(config)!;
      if(elapsed>=total)return `Pyramid complete · recover at ${config.start} BPM`;
      const index=Math.floor(elapsed/config.seconds),peak=stages.indexOf(config.max),phase=index<peak?'Climb':index===peak?'Peak':'Descend';
      return `${phase} · stage ${index+1} / ${stages.length} · ${stages[index]} BPM · ${Math.ceil(config.seconds-elapsed%config.seconds)} sec`;
    }
    case 'burst': {
      const total=trainerTargetSeconds(config)!;
      if(elapsed>=total)return `Burst set complete · recover at ${config.recoveryBpm} BPM`;
      const cycleSeconds=config.recoverySeconds+config.burstSeconds,cycle=Math.floor(elapsed/cycleSeconds),within=elapsed%cycleSeconds;
      const recovery=within<config.recoverySeconds,remaining=(recovery?config.recoverySeconds:cycleSeconds)-within;
      return `Cycle ${cycle+1} / ${config.cycles} · ${recovery?'Recovery':'Burst'} · ${recovery?config.recoveryBpm:config.burstBpm} BPM · ${Math.ceil(remaining)} sec`;
    }
    case 'endurance':return `${Math.ceil(Math.max(0,config.seconds-elapsed))} sec remaining at ${config.bpm} BPM`;
  }
}
