/**
 * Download text content as a .txt file
 * @param {string} content - Text content to download
 * @param {string} filename - Filename (without extension)
 */
export function downloadTxt(content, filename = 'tiktok-prompt') {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default downloadTxt;
