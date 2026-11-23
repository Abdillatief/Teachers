async function checkNotifDoc() {
  const projectId = "sabeelteacher";
  const apiKey = "AIzaSyCDQ7fVz00-BsITXg5qgIkh5KN9SkDJ3Lc";
  const docId = "test-prod-1787684945150";

  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/notifications/${docId}?key=${apiKey}`);
    console.log("Check doc status HTTP:", res.status);
    const data = await res.json();
    console.log("Document content:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error reading notification:", err);
  }
}

checkNotifDoc();
