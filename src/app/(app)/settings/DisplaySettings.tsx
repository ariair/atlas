'use client';

import { useSettings } from '@/lib/useSettings';
import { Choice, Section, Switch } from './controls';

export default function DisplaySettings() {
  const { settings, update, reset } = useSettings();
  return (
    <Section id="appearance" title="appearance" intro="These are saved in this browser only. They apply to every page straight away.">
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
        legend="Colour vision"
        hint="Swaps the subject colours on the map, map key, deadlines and study pages. Course codes are always shown too."
        value={settings.colourVision}
        onChange={(colourVision) => update({ colourVision })}
        options={[
          { value: 'default', label: 'Standard' },
          { value: 'red-green', label: 'Red-green (protan, deutan)' },
          { value: 'blue-yellow', label: 'Blue-yellow (tritan)' },
        ]}
      />
      <Switch
        label="Atkinson Hyperlegible font"
        hint="Designed to be easy to read, including for people with low vision or dyslexia."
        checked={settings.font === 'atkinson'}
        onChange={(on) => update({ font: on ? 'atkinson' : 'default' })}
      />
      <Switch
        label="Relaxed spacing"
        hint="More room between lines, letters and words."
        checked={settings.spacing === 'relaxed'}
        onChange={(on) => update({ spacing: on ? 'relaxed' : 'default' })}
      />
      <Switch
        label="High contrast"
        hint="Stronger text and borders."
        checked={settings.contrast === 'high'}
        onChange={(on) => update({ contrast: on ? 'high' : 'default' })}
      />
      <Switch
        label="Turn off motion"
        hint="Stops the map drifting and removes animations. Your device's own setting is always respected."
        checked={settings.motion === 'off'}
        onChange={(on) => update({ motion: on ? 'off' : 'system' })}
      />
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <p className="font-medium">Preview</p>
        <p className="mt-1 max-w-prose">
          Neural networks build on gradient descent, which builds on derivatives. Quiz 2 is due Thursday at 11:59 PM and counts for 5% of your grade.
        </p>
      </div>
      <button type="button" className="btn mt-4 rounded-full" onClick={reset}>
        Reset display settings
      </button>
    </Section>
  );
}
