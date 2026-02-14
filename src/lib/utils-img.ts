export const getOptimizedStorageUrl = (url: string | null | undefined, options: { width?: number; height?: number; quality?: number; format?: 'webp' | 'origin' } = {}) => {
  if (!url) return url;
  
  // Apply to Supabase Storage URLs (Cloud or Local)
  const isSupabaseUrl = url.includes('.supabase.co/storage/v1/object/public/') || 
                        url.includes('api.staffygo.com.br/storage/v1/object/public/');

  if (!isSupabaseUrl) {
    return url;
  }

  const params = new URLSearchParams();
  if (options.width) params.append('width', options.width.toString());
  if (options.height) params.append('height', options.height.toString());
  params.append('quality', (options.quality || 70).toString());
  params.append('format', options.format || 'webp');
  
  // Cloudflare and Supabase Optimization params
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
};
