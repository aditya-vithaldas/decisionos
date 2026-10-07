import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const project = process.env.CONTACT_FIRESTORE_PROJECT;
if (!project) throw new Error('Set CONTACT_FIRESTORE_PROJECT.');
const token = execFileSync(process.env.GCLOUD_BIN || 'gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const collection = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/contact_submissions`;

async function cloud(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Firestore ${options.method || 'GET'} failed (${response.status})`);
  return response.json();
}

async function allDocuments() {
  const documents = [];
  let pageToken = '';
  do {
    const url = new URL(collection);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const page = await cloud(url);
    documents.push(...(page.documents || []));
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  return documents;
}

const value = (document, key) => document.fields?.[key]?.stringValue || document.fields?.[key]?.timestampValue || '';
const summary = document => ({
  id: document.name.split('/').at(-1),
  name: value(document, 'name'), company: value(document, 'company'),
  email: value(document, 'email'), inquiry: value(document, 'inquiry'),
  submittedAt: value(document, 'submittedAt'),
  batchId: value(document, 'digestBatchId'),
  status: value(document, 'notificationStatus'),
});

async function patch(document, fields) {
  const url = new URL(document.name.replace('projects/', 'https://firestore.googleapis.com/v1/projects/'));
  for (const key of Object.keys(fields)) url.searchParams.append('updateMask.fieldPaths', key);
  url.searchParams.set('currentDocument.updateTime', document.updateTime);
  await cloud(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, key === 'notifiedAt' ? { timestampValue: value } : { stringValue: value }])) }),
  });
}

const command = process.argv[2];
const documents = await allDocuments();
if (command === 'list') {
  console.log(JSON.stringify({
    pending: documents.filter(doc => value(doc, 'notificationStatus') === 'pending').map(summary),
    reserved: documents.filter(doc => value(doc, 'notificationStatus') === 'digest_reserved').map(summary),
  }));
} else if (command === 'reserve') {
  const pending = documents.filter(doc => value(doc, 'notificationStatus') === 'pending').slice(0, 50);
  if (!pending.length) console.log(JSON.stringify({ batchId: null, entries: [] }));
  else {
    const batchId = randomUUID();
    for (const document of pending) await patch(document, { notificationStatus: 'digest_reserved', digestBatchId: batchId });
    console.log(JSON.stringify({ batchId, entries: pending.map(summary) }));
  }
} else if (command === 'mark-sent') {
  const [batchId, gmailMessageId] = process.argv.slice(3);
  if (!batchId || !gmailMessageId) throw new Error('Provide batch ID and Gmail message ID.');
  const reserved = documents.filter(doc => value(doc, 'notificationStatus') === 'digest_reserved' && value(doc, 'digestBatchId') === batchId);
  for (const document of reserved) await patch(document, {
    notificationStatus: 'digest_sent', notificationId: gmailMessageId, notifiedAt: new Date().toISOString(),
  });
  console.log(JSON.stringify({ markedSent: reserved.length }));
} else {
  throw new Error('Use list, reserve, or mark-sent.');
}
