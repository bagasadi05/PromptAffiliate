import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '../../../contexts/I18nContext.jsx';
import GrokPiStudio from '../GrokPiStudio.jsx';

// Mocks for hooks and functions
vi.mock('../../../hooks/useGrokPiAutomation.js', () => ({
    useGrokPiAutomation: () => ({
        isRunning: false,
        runMessage: '',
        steps: { prompt: { status: 'idle' }, video: { status: 'idle' } },
        sceneJobs: [],
        results: {},
        activeJobId: null,
        handleRunAutomation: vi.fn(),
        handleCancel: vi.fn(),
    })
}));

vi.mock('../../../hooks/useGrokPiGallery.js', () => ({
    useGrokPiGallery: () => ({
        images: [],
        videos: [],
        isLoading: false,
        hasMoreImages: false,
        hasMoreVideos: false,
        refreshGallery: vi.fn(),
        loadMore: vi.fn(),
    })
}));

vi.mock('../../../hooks/useGrokPiForm.js', () => ({
    useGrokPiForm: () => ({
        form: { presetName: 'Standard', sceneCount: 4 },
        referenceImagePreview: null,
        referenceImageBlob: null,
        handleFileChange: vi.fn(),
        handleRemoveImage: vi.fn(),
        handleStringArrayInput: vi.fn(),
        setForm: vi.fn(),
    })
}));

describe('GrokPiStudio Orchestrator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithContext = (component) => {
        return render(<I18nProvider>{component}</I18nProvider>);
    };

    it('renders the core studio components and titles', () => {
        renderWithContext(<GrokPiStudio geminiEnabled={true} grokPiEnabled={true} />);

        // Assert header exists
        expect(screen.getByText(/GrokPI Dashboard/i)).toBeInTheDocument();
        // Assert form exists
        expect(screen.getByText(/Reference Photo/i)).toBeInTheDocument();
    });

    it('shows warning when GrokPI backend is disabled', () => {
        renderWithContext(<GrokPiStudio geminiEnabled={true} grokPiEnabled={false} />);

        // Since it passes grokPiEnabled down, the gallery component intercepts and shows a warning
        expect(screen.getByText(/GrokPI backend is unavailable/i)).toBeInTheDocument();
    });
});
