import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../../contexts/I18nContext.jsx';
import PresetSelector from '../PresetSelector.jsx';

const PRESETS = [
  {
    id: 'preset-a',
    name: 'Soft Review',
    vibe: 'Calm demo',
    category: 'Beauty',
    energyLevel: 'Low',
    bpmRange: '90-110',
    cameraStyle: 'Close',
    signatureMoves: ['Open product slowly'],
    notes: 'Keep it soft',
    emoji: '✨',
    color: '#a855f7',
  },
  {
    id: 'preset-b',
    name: 'Fast Hook',
    vibe: 'Aggressive CTA',
    category: 'Fashion',
    energyLevel: 'High',
    bpmRange: '120-140',
    cameraStyle: 'Dynamic',
    signatureMoves: ['Snap zoom'],
    notes: 'Punchy pacing',
    emoji: '🔥',
    color: '#f97316',
  },
];

function renderWithContext(component) {
  return render(<I18nProvider>{component}</I18nProvider>);
}

describe('PresetSelector', () => {
  it('keeps selected preset detail visible even when hidden by filter', () => {
    renderWithContext(
      <PresetSelector
        presets={PRESETS}
        selectedPreset={PRESETS[1]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Fast Hook').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText(/Cari preset/i), {
      target: { value: 'Soft Review' },
    });

    expect(screen.getAllByText('Fast Hook')).toHaveLength(1);
    expect(screen.getByText(/Preset terpilih sedang berada di luar filter aktif/i)).toBeInTheDocument();
  });
});
