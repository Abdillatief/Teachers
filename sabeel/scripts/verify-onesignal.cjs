async function testOneSignal() {
  const appId = '61a2cc38-b4a8-4032-96ae-caa738df2ffd';
  
  // Let's check environment or settings
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY || '';

  console.log("=== STEP 1: CHECKING ONESIGNAL CONFIG ===");
  console.log("ONESIGNAL CONFIG", {
    appId,
    hasApiKey: Boolean(restApiKey)
  });

  const payload = {
    app_id: appId,
    target_channel: "push",
    headings: {
      en: "TEST PUSH",
      ar: "TEST PUSH"
    },
    contents: {
      en: "اختبار إشعار النظام - Production Verification",
      ar: "اختبار إشعار النظام - Production Verification"
    },
    data: {
      url: "/teacher/today-sessions.html",
      notifId: "test-" + Date.now(),
      type: "test"
    },
    android_channel_id: "sabeel_academy_channel_high",
    android_sound: "default",
    included_segments: ["Total Subscriptions"],
    priority: 10
  };

  console.log("\n=== STEP 2: DISPATCHING TO ONESIGNAL REST API ===");
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json'
  };
  if (restApiKey) {
    headers['Authorization'] = `Basic ${restApiKey.trim()}`;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    console.log("ONESIGNAL RESPONSE STATUS:", response.status);
    const resJson = await response.json();
    console.log("ONESIGNAL RESPONSE BODY:", JSON.stringify(resJson, null, 2));

    if (response.ok && !resJson.errors) {
      const recipients = typeof resJson.recipients === 'number' ? resJson.recipients : 0;
      console.log("recipients:", recipients);
    } else {
      console.log("Error details:", resJson.errors);
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testOneSignal();
