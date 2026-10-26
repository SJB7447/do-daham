/**
 * Checks if a URL is a YouTube URL (standard or shortened).
 */
export function isYoutubeUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Extracts the 11-character YouTube video ID from various YouTube URL formats
 * (watch?v=, youtu.be/, embed/, shorts/, live/, v/).
 * Returns null if the URL is a channel/handle URL or not a valid video URL.
 */
export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  const patterns = [
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Checks whether a URL points to a specific embeddable YouTube video (has an 11-char video ID).
 */
export function isEmbeddableYoutubeVideo(url: string): boolean {
  return extractYoutubeVideoId(url) !== null;
}

/**
 * Converts any standard, shorts, live, or shortened YouTube video URL into its embed URL.
 * If the URL is not an embeddable video URL (e.g. a channel URL), returns the original trimmed URL.
 */
export function getYoutubeEmbedUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const videoId = extractYoutubeVideoId(trimmed);

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return trimmed;
}

/**
 * Converts any YouTube video or embed URL into a standard clickable watch URL.
 * If it's a channel URL (e.g., https://www.youtube.com/@CodeM_Studio_AI11), returns it as-is.
 */
export function getYoutubeWatchUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const videoId = extractYoutubeVideoId(trimmed);

  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  return trimmed;
}
