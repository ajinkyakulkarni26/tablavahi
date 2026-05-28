/**
 * Marathi UI strings (मराठी).
 * Bols use Devanagari script; the spoken/written language here is Marathi, not Hindi.
 */
export const mr = {
  appTitle: "तबला वही",
  appSubtitle: "तुमची डिजिटल तबला नोंदवही",

  guruName: "वंदनीय श्री प्रफुल्ल आठल्ये",
  dedicationMarathi: "गुरुचरणांमध्ये समर्पित",
  dedicationSubline: "कृतज्ञतेने समर्पित",

  display: "दाखवणे",
  displayBoth: "दोन्ही",
  displayMarathi: "मराठी",
  displayLatin: "लॅटिन",

  /** Script/language label for composition titles (stored in Devanagari) */
  titleMarathi: "शीर्षक (मराठी)",
  titleMarathiPlaceholder: "उदा. तीनताल कायदा",
  titleEnglish: "शीर्षक (इंग्रजी)",

  editorHint:
    "बोल मराठीमध्ये लिहा (देवनागरी लिपी). प्रत्येक मात्रेखाली लॅटिन पूर्वावलोकन दिसेल.",
  guruNoteLabel: "गुरू / समर्पण नोंद (पर्यायी)",
  guruNotePlaceholder: "उदा. गुरूजींकडून २०२० मध्ये शिकलेले…",

  navCompositions: "नोंदी",

  cloudAccountAnonymous: "Anonymous (guest — sign in with Google to save)",
  cloudAccountSignedOut: "Not signed in",
  cloudBuildMissingEnv:
    "Firebase env vars are missing in this hosted build. Add VITE_FIREBASE_* in GitHub Secrets and redeploy.",
  cloudLastSyncNever: "Not synced yet",
  cloudSignInGoogle: "Sign in with Google",
  cloudSignOut: "Sign out",
  cloudSyncNow: "Sync now",
  cloudSyncing: "Syncing...",
} as const;
