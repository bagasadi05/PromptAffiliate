const DB_NAME = 'tiktok_prompt_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'grokpi_assets';

/**
 * Initializes and returns the IndexedDB instance.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Saves a Blob (e.g. Image reference) into IndexedDB.
 * @param {string} key 
 * @param {Blob} blob 
 */
export async function saveBlob(key, blob) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(blob, key);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('IndexedDB save error:', error);
        return false;
    }
}

/**
 * Retrieves a Blob from IndexedDB.
 * @param {string} key 
 * @returns {Promise<Blob|null>}
 */
export async function getBlob(key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('IndexedDB get error:', error);
        return null;
    }
}

/**
 * Deletes an entry from IndexedDB.
 * @param {string} key 
 */
export async function deleteBlob(key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('IndexedDB delete error:', error);
        return false;
    }
}
