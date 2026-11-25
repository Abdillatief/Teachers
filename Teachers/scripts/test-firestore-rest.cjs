// Firestore REST smoke test. It only runs against an emulator / test project,
// never against the production project, and requires explicit opt-in env vars.
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.FIRESTORE_TEST_PROJECT_ID;
const allowTest = process.env.ALLOW_FIRESTORE_TEST === '1';

if (!emulatorHost || !projectId || !allowTest) {
  console.error('Refusing to run. Set FIRESTORE_EMULATOR_HOST, FIRESTORE_TEST_PROJECT_ID and ALLOW_FIRESTORE_TEST=1.');
  process.exit(1);
}

if (projectId === 'sabeelteacher') {
  console.error('Refusing to run against the production project.');
  process.exit(1);
}

const baseUrl = `http://${emulatorHost.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;

async function testFirestore() {
  console.log(`=== CHECKING FIRESTORE DOCUMENT: settings/academy (${projectId}) ===`);
  try {
    const res = await fetch(`${baseUrl}/settings/academy`);
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('settings/academy doc:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error reading settings/academy:', err);
  }

  console.log('\n=== CREATING TEST NOTIFICATION DOCUMENT in the emulator ===');
  const testId = 'test-emulator-' + Date.now();
  const notifDoc = {
    fields: {
      title: { stringValue: 'TEST PUSH (emulator only)' },
      body: { stringValue: 'اختبار إشعار النظام - Emulator Verification' },
      recipientId: { stringValue: 'TEST_USER_UID' },
      type: { stringValue: 'test' },
      status: { stringValue: 'pending' },
      createdAt: { timestampValue: new Date().toISOString() }
    }
  };

  try {
    const postRes = await fetch(`${baseUrl}/notifications?documentId=${encodeURIComponent(testId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifDoc)
    });
    console.log('Create test notif status:', postRes.status);
    const postData = await postRes.json();
    console.log('Created notif result:', JSON.stringify(postData, null, 2));
  } catch (err) {
    console.error('Error creating test notification:', err);
  }
}

testFirestore();
