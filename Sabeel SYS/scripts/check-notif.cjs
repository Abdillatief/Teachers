// One-off diagnostic helper. All connection details come from the environment.
async function checkNotifDoc() {
  const projectId = process.env.FIRESTORE_PROJECT_ID;
  const apiKey = process.env.FIRESTORE_API_KEY;
  const docId = process.env.NOTIFICATION_DOC_ID;
  const baseUrl = (process.env.FIRESTORE_BASE_URL || 'https://firestore.googleapis.com/v1').replace(/\/+$/, '');

  if (!projectId || !apiKey || !docId) {
    console.error('Missing env vars. Set FIRESTORE_PROJECT_ID, FIRESTORE_API_KEY and NOTIFICATION_DOC_ID.');
    process.exit(1);
  }

  try {
    const res = await fetch(`${baseUrl}/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/notifications/${encodeURIComponent(docId)}?key=${encodeURIComponent(apiKey)}`);
    console.log('Check doc status HTTP:', res.status);
    const data = await res.json();
    console.log('Document content:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error reading notification:', err);
    process.exit(1);
  }
}

checkNotifDoc();
