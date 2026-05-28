/**
 * Marathi UI strings (मराठी).
 * Bols use Devanagari script; the spoken/written language here is Marathi, not Hindi.
 */
export const mr = {
  appTitle: "तबला वही",
  appSubtitle: "तुमची डिजिटल तबला नोंदवही",
  appTagline:
    "कायदा, पेशकार, प्रकार आणि इतर नोंदी. मराठीमध्ये बोल लिहा, लॅटिनमध्ये वाचा — सम, खाली आणि ताली चिन्हांसह.",

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

  cloudPanelTitle: "Cloud Account and Sync",
  cloudConfigured: "Cloud enabled",
  cloudNotConfigured: "Cloud not configured yet",
  cloudStatusLabel: "Status",
  cloudAccountLabel: "Account",
  cloudAccountAnonymous: "Anonymous (guest — sign in with Google to save)",
  cloudAccountSignedOut: "Not signed in",
  cloudBuildMissingEnv:
    "Firebase env vars are missing in this hosted build. Add VITE_FIREBASE_* in GitHub Secrets and redeploy.",
  cloudLastSyncLabel: "Last sync",
  cloudLastSyncNever: "Not synced yet",
  cloudYes: "Yes",
  cloudNo: "No",
  cloudSignInGoogle: "Sign in with Google",
  cloudSignOut: "Sign out",
  cloudSyncNow: "Sync now",
  cloudSyncing: "Syncing...",
} as const;
