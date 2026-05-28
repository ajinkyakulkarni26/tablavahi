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
  navDesigns: "डिझाइन",

  designsTitle: "तबला डिझाइन",
  designsIntroNoImages:
    "वहीची रंगरंगी निवडा. चित्रे काढून टाकली आहेत; आता लक्ष फक्त ताल-रचना आणि बोलांवर आहे.",
  tabDesigns: "डिझाइन",
  activeDesign: "सक्रिय",

  cloudPanelTitle: "क्लाऊड खाते आणि समक्रमण",
  cloudConfigured: "क्लाऊड सक्षम",
  cloudNotConfigured: "क्लाऊड अजून सेट केलेले नाही",
  cloudStatusLabel: "स्थिती",
  cloudAccountLabel: "खाते",
  cloudAccountAnonymous: "अनामिक (guest — sign in with Google to save)",
  cloudAccountSignedOut: "Not signed in",
  cloudBuildMissingEnv:
    "या होस्टेड आवृत्तीत Firebase env नाही. GitHub Secrets मध्ये VITE_FIREBASE_* जोडा आणि पुन्हा deploy करा.",
  cloudLastSyncLabel: "शेवटचे समक्रमण",
  cloudLastSyncNever: "अजून झालेले नाही",
  cloudSignInGoogle: "Sign in with Google",
  cloudSignOut: "Sign out",
  cloudSyncNow: "आता सर्व डेटा समक्रमित करा",
  cloudSyncing: "समक्रमण सुरू आहे...",
} as const;
