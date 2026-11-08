'use client';

import { useSettings } from '@/lib/useSettings';
import { Choice, Section, Switch } from './controls';

export default function MapSettings({ subjects }: { subjects: string[] }) {
  const { settings, update } = useSettings();
  const hidden = new Set(settings.hiddenSubjects);
  const toggle = (name: string, show: boolean) => {
    const next = new Set(hidden);
    if (show) next.delete(name);
    else next.add(name);
    update({ hiddenSubjects: [...next] });
  };

  return (
    <Section id="map" title="Map" intro="What the map shows. Hiding something here only changes your view; nothing is deleted.">
      <Choice
        legend="Item names on the map"
        hint="By default a name appears when you hover over a dot. You can also show names as you zoom in, or always. “Always” can look crowded until you zoom in."
        value={settings.nodeNames}
        onChange={(nodeNames) => update({ nodeNames })}
        options={[
          { value: 'hover', label: 'On hover only' },
          { value: 'zoom', label: 'When zoomed in' },
          { value: 'always', label: 'Always' },
        ]}
      />
      <Switch
        label="Suggested links"
        hint="Dashed lines the AI suggests between courses. You can accept or reject each one."
        checked={settings.showSuggested}
        onChange={(showSuggested) => update({ showSuggested })}
      />
      <fieldset>
        <legend className="font-medium">Subjects shown</legend>
        <p className="mt-0.5 max-w-prose text-ink-muted">Untick a subject to hide its island and links from the map.</p>
        {subjects.length === 0 ? (
          <p className="mt-2 text-ink-muted">Your subjects will appear here once you have added a course.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {subjects.map((name) => (
              <li key={name}>
                <label className="choice">
                  <input type="checkbox" checked={!hidden.has(name)} onChange={(e) => toggle(name, e.target.checked)} />
                  {name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </Section>
  );
}
