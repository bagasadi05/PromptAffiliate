import { useState, useCallback, useEffect } from 'react';
import { listGrokPiImages, listGrokPiVideos } from '../services/gemini';
import { useI18n } from './useI18n';

export function useGrokPiGallery(grokPiEnabled) {
    const { t } = useI18n();
    const [images, setImages] = useState([]);
    const [videos, setVideos] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Future-proofing: If backend adds cursor pagination, we'll keep track of it here
    const [imageCursor, setImageCursor] = useState(null);
    const [videoCursor, setVideoCursor] = useState(null);
    const [hasMoreImages, setHasMoreImages] = useState(false);
    const [hasMoreVideos, setHasMoreVideos] = useState(false);

    const fetchGallery = useCallback(async (isLoadMore = false) => {
        if (!grokPiEnabled) {
            setImages([]);
            setVideos([]);
            return;
        }

        setIsLoading(true);
        try {
            const imgParams = { limit: 20 };
            if (isLoadMore && imageCursor) imgParams.cursor = imageCursor;

            const vidParams = { limit: 20 };
            if (isLoadMore && videoCursor) vidParams.cursor = videoCursor;

            const [imagesRes, videosRes] = await Promise.all([
                listGrokPiImages(imgParams),
                listGrokPiVideos(vidParams),
            ]);

            const newImages = Array.isArray(imagesRes?.images) ? imagesRes.images : [];
            const newVideos = Array.isArray(videosRes?.videos) ? videosRes.videos : [];

            if (isLoadMore) {
                setImages(prev => [...prev, ...newImages]);
                setVideos(prev => [...prev, ...newVideos]);
            } else {
                setImages(newImages);
                setVideos(newVideos);
            }

            setImageCursor(imagesRes?.nextCursor || null);
            setVideoCursor(videosRes?.nextCursor || null);
            setHasMoreImages(!!imagesRes?.nextCursor);
            setHasMoreVideos(!!videosRes?.nextCursor);

        } catch (error) {
            console.error("Gallery fetch error: ", error);
            if (!isLoadMore) {
                setImages([]);
                setVideos([]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [grokPiEnabled, imageCursor, videoCursor]);

    const refreshGallery = useCallback(async () => {
        setImageCursor(null);
        setVideoCursor(null);
        return fetchGallery(false);
    }, [fetchGallery]);

    const loadMore = useCallback(async () => {
        return fetchGallery(true);
    }, [fetchGallery]);

    useEffect(() => {
        if (grokPiEnabled) {
            void refreshGallery();
        }
    }, [grokPiEnabled, refreshGallery]);

    return {
        images,
        videos,
        isLoading,
        refreshGallery,
        loadMore,
        hasMoreImages,
        hasMoreVideos,
        setImages,
        setVideos
    };
}
