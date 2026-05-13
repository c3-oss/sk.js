/**
 * Package metadata fetched from the PyPI JSON API.
 */
export interface PyPIPackageInfo {
  /** Canonical package name returned by PyPI. */
  name: string
  /** Latest version reported by PyPI. */
  latestVersion: string
  /** All release versions present in the package metadata. */
  releases: string[]
}

/**
 * Subset of the PyPI JSON response used by this package.
 */
interface PyPIResponse {
  info: {
    name: string
    version: string
  }
  releases: Record<string, unknown[]>
}

/**
 * Fetches package metadata for a single package name from PyPI.
 */
export const fetchPackageInfo = async (packageName: string): Promise<PyPIPackageInfo | null> => {
  const url = `https://pypi.org/pypi/${packageName}/json`
  const response = await fetch(url)

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }

    throw new Error(`PyPI returned status ${response.status}`)
  }

  const data = (await response.json()) as PyPIResponse

  return {
    name: data.info.name,
    latestVersion: data.info.version,
    releases: Object.keys(data.releases),
  }
}

/**
 * Fetches multiple PyPI packages in fixed-size batches and maps failures to null results.
 */
export const fetchMultiplePackages = async (
  packageNames: readonly string[],
  concurrency = 5,
): Promise<Map<string, PyPIPackageInfo | null>> => {
  const results = new Map<string, PyPIPackageInfo | null>()

  for (let index = 0; index < packageNames.length; index += concurrency) {
    const batch = packageNames.slice(index, index + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (name) => {
        try {
          const info = await fetchPackageInfo(name)

          return { name, info }
        } catch {
          return { name, info: null }
        }
      }),
    )

    for (const { name, info } of batchResults) {
      results.set(name, info)
    }
  }

  return results
}
