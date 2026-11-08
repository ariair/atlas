'use client';

import { useId } from 'react';
import { useSettings } from '@/lib/useSettings';
import { Choice, Row, Section, Switch, Toggle } from './controls';

function SubjectRow({ name, shown, onChange }: { name: string; shown: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <li className="flex items-center justify-between gap-4 py-1">
      <label htmlFor={id} className="cursor-pointer">{name}</label>
      <Toggle id={id} checked={shown} onChange={onChange} />
    </li>
  );
}

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
    <Section id="map" title="map" intro="What the map shows. Hiding something here only changes your view; nothing is deleted.">
      <Choice
        legend="Item names on the map"
        hint="A name appears when you hover over a dot, or you can show names as you zoom in, or always. “Always” can look crowded until you zoom in."
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
      <Row label="Subjects shown" hint="Switch a subject off to hide its island and links from the map.">
        {subjects.length === 0 ? (
          <p className="text-ink-muted">Your subjects will appear here once you have added a course.</p>
        ) : (
          <ul aria-label="Subjects shown" className="min-w-[14rem]">
            {subjects.map((name) => (
              <SubjectRow key={name} name={name} shown={!hidden.has(name)} onChange={(show) => toggle(name, show)} />
            ))}
          </ul>
        )}
      </Row>
    </Section>
  );
}
