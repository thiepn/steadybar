export function calendarScale(dates) {
    if (!dates.length)
        return { fractions: [], days: 0 };
    const ordinals = dates.map(date => {
        const [year, month, day] = date.split('-').map(Number);
        return Date.UTC(year, month - 1, day) / 86400000;
    });
    const first = ordinals.reduce((a, b) => Math.min(a, b)), last = ordinals.reduce((a, b) => Math.max(a, b)), span = last - first;
    return { fractions: ordinals.map(day => span ? (day - first) / span : .5), days: span + 1 };
}
export function practiceTimeScale(points) {
    const peak = points.reduce((max, p) => Math.max(max, p.seconds), 0);
    return { peak, ceiling: Math.max(60, peak) };
}
