const configuredMediaBase = import.meta.env?.VITE_MEDIA_BASE_URL || '';
const configuredSiteBase = import.meta.env?.BASE_URL ?? '/';

// Only portfolio media moves to Storage; fonts, the favicon, and app files stay local.
export function publicAssetUrl(assetPath, baseUrl = configuredMediaBase, siteBaseUrl = configuredSiteBase) {
  if (typeof assetPath !== 'string' || !/^\/(?:images|videos)\//.test(assetPath)) return assetPath;
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (base) return `${base}${assetPath}`;
  // Vite's relative base makes one static release usable at / or any subfolder.
  const siteBase = siteBaseUrl.trim();
  const prefix = siteBase ? `${siteBase.replace(/\/+$/, '')}/` : './';
  return `${prefix}${assetPath.slice(1)}`;
}

export function resolveProjectMedia(project, baseUrl = configuredMediaBase, siteBaseUrl = configuredSiteBase) {
  return {
    ...project,
    image: publicAssetUrl(project.image, baseUrl, siteBaseUrl),
    thumbnail: publicAssetUrl(project.thumbnail, baseUrl, siteBaseUrl),
    ...(project.gallery && {
      gallery: project.gallery.map(image => ({
        ...image,
        src: publicAssetUrl(image.src, baseUrl, siteBaseUrl),
        ...(image.fullSrc && { fullSrc: publicAssetUrl(image.fullSrc, baseUrl, siteBaseUrl) }),
      })),
    }),
  };
}
