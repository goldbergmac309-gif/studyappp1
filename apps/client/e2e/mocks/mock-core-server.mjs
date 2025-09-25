import http from 'http'
import { parse } from 'url'

const PORT = +(process.env.PORT || process.env.CORE_PORT || 3001)

let userSeq = 1
let subjectSeq = 1
let noteSeq = 1
let docSeq = 1
let examSeq = 1

const subjects = [] // { id, name }
const notesBySubject = new Map() // subjectId -> Array<Note>
const documentsBySubject = new Map() // subjectId -> Array<Document>
const chunksBySubject = new Map() // subjectId -> Array<{ documentId, index, text, embedding:number[] }>
const exams = new Map() // examId -> { id, subjectId, status, params, result }

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key'

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
  const { pathname } = parse(req.url, true)
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

    // Documents collection: /subjects/:id/documents
    if (rest === 'documents') {
      if (req.method === 'GET') {
        const arr = documentsBySubject.get(subjectId) || []
        // Return minimal shape needed by client (id, filename, status, createdAt)
        return json(res, 200, arr.map((d) => ({ id: d.id, filename: d.filename, status: d.status, createdAt: d.createdAt })))
      }
      if (req.method === 'POST') {
        // Minimal handler: ignore actual file body and just register a document
        const now = new Date().toISOString()
        const doc = {
          id: `d-${docSeq++}`,
          subjectId,
          filename: 'uploaded.pdf',
          status: 'UPLOADED',
          createdAt: now,
          updatedAt: now,
          s3Key: `documents/mock/${subjectId}/d-${docSeq}/uploaded.pdf`,
        }
        const arr = documentsBySubject.get(subjectId) || []
        arr.push(doc)
        documentsBySubject.set(subjectId, arr)
        return json(res, 201, doc)
      }
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

    // Semantic search: /subjects/:id/search
    if (rest === 'search' && req.method === 'GET') {
      const started = Date.now()
      const q = (parse(req.url, true).query || {}).query || ''
      const chunks = chunksBySubject.get(subjectId) || []
      const needle = String(q).toLowerCase()
      const docs = documentsBySubject.get(subjectId) || []
      const results = chunks
        .filter((c) => String(c.text).toLowerCase().includes(needle))
        .slice(0, 10)
        .map((c, i) => {
          const doc = docs.find((d) => d.id === c.documentId)
          return {
            documentId: c.documentId,
            documentFilename: doc?.filename || 'document.pdf',
            chunkIndex: c.index,
            snippet: c.text,
            score: 0.9 - i * 0.05,
          }
        })
      const tookMs = Date.now() - started
      // Return v2 envelope
      return json(res, 200, { results, nextCursor: null, tookMs })
    }

    // Subject topics V2: /subjects/:id/topics
    if (rest === 'topics' && req.method === 'GET') {
      const chunks = chunksBySubject.get(subjectId) || []
      const bag = new Map()
      for (const c of chunks) {
        for (const w of String(c.text).split(/\W+/)) {
          const word = w.toLowerCase()
          if (!word || word.length < 3) continue
          bag.set(word, (bag.get(word) || 0) + 1)
        }
      }
      const topics = Array.from(bag.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([label, weight]) => ({ label, weight, terms: [] }))
      return json(res, 200, { topics, computedAt: new Date().toISOString(), version: 'mock-v2' })
    }

    // Bulk insights: /subjects/:id/insights
    if (rest === 'insights' && req.method === 'GET') {
      const chunks = chunksBySubject.get(subjectId) || []
      const byDoc = new Map()
      for (const c of chunks) {
        const list = byDoc.get(c.documentId) || []
        list.push(c)
        byDoc.set(c.documentId, list)
      }
      const insights = {}
      for (const [docId, arr] of byDoc.entries()) {
        const text = arr.map((x) => String(x.text)).join(' ')
        const bag = new Map()
        for (const w of String(text).split(/\W+/)) {
          const word = w.toLowerCase()
          if (!word || word.length < 3) continue
          bag.set(word, (bag.get(word) || 0) + 1)
        }
        const keywords = Array.from(bag.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([term, count]) => ({ term, score: count }))
        insights[docId] = {
          id: `ar-${docId}`,
          engineVersion: 'oracle-v2',
          resultPayload: {
            keywords,
            metrics: { pages: 1, textLength: text.length },
          },
        }
      }
      return json(res, 200, insights)
    }

    // Exams: /subjects/:id/exams/generate
    if (rest === 'exams/generate' && req.method === 'POST') {
      const examId = `e-${examSeq++}`
      exams.set(examId, { id: examId, subjectId, status: 'PROCESSING', params: {}, result: null })
      return json(res, 202, { examId, status: 'queued' })
    }
  }

  // Exams: GET /exams/:id
  const examMatch = pathname?.match(/^\/exams\/([^\/]+)$/)
  if (examMatch && req.method === 'GET') {
    const examId = examMatch[1]
    const ex = exams.get(examId)
    if (!ex) return notFound(res)
    return json(res, 200, ex)
  }

  // Documents: GET /documents/:id/analysis -> return basic analysis result using chunks text
  const analysisMatch = pathname?.match(/^\/documents\/([^\/]+)\/analysis$/)
  if (analysisMatch && req.method === 'GET') {
    const documentId = analysisMatch[1]
    // Find subject that owns this document
    let subjId = null
    for (const [sid, docs] of documentsBySubject.entries()) {
      if ((docs || []).some((d) => d.id === documentId)) { subjId = sid; break }
    }
    if (!subjId) return notFound(res)
    const chunks = (chunksBySubject.get(subjId) || []).filter((c) => c.documentId === documentId)
    const text = chunks.map((c) => String(c.text)).join(' ')
    const bag = new Map()
    for (const w of String(text).split(/\W+/)) {
      const word = w.toLowerCase()
      if (!word || word.length < 3) continue
      bag.set(word, (bag.get(word) || 0) + 1)
    }
    const keywords = Array.from(bag.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count]) => ({ term, score: count }))
    const result = {
      id: `ar-${documentId}`,
      engineVersion: 'oracle-v2',
      resultPayload: {
        keywords,
        metrics: { pages: 1, textLength: text.length },
      },
    }
    return json(res, 200, result)
  }

  // Internal APIs (require X-Internal-API-Key)
  if (pathname?.startsWith('/internal/')) {
    const key = req.headers['x-internal-api-key']
    if (!key || String(key) !== INTERNAL_KEY) {
      res.writeHead(401)
      return res.end()
    }
    // GET /internal/subjects/:id/documents
    const listDocs = pathname.match(/^\/internal\/subjects\/([^\/]+)\/documents$/)
    if (listDocs && req.method === 'GET') {
      const subjectId = listDocs[1]
      const arr = documentsBySubject.get(subjectId) || []
      return json(res, 200, arr.map((d) => ({ id: d.id, s3Key: d.s3Key || '' })))
    }
    // PUT /internal/reindex/:subjectId/chunks
    const reindex = pathname.match(/^\/internal\/reindex\/([^\/]+)\/chunks$/)
    if (reindex && req.method === 'PUT') {
      const subjectId = reindex[1]
      const body = await readBody(req)
      const { documentId, dim, chunks } = body || {}
      if (!documentId || !Array.isArray(chunks)) return json(res, 400, { message: 'invalid payload' })
      const docs = documentsBySubject.get(subjectId) || []
      if (!docs.some((d) => d.id === documentId)) return json(res, 404, { message: 'doc not under subject' })
      const items = chunksBySubject.get(subjectId) || []
      for (const ch of chunks) {
        items.push({ documentId, index: ch.index ?? 0, text: ch.text ?? '', embedding: Array.isArray(ch.embedding) ? ch.embedding : Array(dim || 1).fill(0) })
      }
      chunksBySubject.set(subjectId, items)
      // Mark document as COMPLETED to simulate processing done
      const arr = documentsBySubject.get(subjectId) || []
      const now = new Date().toISOString()
      for (const d of arr) {
        if (d.id === documentId) {
          d.status = 'COMPLETED'
          d.updatedAt = now
        }
      }
      documentsBySubject.set(subjectId, arr)
      return json(res, 200, { upsertedChunks: chunks.length, upsertedEmbeddings: chunks.length })
    }
    // PUT /internal/exams/:id/result
    const examPut = pathname.match(/^\/internal\/exams\/([^\/]+)\/result$/)
    if (examPut && req.method === 'PUT') {
      const examId = examPut[1]
      const ex = exams.get(examId)
      if (!ex) return notFound(res)
      const body = await readBody(req)
      ex.status = 'READY'
      ex.result = body?.result || { questions: [] }
      exams.set(examId, ex)
      return json(res, 200, { ok: true })
    }
  }

  return notFound(res)
})

server.listen(PORT, () => {
  console.log(`[mock-core] listening on http://localhost:${PORT}`)
})
