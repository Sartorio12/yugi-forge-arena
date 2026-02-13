export const getOptimizedStorageUrl = (url: string | null | undefined, options: { width?: number; height?: number; quality?: number; format?: 'webp' | 'origin' } = {}) => {
  if (!url) return url;
  
  // Only apply to Supabase Storage URLs
  if (!url.includes('.supabase.co/storage/v1/object/public/')) {
    return url;
  }

  const params = new URLSearchParams();
  if (options.width) params.append('width', options.width.toString());
  if (options.height) params.append('height', options.height.toString());
  params.append('quality', (options.quality || 70).toString());
  params.append('format', options.format || 'webp');
  
  const separator = url.includes('?') ? '&' : '?';
  const paramString = params.toString();
  
  return `${url}${separator}${paramString}`;
};
