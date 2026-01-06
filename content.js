// This function extracts the dominant color from a favicon
async function extractFaviconColor(faviconUrl) {
  if (!faviconUrl) return null;
  
  try {
    // Create an off-screen canvas to analyze the favicon
    const img = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Failed to load favicon'));
      img.src = faviconUrl;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width || 16;
    canvas.height = img.height || 16;
    ctx.drawImage(img, 0, 0);

    // Get the image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Simple color extraction: get the most common non-transparent color
    const colorMap = new Map();
    let maxCount = 0;
    let dominantColor = null;

    for (let i = 0; i < data.length; i += 4) {
      // Skip transparent or mostly transparent pixels
      if (data[i + 3] < 128) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const colorKey = `${r},${g},${b}`;

      const count = (colorMap.get(colorKey) || 0) + 1;
      colorMap.set(colorKey, count);

      if (count > maxCount) {
        maxCount = count;
        dominantColor = { r, g, b };
      }
    }

    return dominantColor;
  } catch (error) {
    console.error('Error extracting favicon color:', error);
    return null;
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getFaviconColor') {
    const favicon = document.querySelector('link[rel*="icon"]') || 
                   document.querySelector('meta[property="og:image"]');
    
    const faviconUrl = favicon ? favicon.href || favicon.content : null;
    
    if (!faviconUrl) {
      sendResponse({ color: null });
      return true;
    }

    extractFaviconColor(faviconUrl)
      .then(color => sendResponse({ color }))
      .catch(() => sendResponse({ color: null }));

    return true; // Will respond asynchronously
  }
});
