'use client';

import { useSettings } from '@/lib/useSettings';
import { Choice, Section } from './controls';

export default function DisplaySettings() {
  const { settings, update, reset } = useSettings();
  return (
    <Section
      id="appearance"
      title="Appearance"
      intro="These are saved in this browser only. They apply to every page straight away."
    >
      <Choice
        legend="Theme"
        value={settings.theme}
        onChange={(theme) => update({ theme })}
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
          { value: 'system', label: 'Match my device' },
        ]}
      />
      <Choice
        legend="Text size"
        hint="Makes everything larger, not just the text."
        value={settings.textSize}
        onChange={(textSize) => update({ textSize })}
        options={[
          { value: 'default', label: 'Standard' },
          { value: 'large', label: 'Large' },
          { value: 'xlarge', label: 'Extra large' },
        ]}
      />
      <Choice
        legend="Font"
        hint="Atkinson Hyperlegible is designed to be easy to read, including for people with low vision or dyslexia."
        value={settings.font}
        onChange={(font) => update({ font })}
        options={[
          { value: 'default', label: 'Standard' },
          { value: 'atkinson', label: 'Atkinson Hyperlegible' },
        ]}
      />
      <Choice
        legend="Spacing"
        hint="More room between lines, letters and words."
        value={settings.spacing}
        onChange={(spacing) => update({ spacing })}
        options={[
          { value: 'default', label: 'Standard' },
          { value: 'relaxed', label: 'Relaxed' },
        ]}
      />
      <Choice
        legend="Contrast"
        hint="Stronger text and borders."
        value={settings.contrast}
        onChange={(contrast) => update({ contrast })}
        options={[
          { value: 'default', label: 'Standard' },
          { value: 'high', label: 'High' },
        ]}
      />
      <Choice
        legend="Motion"
        hint="Turning motion off stops the map drifting and removes animations. Your device's own setting is always respected."
        value={settings.motion}
        onChange={(motion) => update({ motion })}
        options={[
          { value: 'system', label: 'Follow my device' },
          { value: 'off', label: 'Turn off' },
        ]}
      />
      <div className="rounded-lg border border-rule bg-surface p-4">
        <p className="font-medium">Preview</p>
        <p className="mt-1 max-w-prose">
          Neural networks build on gradient descent, which builds on derivatives. Quiz 2 is due Thursday at 11:59 PM and counts for 5% of your grade.
        </p>
      </div>
      <button type="button" className="btn" onClick={reset}>
        Reset display settings
      </button>
    </Section>
  );
}
