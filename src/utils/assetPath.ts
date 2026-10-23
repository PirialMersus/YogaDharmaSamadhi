export function getAssetUrl(assetPath: string): string {
  const sanitizedPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath
  const baseUrl = import.meta.env.BASE_URL || '/'
  const trailingSlash = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${trailingSlash}${sanitizedPath}`
}
