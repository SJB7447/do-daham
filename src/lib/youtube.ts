/**
 * Checks if a URL is a YouTube URL (standard or shortened).
 */
export function isYoutubeUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Converts any standard or shortened YouTube video URL into its corresponding embed URL.
 * If the URL is already an embed URL, it returns it unchanged.
 * If the URL is not a valid YouTube URL, it returns the original URL.
 */
export function getYoutubeEmbedUrl(url: string): string {
  if (!url) return '';
  
  const trimmed = url.trim();

  // If it's already an embed URL, return it
  if (trimmed.includes('youtube.com/embed/')) {
    return trimmed;
  }
  
  // Regex to extract video ID from various YouTube URL formats:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/v/VIDEO_ID
  // - youtube.com/watch?v=VIDEO_ID
  // - youtu.be/VIDEO_ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  
  if (match && match[2].length === 11) {
    const videoId = match[2];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  return trimmed;
}
