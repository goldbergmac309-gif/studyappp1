#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

async function main() {
  const [,, subjectId, bearer, filePath] = process.argv;
  if (!subjectId || !bearer || !filePath) {
    console.error('usage: container_upload.mjs <subjectId> <bearerToken> <filePath>');
    process.exit(2);
  }
  const name = path.basename(filePath);
  const buf = fs.readFileSync(filePath);

  const fd = new FormData();
  fd.append('file', new Blob([buf]), name);

  const res = await fetch(`http://localhost:3000/subjects/${subjectId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearer}` },
    body: fd,
  });
  const text = await res.text();
  const output = { status: res.status, body: text };
  console.log(JSON.stringify(output));
}

main().catch((e) => {
  console.error('upload_error', e && e.message ? e.message : String(e));
  process.exit(1);
});
