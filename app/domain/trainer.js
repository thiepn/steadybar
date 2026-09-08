export function trainerBpm(config, activeSeconds, qualifyingRounds) {
    switch (config.mode) {
        case 'progressive': return Math.min(config.max, config.start + Math.floor(Math.max(0, activeSeconds) / config.seconds) * config.step);
        case 'repetition': return Math.min(config.max, config.start + Math.floor(qualifyingRounds / config.rounds) * config.step);
        case 'ladder': return config.bpms[Math.min(config.bpms.length - 1, Math.floor(Math.max(0, activeSeconds) / config.seconds))] ?? 80;
        case 'endurance': return config.bpm;
    }
}
export function trainerLabel(config, activeSeconds, rounds) {
    switch (config.mode) {
        case 'progressive': return trainerBpm(config, activeSeconds, rounds) >= config.max ? `Holding at ${config.max} BPM` : `+${config.step} BPM in ${Math.ceil(config.seconds - activeSeconds % config.seconds)} sec`;
        case 'repetition': return trainerBpm(config, activeSeconds, rounds) >= config.max ? `Holding at ${config.max} BPM` : `${rounds % config.rounds} / ${config.rounds} clean rounds · +${config.step} BPM next`;
        case 'ladder': return `Stage ${Math.min(config.bpms.length, Math.floor(activeSeconds / config.seconds) + 1)} / ${config.bpms.length} · ${config.bpms.join(' → ')}`;
        case 'endurance': return `${Math.ceil(Math.max(0, config.seconds - activeSeconds))} sec remaining at ${config.bpm} BPM`;
    }
}
