function normalizePart(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}

export function buildPublicAssetPath(...segments) {
  const normalized = segments
    .map((segment) => normalizePart(segment))
    .filter((segment) => segment.length > 0)
    .join('/')

  // Use PUBLIC_PATH (from vue.config.js) when available to support subpath deployments.
  // process.env.PUBLIC_PATH is inlined at build time by Vue CLI.
  const rawBase = String(process.env.PUBLIC_PATH || '/')
    .replace(/\\/g, '/')
  let base = rawBase.replace(/\/\/+$/, '')
  if (base === '') base = '/'
  if (!base.startsWith('/')) base = `/${base}`

  if (normalized.length === 0) return base
  if (base === '/') return `/${normalized}`
  return `${base}/${normalized}`
}
