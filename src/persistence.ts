export type Settings = {
  volume: number;
  ambience: boolean;
  reducedMotion: boolean;
  trails: boolean;
  contrast: boolean;
};
export type Save = {
  version: 1;
  completed: Record<string, { echoes: number; ticks: number }>;
  settings: Settings;
};
export const defaults = (): Save => ({
  version: 1,
  completed: {},
  settings: { volume: 0.35, ambience: true, reducedMotion: false, trails: true, contrast: false },
});
export function parseSave(raw: string | null): Save {
  const save = defaults();
  try {
    const data = JSON.parse(raw ?? '{}');
    if (!data || data.version !== 1) return save;
    if (data.completed && typeof data.completed === 'object')
      for (const [id, score] of Object.entries(data.completed)) {
        const s = score as { echoes?: unknown; ticks?: unknown };
        if (
          s &&
          typeof s.echoes === 'number' &&
          Number.isInteger(s.echoes) &&
          s.echoes >= 0 &&
          typeof s.ticks === 'number' &&
          Number.isInteger(s.ticks) &&
          s.ticks > 0
        )
          save.completed[id] = { echoes: s.echoes, ticks: s.ticks };
      }
    if (data.settings && typeof data.settings === 'object') {
      const s = data.settings;
      if (typeof s.volume === 'number' && Number.isFinite(s.volume))
        save.settings.volume = Math.min(1, Math.max(0, s.volume));
      for (const key of ['ambience', 'reducedMotion', 'trails', 'contrast'] as const)
        if (typeof s[key] === 'boolean') save.settings[key] = s[key];
    }
  } catch {
    /* Broken or unavailable local storage starts with safe defaults. */
  }
  return save;
}
export function loadSave() {
  try {
    return parseSave(localStorage.getItem('echo-save-v1'));
  } catch {
    return defaults();
  }
}
export function writeSave(save: Save) {
  try {
    localStorage.setItem('echo-save-v1', JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
