import { beforeEach, describe, expect, it, vi } from 'vitest'

const renderMock = vi.fn(() => ({
  waitUntilExit: async () => undefined,
}))

const createTemplateMock = vi.fn()
const updateTemplateMock = vi.fn()
const deleteTemplateMock = vi.fn()
const listTemplatesMock = vi.fn()
const listRunRecordsMock = vi.fn()
const loadRunRecordMock = vi.fn()
const exportRunMock = vi.fn()
const executeHeadlessRunMock = vi.fn()

vi.mock('ink', () => ({
  render: renderMock,
}))

vi.mock('../services/store.js', () => ({
  createTemplate: createTemplateMock,
  updateTemplate: updateTemplateMock,
  deleteTemplate: deleteTemplateMock,
  listTemplates: listTemplatesMock,
  listRunRecords: listRunRecordsMock,
  loadRunRecord: loadRunRecordMock,
  exportRun: exportRunMock,
}))

vi.mock('../services/headless.js', () => ({
  executeHeadlessRun: executeHeadlessRunMock,
}))

describe('main CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    createTemplateMock.mockResolvedValue({
      id: 'demo.liquid',
      name: 'demo.liquid',
      filePath: '/tmp/demo.liquid',
      content: 'hello {{ name }}',
      updatedAt: '2026-02-19T00:00:00.000Z',
    })
    updateTemplateMock.mockResolvedValue({
      id: 'demo.liquid',
      name: 'demo.liquid',
      filePath: '/tmp/demo.liquid',
      content: 'updated',
      updatedAt: '2026-02-19T00:00:00.000Z',
    })
    deleteTemplateMock.mockResolvedValue(undefined)
    listTemplatesMock.mockResolvedValue([])
    listRunRecordsMock.mockResolvedValue([])
    loadRunRecordMock.mockResolvedValue(null)
    exportRunMock.mockResolvedValue(undefined)
    executeHeadlessRunMock.mockResolvedValue({
      id: 'run-1',
      createdAt: '2026-02-19T00:00:00.000Z',
      status: 'completed',
      config: {
        templateId: 'demo.liquid',
        templateName: 'demo.liquid',
        templatePath: '/tmp/demo.liquid',
        providers: [{ provider: 'claude', model: 'claude-opus-4-6' }],
        entries: [{ name: 'world' }],
        concurrency: 1,
        retries: 1,
        timeoutSeconds: null,
        autoApproval: true,
        cwd: '/tmp',
      },
      tasks: [],
    })
  })

  it('create template via subcommand', async () => {
    const { main } = await import('../main.js')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await main(['templates', 'create', '--name', 'demo', '--content', 'hello {{ name }}'])

    expect(createTemplateMock).toHaveBeenCalledWith('demo', 'hello {{ name }}')
    expect(logSpy).toHaveBeenCalled()
  })

  it('read template via subcommand as json', async () => {
    listTemplatesMock.mockResolvedValue([
      {
        id: 'demo.liquid',
        name: 'demo.liquid',
        filePath: '/tmp/demo.liquid',
        content: 'hello {{ name }}',
        updatedAt: '2026-02-19T00:00:00.000Z',
      },
    ])

    const { main } = await import('../main.js')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await main(['templates', 'read', '--id', 'demo.liquid', '--output-format', 'json'])

    expect(listTemplatesMock).toHaveBeenCalledTimes(1)
    const payload = JSON.parse((logSpy.mock.calls[0] ?? ['{}'])[0] as string) as { template?: { id?: string } }
    expect(payload.template?.id).toBe('demo.liquid')
  })

  it('update template via subcommand', async () => {
    const { main } = await import('../main.js')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await main(['templates', 'update', '--id', 'demo.liquid', '--content', 'updated'])

    expect(updateTemplateMock).toHaveBeenCalledWith('demo.liquid', 'updated')
    expect(logSpy).toHaveBeenCalled()
  })

  it('delete template via subcommand', async () => {
    const { main } = await import('../main.js')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await main(['templates', 'delete', '--id', 'demo.liquid'])

    expect(deleteTemplateMock).toHaveBeenCalledWith('demo.liquid')
    expect(logSpy).toHaveBeenCalled()
  })

  it('opens interactive output for runs command', async () => {
    const { main } = await import('../main.js')

    await main(['runs', '--output-format', 'interactive'])

    expect(renderMock).toHaveBeenCalledTimes(1)
  })

  it('opens interactive output for tasks command with run id', async () => {
    const { main } = await import('../main.js')

    await main(['tasks', '--run-id', 'run-123', '--output-format', 'interactive'])

    expect(renderMock).toHaveBeenCalledTimes(1)
    const element = renderMock.mock.calls[0]?.[0] as { props?: { initialRunId?: string; initialScreen?: string } }
    expect(element.props?.initialRunId).toBe('run-123')
    expect(element.props?.initialScreen).toBe('monitor')
  })

  it('rejects interactive output for run command', async () => {
    const { main } = await import('../main.js')

    await expect(
      main(['run', '--template', 'demo.liquid', '--entries', '[{"name":"world"}]', '--output-format', 'interactive']),
    ).rejects.toThrow('interactive output is not supported for this command')
  })

  it('rejects query with interactive output on runs command', async () => {
    const { main } = await import('../main.js')

    await expect(main(['runs', '--output-format', 'interactive', '--query', 'status == "failed"'])).rejects.toThrow(
      'query requires non-interactive output-format',
    )
  })

  it('parses output format like tfplan-explorer style', async () => {
    const { parseOutputFormat } = await import('../main.js')

    expect(parseOutputFormat(undefined, { defaultValue: 'interactive' })).toBe('interactive')
    expect(parseOutputFormat('table')).toBe('table')
    expect(parseOutputFormat('json')).toBe('json')
    expect(() => parseOutputFormat('invalid')).toThrow('invalid --output-format')
  })
})
