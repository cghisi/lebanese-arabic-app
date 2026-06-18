# Arabe Libanais — Déploiement Vercel

## Structure du projet
```
lebanese-app/
├── api/
│   └── tts.js          ← Proxy serverless Azure TTS (côté serveur, pas de CORS)
├── src/
│   ├── main.jsx        ← Point d'entrée React
│   └── App.jsx         ← Application complète
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

## Déploiement (5 minutes)

### 1. Crée un compte GitHub (si pas déjà fait)
→ https://github.com

### 2. Crée un nouveau repo GitHub
- Clique "New repository"
- Nom : `lebanese-arabic-app`
- Public ou Private (peu importe)
- Upload tous les fichiers de ce dossier

### 3. Crée un compte Vercel
→ https://vercel.com
- "Sign up with GitHub"

### 4. Importe le projet
- "Add New Project" → sélectionne ton repo GitHub
- Framework : **Vite** (détecté automatiquement)
- Clique "Deploy"

### 5. Ajoute ta clé Azure (IMPORTANT)
Dans Vercel → ton projet → Settings → Environment Variables :

| Name | Value |
|------|-------|
| `AZURE_SPEECH_KEY` | `3CwsXIGC2kI3nnIv35pLhETciKpfxklbaWGf21ZXfiT6EIGT4mIeJQQJ99CFACYeBjFXJ3w3AAAYACOGiXX0` |
| `AZURE_SPEECH_REGION` | `eastus` |

→ Clique "Save" puis "Redeploy"

### 6. C'est en ligne ! 🎉
Vercel te donne une URL type `lebanese-arabic-app.vercel.app`
Tu peux l'ouvrir sur iPad Safari — la voix Rami (ar-LB-RamiNeural) fonctionnera parfaitement.

## Bonus : icône sur l'écran d'accueil iPad
Dans Safari → partager → "Sur l'écran d'accueil" → l'app se comporte comme une app native.
