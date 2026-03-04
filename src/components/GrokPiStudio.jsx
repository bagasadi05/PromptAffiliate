import { useEffect, useState } from 'react';
import { getBackendCapabilities } from '../services/gemini';
import { useI18n } from '../hooks/useI18n';
import { useGrokPiForm } from '../hooks/useGrokPiForm';
import { useGrokPiAutomation } from '../hooks/useGrokPiAutomation';
import { useGrokPiGallery } from '../hooks/useGrokPiGallery';
import GrokPiAutomationForm from './grokpi/GrokPiAutomationForm';
import GrokPiJobStatus from './grokpi/GrokPiJobStatus';
import GrokPiGallery from './grokpi/GrokPiGallery';

export default function GrokPiStudio({ presets = [], initialPreset = null, initialPromptOptions = null }) {
  const { t } = useI18n();
  const [geminiEnabled, setGeminiEnabled] = useState(true);
  const [grokPiEnabled, setGrokPiEnabled] = useState(true);
  const [capabilitiesLoaded, setCapabilitiesLoaded] = useState(false);

  // Initialize modular hooks
  const grokPiForm = useGrokPiForm(presets, initialPreset, initialPromptOptions);

  const automationState = useGrokPiAutomation({
    form: grokPiForm.form,
    selectedPreset: grokPiForm.selectedPreset,
    resolvedProductFocus: grokPiForm.resolvedProductFocus,
    normalizedAspectRatio: grokPiForm.normalizedAspectRatio,
    referenceImageBlob: grokPiForm.referenceImageBlob,
    referenceImageMimeType: grokPiForm.referenceImageMimeType,
    imageName: grokPiForm.imageName,
    geminiEnabled,
    grokPiEnabled
  });

  const grokPiGallery = useGrokPiGallery(grokPiEnabled);

  useEffect(() => {
    let mounted = true;
    getBackendCapabilities()
      .then((cap) => {
        if (!mounted) return;
        setGeminiEnabled(Boolean(cap?.geminiEnabled));
        setGrokPiEnabled(Boolean(cap?.grokPiEnabled));
        setCapabilitiesLoaded(true);
      })
      .catch(() => {
        if (!mounted) return;
        setGeminiEnabled(false);
        setGrokPiEnabled(false);
        setCapabilitiesLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="gpi-studio">
      <div className="gpi-studio__header">
        <h2>{t('grokPiStudioTitle')}</h2>
        <span className="panel-badge">GrokPI + Automation Queue</span>
      </div>

      {!grokPiForm.isReady && <div className="gpi-loading">Memuat konfigurasi...</div>}

      {grokPiForm.isReady && (
        <div className="gpi-layout">
          {/* LIFT SIDE (Controls) */}
          <GrokPiAutomationForm
            formState={grokPiForm}
            presets={presets}
            isRunning={automationState.isRunning}
            runMessage={automationState.runMessage}
            onRunAutomation={automationState.handleRunAutomation}
            onCancel={automationState.handleCancel}
          />

          {/* RIGHT SIDE (Progress & Results) */}
          <div className="gpi-layout__right">
            <GrokPiJobStatus
              automationState={automationState}
              grokPiEnabled={grokPiEnabled}
              refreshGallery={grokPiGallery.refreshGallery}
              referenceImageBlob={grokPiForm.referenceImageBlob}
              formState={grokPiForm}
            />

            <GrokPiGallery
              grokPiEnabled={grokPiEnabled}
              images={grokPiGallery.images}
              videos={grokPiGallery.videos}
              isLoading={grokPiGallery.isLoading}
              refreshGallery={grokPiGallery.refreshGallery}
              loadMore={grokPiGallery.loadMore}
              hasMoreImages={grokPiGallery.hasMoreImages}
              hasMoreVideos={grokPiGallery.hasMoreVideos}
            />
          </div>
        </div>
      )}
    </div>
  );
}
