// Firebase Configuration for Sabeel Academy Client
import firebaseAppletConfig from '../../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || "",
  authDomain: firebaseAppletConfig.authDomain || "",
  projectId: firebaseAppletConfig.projectId || "",
  storageBucket: firebaseAppletConfig.storageBucket || "",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "",
  appId: firebaseAppletConfig.appId || "",
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || "(default)"
};

export default firebaseConfig;
