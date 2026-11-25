// OneSignal verification helper: sends a test push to ONE explicit test account.
// Never runs without an explicit confirmation and a test external_id.
const appId = process.env.ONESIGNAL_APP_ID;
const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
const testExternalId = process.env.ONESIGNAL_TEST_EXTERNAL_ID;
const confirmed = process.env.CONFIRM_TEST_PUSH === '1';

if (!appId || !restApiKey || !testExternalId || !confirmed) {
  console.error('Refusing to send. Set ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY, ONESIGNAL_TEST_EXTERNAL_ID and CONFIRM_TEST_PUSH=1.');
  process.exit(1);
}

async function testOneSignal() {
  console.log('=== STEP 1: CHECKING ONESIGNAL CONFIG ===');
  console.log('ONESIGNAL CONFIG', {
    appId,
    hasApiKey: Boolean(restApiKey),
    testExternalIdConfigured: Boolean(testExternalId)
  });

  const payload = {
    app_id: appId,
    target_channel: 'push',
    headings: {
      en: 'TEST PUSH (test account only)',
      ar: 'TEST PUSH (test account only)'
    },
    contents: {
      en: 'اختبار إشعار النظام - حساب اختبار',
      ar: 'اختبار إشعار النظام - حساب اختبار'
    },
    data: {
      url: '/teacher/today-sessions.html',
      notifId: 'test-' + Date.now(),
      type: 'test'
    },
    android_channel_id: 'sabeel_academy_channel_high',
    android_sound: 'default',
    // Target one test user by external_id; no segments / no broadcasts.
    include_aliases: { external_id: [testExternalId] },
    priority: 10
  };

  console.log('\n=== STEP 2: DISPATCHING TO ONESIGNAL REST API (TEST ACCOUNT) ===');
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    Accept: 'application/json',
    Authorization: `Basic ${restApiKey.trim()}`
  };

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    console.log('ONESIGNAL RESPONSE STATUS:', response.status);
    const resJson = await response.json();
    console.log('ONESIGNAL RESPONSE BODY:', JSON.stringify(resJson, null, 2));

    if (response.ok && !resJson.errors) {
      const recipients = typeof resJson.recipients === 'number' ? resJson.recipients : 0;
      console.log('recipients:', recipients);
      if (recipients > 1) {
        console.error('Unexpected recipient count; stop and review this test script.');
        process.exitCode = 1;
      }
    } else {
      console.log('Error details:', resJson.errors);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fetch error:', err);
    process.exitCode = 1;
  }
}

testOneSignal();
