import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../../contexts/I18nContext.jsx';
import AdvancedOptions from '../AdvancedOptions.jsx';
import PromptOutput from '../PromptOutput.jsx';
import { DEFAULT_OPTIONS } from '../../constants/defaultOptions.js';

function renderWithContext(component) {
  return render(<I18nProvider>{component}</I18nProvider>);
}

describe('Prompt generator guards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows product name requirement in advanced options', () => {
    renderWithContext(
      <AdvancedOptions
        options={{ ...DEFAULT_OPTIONS, productName: '' }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Nama produk wajib diisi sebelum generate.')).toBeInTheDocument();
    expect(screen.getByText('Hanya Nama Produk yang wajib. Field lain di sini opsional dan berfungsi untuk mempertajam hasil.')).toBeInTheDocument();
    expect(screen.getAllByText('Wajib').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('Contoh: Cushion matte anti crack')).toHaveClass('option-input--danger');
  });

  it('shows learned preference memory and scene pin field in advanced options', () => {
    renderWithContext(
      <AdvancedOptions
        options={{ ...DEFAULT_OPTIONS, productName: 'Produk A', sceneMustIncludeMap: '1: nama produk persis' }}
        onChange={vi.fn()}
        preferenceMemory={{ avoidTerms: ['background gelap'], steeringNotes: ['sebut nama produk lebih awal'] }}
        onClearPreferenceMemory={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole('tab').find((tab) => tab.textContent?.includes('Pro')));

    expect(screen.getByText('Pin per Scene')).toBeInTheDocument();
    expect(screen.getAllByText('Opsional').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Disarankan').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('1: nama produk persis')).toBeInTheDocument();
    expect(screen.getByText('Preferensi yang Dipelajari')).toBeInTheDocument();
    expect(screen.getByText('background gelap')).toBeInTheDocument();
    expect(screen.getByText('sebut nama produk lebih awal')).toBeInTheDocument();
  });

  it('shows AI autofill action and keeps it disabled until references are ready', () => {
    renderWithContext(
      <AdvancedOptions
        options={{ ...DEFAULT_OPTIONS, productName: 'Produk A' }}
        onChange={vi.fn()}
        onAutofillEmptyFields={vi.fn()}
        canAutofill={false}
        isAutofillingOptions={false}
      />,
    );

    expect(screen.getByRole('button', { name: /isi field kosong/i })).toBeDisabled();
    expect(screen.getByText('AI hanya mengisi field yang kosong. Nilai yang sudah ada tidak diubah.')).toBeInTheDocument();
  });

  it('shows autofill preview before suggestions are applied', () => {
    renderWithContext(
      <AdvancedOptions
        options={{ ...DEFAULT_OPTIONS, productName: 'Produk A' }}
        onChange={vi.fn()}
        onAutofillEmptyFields={vi.fn()}
        canAutofill
        isAutofillingOptions={false}
        autofillDraft={{
          mode: 'recommended',
          suggestions: {
            targetAudience: 'Ibu sibuk yang cari makeup cepat',
            mustInclude: 'nama produk persis\nclose-up tekstur',
          },
          appliedKeys: ['targetAudience', 'mustInclude'],
        }}
        onApplyAutofillDraft={vi.fn()}
        onDiscardAutofillDraft={vi.fn()}
      />,
    );

    expect(screen.getByText('Preview Saran AI')).toBeInTheDocument();
    expect(screen.getAllByText('Target Audiens').length).toBeGreaterThan(0);
    expect(screen.getByText(/Ibu sibuk yang cari makeup cepat/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /terapkan saran/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buang/i })).toBeInTheDocument();
  });

  it('disables generate button and shows explicit reason', () => {
    renderWithContext(
      <PromptOutput
        prompt=""
        isLoading={false}
        progress={0}
        generationStage="idle"
        quality={null}
        onRegenerate={vi.fn()}
        history={[]}
        onSelectHistory={vi.fn()}
        onDeleteHistory={vi.fn()}
        onClearHistory={vi.fn()}
        canGenerate={false}
        generateDisabledReason="Isi nama produk terlebih dahulu."
        onGenerate={vi.fn()}
        onCancelGenerate={vi.fn()}
        onPromptChange={vi.fn()}
        selectedPreset={null}
        advancedOptions={{ ...DEFAULT_OPTIONS }}
        favorites={[]}
        onToggleFavorite={vi.fn()}
        onSelectFavorite={vi.fn()}
        onClearFavorites={vi.fn()}
        currentInputMeta={null}
        currentPromptMeta={null}
        canRegenerate
        regenerateWarning=""
      />,
    );

    expect(screen.getByRole('button', { name: /generate prompt/i })).toBeDisabled();
    expect(screen.getByText('Isi nama produk terlebih dahulu.')).toBeInTheDocument();
  });

  it('calls generate without forwarding the click event object', () => {
    const onGenerate = vi.fn();

    renderWithContext(
      <PromptOutput
        prompt=""
        isLoading={false}
        progress={0}
        generationStage="idle"
        quality={null}
        onRegenerate={vi.fn()}
        history={[]}
        onSelectHistory={vi.fn()}
        onDeleteHistory={vi.fn()}
        onClearHistory={vi.fn()}
        canGenerate
        generateDisabledReason=""
        onGenerate={onGenerate}
        onCancelGenerate={vi.fn()}
        onPromptChange={vi.fn()}
        selectedPreset={{ id: 'p1', name: 'Preset', signatureMoves: [] }}
        advancedOptions={{ ...DEFAULT_OPTIONS, productName: 'Produk A' }}
        favorites={[]}
        onToggleFavorite={vi.fn()}
        onSelectFavorite={vi.fn()}
        onClearFavorites={vi.fn()}
        currentInputMeta={null}
        currentPromptMeta={null}
        canRegenerate
        regenerateWarning=""
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /generate prompt/i }));

    expect(onGenerate).toHaveBeenCalledWith();
  });

  it('locks regenerate when current references do not match prompt source', () => {
    renderWithContext(
      <PromptOutput
        prompt="SCENE 1: test"
        isLoading={false}
        progress={0}
        generationStage="idle"
        quality={null}
        onRegenerate={vi.fn()}
        history={[]}
        onSelectHistory={vi.fn()}
        onDeleteHistory={vi.fn()}
        onClearHistory={vi.fn()}
        canGenerate
        generateDisabledReason=""
        onGenerate={vi.fn()}
        onCancelGenerate={vi.fn()}
        onPromptChange={vi.fn()}
        selectedPreset={{ id: 'p1', name: 'Preset', signatureMoves: [] }}
        advancedOptions={{ ...DEFAULT_OPTIONS, sceneCount: 4 }}
        favorites={[]}
        onToggleFavorite={vi.fn()}
        onSelectFavorite={vi.fn()}
        onClearFavorites={vi.fn()}
        currentInputMeta={{ signature: 'current-signature' }}
        currentPromptMeta={{ signature: 'saved-signature', imageCount: 3, productName: 'Produk A', edited: false }}
        canRegenerate={false}
        regenerateWarning="Prompt ini dibuat dari set gambar yang berbeda."
      />,
    );

    expect(screen.getByRole('button', { name: '🔄 Regenerate' })).toBeDisabled();
    expect(screen.getByText(/Regenerate dikunci\./)).toBeInTheDocument();
    expect(screen.getByText('Prompt ini dibuat dari set gambar yang berbeda.')).toBeInTheDocument();
    expect(screen.getByText('Sumber referensi: 3')).toBeInTheDocument();
  });

  it('shows live lifecycle status while generation is running', () => {
    renderWithContext(
      <PromptOutput
        prompt=""
        isLoading
        progress={68}
        generationStage="generating"
        quality={null}
        onRegenerate={vi.fn()}
        history={[]}
        onSelectHistory={vi.fn()}
        onDeleteHistory={vi.fn()}
        onClearHistory={vi.fn()}
        canGenerate={false}
        generateDisabledReason=""
        onGenerate={vi.fn()}
        onCancelGenerate={vi.fn()}
        onPromptChange={vi.fn()}
        selectedPreset={null}
        advancedOptions={{ ...DEFAULT_OPTIONS }}
        favorites={[]}
        onToggleFavorite={vi.fn()}
        onSelectFavorite={vi.fn()}
        onClearFavorites={vi.fn()}
        currentInputMeta={null}
        currentPromptMeta={null}
        canRegenerate
        regenerateWarning=""
      />,
    );

    expect(screen.getByText('Status live')).toBeInTheDocument();
    expect(screen.getByText('Model prompt sedang menyusun scene plan')).toBeInTheDocument();
    expect(screen.getByText('Membuat prompt')).toHaveClass('progress-step--active');
  });

  it('passes revision feedback into regenerate callback', () => {
    const onRegenerateWithFeedback = vi.fn();

    renderWithContext(
      <PromptOutput
        prompt="SCENE 1: test"
        isLoading={false}
        progress={0}
        generationStage="idle"
        quality={null}
        onRegenerate={vi.fn()}
        onRegenerateWithFeedback={onRegenerateWithFeedback}
        history={[]}
        onSelectHistory={vi.fn()}
        onDeleteHistory={vi.fn()}
        onClearHistory={vi.fn()}
        canGenerate
        generateDisabledReason=""
        onGenerate={vi.fn()}
        onCancelGenerate={vi.fn()}
        onPromptChange={vi.fn()}
        selectedPreset={{ id: 'p1', name: 'Preset', signatureMoves: [] }}
        advancedOptions={{ ...DEFAULT_OPTIONS, sceneCount: 4 }}
        favorites={[]}
        onToggleFavorite={vi.fn()}
        onSelectFavorite={vi.fn()}
        onClearFavorites={vi.fn()}
        currentInputMeta={{ signature: 'same-signature' }}
        currentPromptMeta={{ signature: 'same-signature', imageCount: 1, productName: 'Produk A', edited: false }}
        canRegenerate
        regenerateWarning=""
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText(/buat hook lebih soft/i),
      { target: { value: 'Sebut nama produk di scene 1 dan kurangi tone hard sell.' } },
    );

    fireEvent.click(screen.getByRole('button', { name: /regenerate dengan feedback/i }));

    expect(onRegenerateWithFeedback).toHaveBeenCalledWith('Sebut nama produk di scene 1 dan kurangi tone hard sell.');
  });

  it('shows revision compare memory for revised prompts', () => {
    renderWithContext(
      <PromptOutput
        prompt={'SCENE 1: SOFTER OPENING\nPrompt: Nama produk muncul lebih awal dengan tone halus.'}
        isLoading={false}
        progress={0}
        generationStage="idle"
        quality={{
          score: 88,
          status: 'good',
          sceneCount: { expected: 1, actual: 1 },
          checks: [],
          warnings: [],
          tips: [],
          sceneAlignment: [],
        }}
        onRegenerate={vi.fn()}
        onRegenerateWithFeedback={vi.fn()}
        history={[{
          id: 111,
          preset: { id: 'p1', name: 'Preset', emoji: '🎬' },
          prompt: 'SCENE 1: OLD VERSION',
          timestamp: '10.30',
          quality: null,
          options: { ...DEFAULT_OPTIONS },
          meta: { historyId: 111 },
        }]}
        onSelectHistory={vi.fn()}
        onDeleteHistory={vi.fn()}
        onClearHistory={vi.fn()}
        canGenerate
        generateDisabledReason=""
        onGenerate={vi.fn()}
        onCancelGenerate={vi.fn()}
        onPromptChange={vi.fn()}
        selectedPreset={{ id: 'p1', name: 'Preset', signatureMoves: [] }}
        advancedOptions={{ ...DEFAULT_OPTIONS, sceneCount: 1 }}
        favorites={[]}
        onToggleFavorite={vi.fn()}
        onSelectFavorite={vi.fn()}
        onClearFavorites={vi.fn()}
        currentInputMeta={{ signature: 'same-signature' }}
        currentPromptMeta={{
          historyId: 222,
          revisionBaseHistoryId: 111,
          previousPromptSnapshot: 'SCENE 1: OLD VERSION\nPrompt: Hook terlalu keras.',
          revisionFeedback: 'Buat hook lebih soft dan sebut nama produk lebih awal.',
          signature: 'same-signature',
          imageCount: 1,
          productName: 'Produk A',
          edited: false,
        }}
        canRegenerate
        regenerateWarning=""
      />,
    );

    expect(screen.getByText('Memori revisi')).toBeInTheDocument();
    expect(screen.getByText(/Feedback user:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /bandingkan revisi/i }));

    expect(screen.getByText('Versi sebelumnya')).toBeInTheDocument();
    expect(screen.getByText('Versi saat ini')).toBeInTheDocument();
    expect(screen.getByText(/Hook terlalu keras/)).toBeInTheDocument();
    expect(screen.getAllByText(/Nama produk muncul lebih awal/).length).toBeGreaterThan(0);
  });

  it('shows per-scene alignment diagnostics in quality card', () => {
    renderWithContext(
      <PromptOutput
        prompt={'SCENE 1: TEST\nPrompt: test'}
        isLoading={false}
        progress={0}
        generationStage="idle"
        quality={{
          score: 72,
          status: 'fair',
          sceneCount: { expected: 2, actual: 2 },
          checks: [],
          warnings: [],
          tips: [],
          sceneAlignment: [
            { scene: 1, status: 'blocked', matchedTerms: ['close-up tekstur cushion'], violatedAvoidTerms: ['background gelap'] },
            { scene: 2, status: 'missing', matchedTerms: [], violatedAvoidTerms: [] },
          ],
        }}
        onRegenerate={vi.fn()}
        onRegenerateWithFeedback={vi.fn()}
        history={[]}
        onSelectHistory={vi.fn()}
        onDeleteHistory={vi.fn()}
        onClearHistory={vi.fn()}
        canGenerate
        generateDisabledReason=""
        onGenerate={vi.fn()}
        onCancelGenerate={vi.fn()}
        onPromptChange={vi.fn()}
        selectedPreset={{ id: 'p1', name: 'Preset', signatureMoves: [] }}
        advancedOptions={{ ...DEFAULT_OPTIONS, sceneCount: 2 }}
        favorites={[]}
        onToggleFavorite={vi.fn()}
        onSelectFavorite={vi.fn()}
        onClearFavorites={vi.fn()}
        currentInputMeta={null}
        currentPromptMeta={null}
        canRegenerate
        regenerateWarning=""
      />,
    );

    expect(screen.getByText('Alignment per scene')).toBeInTheDocument();
    expect(screen.getByText('Melanggar avoid-list')).toBeInTheDocument();
    expect(screen.getByText(/background gelap/)).toBeInTheDocument();
    expect(screen.getByText('Intent user belum masuk')).toBeInTheDocument();
  });

  it('can send warning and scene diagnostics into revision note', () => {
    renderWithContext(
      <PromptOutput
        prompt={'SCENE 1: TEST\nPrompt: test'}
        isLoading={false}
        progress={0}
        generationStage="idle"
        quality={{
          score: 72,
          status: 'fair',
          sceneCount: { expected: 2, actual: 2 },
          checks: [],
          warnings: [
            {
              code: 'product_name_missing',
              severity: 'high',
              message: 'Exact product name "Produk A" was not detected in the generated prompt.',
            },
          ],
          tips: [],
          sceneAlignment: [
            {
              scene: 2,
              status: 'missing',
              matchedTerms: [],
              violatedAvoidTerms: [],
              pinnedInstruction: 'CTA keranjang kuning',
              missingPinnedTerms: ['CTA keranjang kuning'],
            },
          ],
        }}
        onRegenerate={vi.fn()}
        onRegenerateWithFeedback={vi.fn()}
        history={[]}
        onSelectHistory={vi.fn()}
        onDeleteHistory={vi.fn()}
        onClearHistory={vi.fn()}
        canGenerate
        generateDisabledReason=""
        onGenerate={vi.fn()}
        onCancelGenerate={vi.fn()}
        onPromptChange={vi.fn()}
        selectedPreset={{ id: 'p1', name: 'Preset', signatureMoves: [] }}
        advancedOptions={{ ...DEFAULT_OPTIONS, sceneCount: 2 }}
        favorites={[]}
        onToggleFavorite={vi.fn()}
        onSelectFavorite={vi.fn()}
        onClearFavorites={vi.fn()}
        currentInputMeta={null}
        currentPromptMeta={null}
        canRegenerate
        regenerateWarning=""
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /pakai untuk revisi/i }));
    fireEvent.click(screen.getByRole('button', { name: /kirim ke catatan revisi/i }));

    const textarea = screen.getByPlaceholderText(/buat hook lebih soft/i);
    expect(textarea.value).toContain('Sebut nama produk secara persis lebih awal');
    expect(textarea.value).toContain('Scene 2: penuhi pin ini secara persis');
  });
});
