import { validateBackup } from '../domain/validation.js';
import { localDate, nowISO } from '../domain/utils.js';
import { recoverSession } from '../practice/logic.js';
import { readData, replaceData } from './database.js';
export function createBackup(data, timestamp = nowISO()) { return validateBackup({ format: 'music-practice-os', version: 1, exportedAt: timestamp, data }); }
export function parseBackup(text) {
    if (text.length > 100 * 1024 * 1024)
        throw new Error('This backup is larger than 100 MB. No data was changed.');
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        throw new Error('This file is not valid JSON. Choose a Steadybar .json backup.');
    }
    return validateBackup(parsed);
}
export async function exportBackup() {
    const backup = createBackup(await readData());
    downloadText(JSON.stringify(backup, null, 2), `steadybar-backup-${localDate()}.json`);
}
export function downloadText(text, name, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function restoreBackup(backup) {
    const validated = validateBackup(backup);
    validated.data.sessions = validated.data.sessions.map(s => s.status === 'active' ? recoverSession(s) : s);
    await replaceData(validated.data);
}
