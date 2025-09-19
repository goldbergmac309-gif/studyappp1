import http from 'http'
import { parse } from 'url'

const PORT = +(process.env.PORT || process.env.CORE_PORT || 3001)

let userSeq = 1
let subjectSeq = 1
let noteSeq = 1

const subjects = [] // { id, name }
const notesBySubject = new Map() // subjectId -> Array<Note>

function json(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  })
  res.end(body)
}

function noContent(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  })
  res.end()
}

function notFound(res) { json(res, 404, { message: 'Not found' }) }

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) } catch { resolve({}) }
    })
  })
}

const server = http.createServer(async (req, res) => {
  const { pathname, query } = parse(req.url, true)
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return noContent(res)
  }

  // Auth signup
  if (req.method === 'POST' && pathname === '/auth/signup') {
    const body = await readBody(req)
    const user = { id: `u-${userSeq++}`, email: String(body?.email || 'user@example.com') }
    return json(res, 201, { accessToken: 'test-token', user })
  }

  // Auth login (accept any credentials)
  if (req.method === 'POST' && pathname === '/auth/login') {
    const body = await readBody(req)
    const email = String(body?.email || 'user@example.com')
    // deterministic id for mock login
    const user = { id: 'u-login', email }
    return json(res, 200, { accessToken: 'test-token', user })
  }

  // Subjects list (simple tab filter ignored)
  if (req.method === 'GET' && pathname === '/subjects') {
    return json(res, 200, subjects)
  }

  // Create subject
  if (req.method === 'POST' && pathname === '/subjects') {
    const body = await readBody(req)
    const s = { id: `s-${subjectSeq++}`, name: String(body?.name || 'Untitled') }
    subjects.push(s)
    return json(res, 201, s)
  }

  // Match /subjects/:id
  const subjMatch = pathname?.match(/^\/subjects\/([^\/]+)(?:\/(.*))?$/)
  if (subjMatch) {
    const subjectId = subjMatch[1]
    const rest = subjMatch[2] || ''
    const subject = subjects.find((s) => s.id === subjectId)
    if (!subject) {
      if (req.method === 'GET' && rest === '') return notFound(res)
    }

    if (req.method === 'GET' && rest === '') {
      return json(res, 200, subject)
    }

    // Notes collection: /subjects/:id/notes
    if (rest === 'notes') {
      if (req.method === 'GET') {
        const arr = notesBySubject.get(subjectId) || []
        return json(res, 200, arr)
      }
      if (req.method === 'POST') {
        const body = await readBody(req)
        const now = new Date().toISOString()
        const note = {
          id: `n-${noteSeq++}`,
          subjectId,
          title: String(body?.title || 'Untitled'),
          content: body?.content ?? { type: 'doc', content: [] },
          createdAt: now,
          updatedAt: now,
        }
        const arr = notesBySubject.get(subjectId) || []
        arr.unshift(note)
        notesBySubject.set(subjectId, arr)
        return json(res, 201, note)
      }
    }

    // Note item: /subjects/:id/notes/:noteId
    const noteMatch = rest.match(/^notes\/([^\/]+)$/)
    if (noteMatch) {
      const noteId = noteMatch[1]
      const arr = notesBySubject.get(subjectId) || []
      const idx = arr.findIndex((n) => n.id === noteId)
      if (idx === -1) return notFound(res)
      if (req.method === 'GET') return json(res, 200, arr[idx])
      if (req.method === 'PATCH') {
        const body = await readBody(req)
        const updated = {
          ...arr[idx],
          ...(body?.title !== undefined ? { title: String(body.title) } : {}),
          ...(body?.content !== undefined ? { content: body.content } : {}),
          updatedAt: new Date().toISOString(),
        }
        arr[idx] = updated
        notesBySubject.set(subjectId, arr)
        return json(res, 200, updated)
      }
      if (req.method === 'DELETE') {
        arr.splice(idx, 1)
        notesBySubject.set(subjectId, arr)
        return noContent(res)
      }
    }
  }

  return notFound(res)
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock-core] listening on http://localhost:${PORT}`)
})
