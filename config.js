// ===============================================================
//  অ্যাপের সেটিং — শুধু এই ফাইলটা বদলাবেন
// ===============================================================
window.HANDOVER_CONFIG = {
  // অ্যাপের নাম (পরে পছন্দমতো বদলে দিন)
  appName: "MICU HANDOVER",
  unitName: "MICU",

  // অ্যাডমিন (যিনি সবাইকে অনুমোদন দেবেন)।
  // firestore.rules ফাইলেও একই ইমেইল দিতে হবে।
  adminEmails: ["shishir.mmc163@gmail.com"],

  // Firebase কনসোল → Project settings → Your apps → Web app → Config
  // এখানে ফাঁকা থাকলে অ্যাপ "ডেমো মোডে" চলবে (তথ্য শুধু এই ডিভাইসে থাকবে)।
  firebase: {
    apiKey: "AIzaSyA9_AGbadmejJp5uUR0y9yDaCRN_42HXug",
  authDomain: "micu-handover.firebaseapp.com",
  projectId: "micu-handover",
  storageBucket: "micu-handover.firebasestorage.app",
  messagingSenderId: "541970260478",
  appId: "1:541970260478:web:1d77f06e4a7483ea5ae0af"
  },

  // একজন মেডিকেল অফিসার কয়টি ডিভাইসে ঢুকতে পারবেন (অ্যাডমিনের সীমা নেই)
  maxDevices: 2,

  // শুরুর বেড তালিকা (অ্যাপের Settings থেকেও বদলানো যাবে)
  defaultBeds: ["2203", "2204", "2205", "2206", "2210", "2211", "2212", "2213", "2214", "2215", "2216", "2217"]
};
