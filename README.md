# Tabla Vahi — तबला वही

A web notebook for Tabla compositions in **Marathi** (written in Devanagari script): write bols in Marathi, read them in **Latin** (e.g. धा → Dha), and display **sam (×)**, **khali (०)**, and **taali (2, 3…)** markers over the correct matras.

*वंदनीय श्री प्रफुल्ल आठल्ये — गुरुचरणांमध्ये समर्पित.*

## Web app (recommended)

```bash
cd web
npm install
npm run dev
```

Open the URL shown (usually http://localhost:5173).

### Features

- **Browse** by taal (Teentaal, Ektaal, …) and type (Kayda, Peshkar, Prakaar, …)
- **View** compositions with vibhag dividers and beat annotations
- **Add / edit** compositions on a matra grid with Marathi input and live transliteration
- **Display modes**: Marathi only, Latin only, or both
- **Tabla designs**: four colour themes for the notebook (Classic, Warm Guru, Ink Contrast, Minimal)
- **Cloud-ready persistence**: optional Firebase sync for long-term storage and Android migration

Replace the sample Teentaal Kayda with your own notation from your Tabla Vahi.

## Permanent storage (Firebase)

To keep data beyond one browser and prepare for Android, enable Firebase:

1) Create a Firebase project
- Enable **Firestore Database**
- Enable **Authentication -> Anonymous**
- Enable **Authentication -> Google** (for account-based login)

2) Add web environment values in `web/.env.local`:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

3) Restart app:

```bash
cd web
npm install
npm run dev
```

4) In the app footer, click **"Migrate / sync all compositions to cloud"** once.

After this:
- Compositions are written to Firestore

You can optionally use **Sign in with Google** in the footer so your data is tied to a real account, making Android migration easier.

## Legacy Java module

The `app/` folder contains the initial Gradle Java stub. The active project is the web app in `web/`.

## Build for production

```bash
cd web
npm run build
npm run preview
```

Static files are in `web/dist/`.
