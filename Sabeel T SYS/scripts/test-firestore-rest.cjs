async function testFirestore() {
  const projectId = "sabeelteacher";
  const apiKey = "AIzaSyCDQ7fVz00-BsITXg5qgIkh5KN9SkDJ3Lc";

  console.log("=== CHECKING FIRESTORE DOCUMENT: settings/academy ===");
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/academy?key=${apiKey}`);
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("settings/academy doc:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error reading settings/academy:", err);
  }

  console.log("\n=== CREATING TEST NOTIFICATION DOCUMENT in notifications/ ===");
  const testId = "test-prod-" + Date.now();
  const notifDoc = {
    fields: {
      title: { stringValue: "TEST PUSH" },
      body: { stringValue: "اختبار إشعار النظام - Production Verification" },
      recipientId: { stringValue: "USER_UID_TEST" },
      type: { stringValue: "test" },
      status: { stringValue: "pending" },
      createdAt: { timestampValue: new Date().toISOString() }
    }
  };

  try {
    const postRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/notifications?documentId=${testId}&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifDoc)
    });
    console.log("Create test notif status:", postRes.status);
    const postData = await postRes.json();
    console.log("Created notif result:", JSON.stringify(postData, null, 2));
  } catch (err) {
    console.error("Error creating test notification:", err);
  }
}

testFirestore();
