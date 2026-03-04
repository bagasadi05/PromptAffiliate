
import { useI18n } from '../../hooks/useI18n';
import { showToast } from '../../lib/toastBus';
import { deleteGrokPiImage, deleteGrokPiVideo } from '../../services/gemini';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

// A helper to chunk items into rows of N columns
function chunkArray(array, size) {
    const chunked_arr = [];
    for (let i = 0; i < array.length; i += size) {
        chunked_arr.push(array.slice(i, i + size));
    }
    return chunked_arr;
}

// Component to render a Row of cards
const Row = ({ index, style, data }) => {
    const { rows, type, columnsPerRow, t, handleDeleteImage, handleDeleteVideo } = data;
    const items = rows[index];

    return (
        <div style={{ ...style, display: 'flex', gap: '1rem', paddingBottom: '1rem' }}>
            {items.map((item) => (
                <div className="gpi-gallery__card" key={item.filename} style={{ flex: `1 0 calc(${100 / columnsPerRow}% - 1rem)`, maxWidth: `calc(${100 / columnsPerRow}% - 1rem)` }}>
                    {type === 'image' ? (
                        <img src={item.url} alt={item.filename} loading="lazy" />
                    ) : (
                        <video controls playsInline preload="metadata" src={item.url} />
                    )}
                    <span className="gpi-gallery__filename">{item.filename}</span>
                    <div className="gpi-gallery__overlay">
                        <a className="btn btn--outline btn--sm" href={item.url} target="_blank" rel="noreferrer">{t('openUrl')}</a>
                        <button type="button" className="btn btn--outline btn--sm" onClick={() => { void navigator.clipboard.writeText(item.url).then(() => showToast('Link copied to clipboard!', 'success')); }}>📋 Copy</button>
                        <button type="button" className="btn btn--danger btn--sm" onClick={() => type === 'image' ? void handleDeleteImage(item.filename) : void handleDeleteVideo(item.filename)}>{t('presetActionDelete')}</button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Responsive container to calculate columns and wrap the Virtualized List
const VirtualizedGrid = ({ items, type, hasMore, loadMoreAction, isLoading, t, handleDeleteImage, handleDeleteVideo }) => (
    <div style={{ width: '100%', height: '600px' }}>
        <AutoSizer>
            {({ height, width }) => {
                let columnsPerRow = 1;
                if (width > 1200) columnsPerRow = 4;
                else if (width > 800) columnsPerRow = 3;
                else if (width > 500) columnsPerRow = 2;

                const rows = chunkArray(items, columnsPerRow);
                const rowHeight = type === 'image' ? 300 : 350;

                return (
                    <List
                        height={height}
                        width={width}
                        itemCount={rows.length}
                        itemSize={rowHeight}
                        itemData={{ rows, type, columnsPerRow, t, handleDeleteImage, handleDeleteVideo }}
                        onItemsRendered={({ visibleStopIndex }) => {
                            if (hasMore && !isLoading && visibleStopIndex >= rows.length - 2) {
                                loadMoreAction();
                            }
                        }}
                    >
                        {Row}
                    </List>
                );
            }}
        </AutoSizer>
        {isLoading && <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>{t('galleryLoadingMore').replace('{type}', type)}</div>}
    </div>
);

export default function GrokPiGallery({
    grokPiEnabled,
    images,
    videos,
    isLoading,
    refreshGallery,
    loadMore,
    hasMoreImages,
    hasMoreVideos
}) {
    const { t } = useI18n();

    const handleDeleteImage = async (filename) => {
        try {
            await deleteGrokPiImage(filename);
            await refreshGallery();
            showToast('Image deleted.', 'success');
        } catch (error) {
            showToast(`${t('generateErrorPrefix')}: ${error.message}`, 'error', 5000);
        }
    };

    const handleDeleteVideo = async (filename) => {
        try {
            await deleteGrokPiVideo(filename);
            await refreshGallery();
            showToast('Video deleted.', 'success');
        } catch (error) {
            showToast(`${t('generateErrorPrefix')}: ${error.message}`, 'error', 5000);
        }
    };

    if (!grokPiEnabled) {
        return (
            <div className="gpi-panel">
                <p className="gpi-empty">{t('galleryBackendUnavailable')}</p>
            </div>
        );
    }

    if (!grokPiEnabled) {
        return (
            <div className="gpi-panel">
                <p className="gpi-empty">{t('galleryBackendUnavailable')}</p>
            </div>
        );
    }

    return (
        <>
            {/* GrokPI Images Gallery */}
            <div className="gpi-panel">
                <div className="gpi-panel__title">
                    <h3>GrokPI Images</h3>
                    <span className="meta-badge">{images.length}</span>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={refreshGallery} disabled={isLoading}>
                        {isLoading ? '...' : t('regenerate')}
                    </button>
                </div>
                {images.length === 0 && !isLoading ? (
                    <div className="gpi-empty-state">
                        <span className="gpi-empty-state__icon">🖼️</span>
                        <p className="gpi-empty-state__title">{t('galleryNoImages')}</p>
                        <p className="gpi-empty-state__hint">{t('galleryNoImagesHint')}</p>
                    </div>
                ) : (
                    <VirtualizedGrid items={images} type="image" hasMore={hasMoreImages} loadMoreAction={loadMore} isLoading={isLoading} t={t} handleDeleteImage={handleDeleteImage} handleDeleteVideo={handleDeleteVideo} />
                )}
            </div>

            {/* GrokPI Videos Gallery */}
            <div className="gpi-panel">
                <div className="gpi-panel__title">
                    <h3>GrokPI Videos</h3>
                    <span className="meta-badge">{videos.length}</span>
                </div>
                {videos.length === 0 && !isLoading ? (
                    <div className="gpi-empty-state">
                        <span className="gpi-empty-state__icon">🎬</span>
                        <p className="gpi-empty-state__title">{t('galleryNoVideos')}</p>
                        <p className="gpi-empty-state__hint">{t('galleryNoVideosHint')}</p>
                    </div>
                ) : (
                    <VirtualizedGrid items={videos} type="video" hasMore={hasMoreVideos} loadMoreAction={loadMore} isLoading={isLoading} t={t} handleDeleteImage={handleDeleteImage} handleDeleteVideo={handleDeleteVideo} />
                )}
            </div>
        </>
    );
}
