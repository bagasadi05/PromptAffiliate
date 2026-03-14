import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '../../../contexts/I18nContext.jsx';
import GrokPiStudio from '../../GrokPiStudio.jsx';

const getBackendCapabilitiesMock = vi.fn();

let mockFormState;
let mockAutomationState;
let mockGalleryState;

vi.mock('../../../services/gemini.js', () => ({
    getBackendCapabilities: (...args) => getBackendCapabilitiesMock(...args),
}));

vi.mock('../../../hooks/useGrokPiForm.js', () => ({
    useGrokPiForm: () => mockFormState,
}));

vi.mock('../../../hooks/useGrokPiAutomation.js', () => ({
    useGrokPiAutomation: () => mockAutomationState,
}));

vi.mock('../../../hooks/useGrokPiGallery.js', () => ({
    useGrokPiGallery: () => mockGalleryState,
}));

vi.mock('../GrokPiAutomationForm.jsx', () => ({
    default: () => <div>AutomationFormMock</div>,
}));

vi.mock('../GrokPiJobStatus.jsx', () => ({
    default: ({ grokPiEnabled }) => <div>{`JobStatus:${String(grokPiEnabled)}`}</div>,
}));

vi.mock('../GrokPiGallery.jsx', () => ({
    default: ({ grokPiEnabled }) => <div>{`Gallery:${String(grokPiEnabled)}`}</div>,
}));

function renderWithContext(component) {
    return render(<I18nProvider>{component}</I18nProvider>);
}

describe('GrokPiStudio Orchestrator', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        getBackendCapabilitiesMock.mockResolvedValue({
            geminiEnabled: true,
            grokPiEnabled: true,
        });

        mockFormState = {
            isReady: true,
            form: { renderVideo: true },
            selectedPreset: { id: 'p1', name: 'Preset 1' },
            resolvedProductFocus: 'hijab',
            normalizedAspectRatio: '9:16',
            referenceImageBlob: null,
            referenceImageMimeType: 'image/jpeg',
            imageName: '',
            setField: vi.fn(),
            selectedPresetId: 'p1',
            setSelectedPresetId: vi.fn(),
            imagePreview: '',
            handleSelectImage: vi.fn(),
            handleClearImage: vi.fn(),
        };

        mockAutomationState = {
            isRunning: false,
            runMessage: '',
            steps: {},
            sceneJobs: [],
            results: {},
            activeJobId: null,
            grokPiPrompt: '',
            setGrokPiPrompt: vi.fn(),
            handleRunAutomation: vi.fn(),
            handleCancel: vi.fn(),
            handleRegenerateScene: vi.fn(),
        };

        mockGalleryState = {
            images: [],
            videos: [],
            isLoading: false,
            hasMoreImages: false,
            hasMoreVideos: false,
            refreshGallery: vi.fn(),
            loadMore: vi.fn(),
        };
    });

    it('renders loading state while form is not ready', () => {
        mockFormState.isReady = false;
        renderWithContext(<GrokPiStudio />);

        expect(screen.getByText('Memuat konfigurasi...')).toBeInTheDocument();
    });

    it('renders orchestrator sections when form is ready', async () => {
        renderWithContext(<GrokPiStudio />);

        expect(screen.getByText('GrokPI + Automation Queue')).toBeInTheDocument();
        expect(screen.getByText('AutomationFormMock')).toBeInTheDocument();
        expect(screen.getByText('JobStatus:true')).toBeInTheDocument();
        expect(screen.getByText('Gallery:true')).toBeInTheDocument();
        await waitFor(() => expect(getBackendCapabilitiesMock).toHaveBeenCalledTimes(1));
    });

    it('propagates disabled backend capability to child panels', async () => {
        getBackendCapabilitiesMock.mockResolvedValue({
            geminiEnabled: false,
            grokPiEnabled: false,
        });

        renderWithContext(<GrokPiStudio />);

        await waitFor(() => {
            expect(screen.getByText('JobStatus:false')).toBeInTheDocument();
            expect(screen.getByText('Gallery:false')).toBeInTheDocument();
        });
    });
});
