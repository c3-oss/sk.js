import { useCallback, useEffect, useState } from 'react'

import type { RunSummary, TemplateFile } from '../../dtos/types.js'
import { ensureStorage, listRuns, listTemplates } from '../../services/store.js'

export const useStore = () => {
  const [templates, setTemplates] = useState<readonly TemplateFile[]>([])
  const [runs, setRuns] = useState<readonly RunSummary[]>([])

  const loadAll = useCallback(async (): Promise<void> => {
    await ensureStorage()
    const [tpl, runList] = await Promise.all([listTemplates(), listRuns()])
    setTemplates(tpl)
    setRuns(runList)
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  return { templates, runs, loadAll } as const
}
