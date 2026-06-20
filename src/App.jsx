import { useState, useRef, useEffect } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  paper:  "#FAF9F7",
  ink:    "#1C1B1A",
  muted:  "#7A756D",
  border: "#E8E4DE",
  card:   "#FFFFFF",
  sage:   "#4A5D52",
  terra:  "#B5654A",
  sageSoft: "#EDF1EE",
  green:  "#3F7A4F",
  red:    "#B5453A",
};

// ── TTS — via /api/tts Vercel proxy → Azure ar-LB-RamiNeural ─────────────────
let currentAudio = null;
let currentObjectURL = null;

async function speak(text, slow) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.src = "";
    currentAudio.load();
    currentAudio = null;
  }
  if (currentObjectURL) {
    URL.revokeObjectURL(currentObjectURL);
    currentObjectURL = null;
  }

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, slow: !!slow }),
    });
    if (!res.ok) throw new Error("TTS proxy error: " + res.status);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    currentObjectURL = url;

    const audio = new Audio();
    audio.src = url;
    currentAudio = audio;
    audio.onended = () => { URL.revokeObjectURL(url); currentObjectURL = null; currentAudio = null; };
    await audio.play();
  } catch (err) {
    console.warn("TTS failed, falling back to browser:", err);
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find(v => v.lang.startsWith("ar")) || null;
    if (arVoice) utter.voice = arVoice;
    utter.lang = "ar";
    utter.rate = slow ? 0.6 : 0.85;
    window.speechSynthesis.speak(utter);
  }
}

// ── Twemoji — high-res cartoon-style illustrations (CC-BY 4.0, free CDN) ──────
function twemojiUrl(emoji) {
  const codepoints = Array.from(emoji)
    .map(c => c.codePointAt(0).toString(16))
    .filter(cp => cp !== "fe0f")
    .join("-");
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codepoints}.svg`;
}

function EmojiImg({ emoji, peepSeed, size = 90 }) {
  const [failed, setFailed] = useState(false);
  if (peepSeed) return <PeepImg seed={peepSeed} size={size} />;
  if (failed) {
    return <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{emoji}</span>;
  }
  return (
    <img
      src={twemojiUrl(emoji)}
      alt={emoji}
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}

// ── Open Peeps (via DiceBear) — hand-drawn human characters, CC0 ──────────────
// Works on Vercel (real browser, no sandbox CORS restrictions)
function peepsUrl(seed) {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
}

function PeepImg({ seed, size = 100 }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span style={{ fontSize: size * 0.7 }}>🧑</span>;
  return (
    <img
      src={peepsUrl(seed)}
      alt=""
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}

// ── DATA ──────────────────────────────────────────────────────────────────────
// Beginner = picto mode (no reading required) — every word has an emoji
// Intermediate/Advanced = text mode (for the parent / older reader)

const KID_MODULES = [
  {
    id: "family", title: "Famille", icon: "👨‍👩‍👧",
    items: [
      { ar: "مامَا",   tl: "Māma",   emoji: "👩", peepSeed: "mama-lebanon" },
      { ar: "بابَا",   tl: "Bāba",   emoji: "👨", peepSeed: "baba-lebanon" },
      { ar: "تِيتَا",  tl: "Teta",   emoji: "👵", peepSeed: "teta-grandma" },
      { ar: "جِدُّو",  tl: "Jeddo",  emoji: "👴", peepSeed: "jeddo-grandpa" },
      { ar: "خَيِّي",  tl: "Khayye", emoji: "👦", peepSeed: "khayye-brother" },
      { ar: "خْتِي",   tl: "Khté",   emoji: "👧", peepSeed: "khte-sister" },
    ],
  },
  {
    id: "animals", title: "Animaux", icon: "🐾",
    items: [
      { ar: "قَطّ",    tl: "Aṭṭ",    emoji: "🐱" },
      { ar: "كَلْب",   tl: "Kalb",   emoji: "🐶" },
      { ar: "طَيْر",   tl: "Ṭeir",   emoji: "🐦" },
      { ar: "سَمَكِة",  tl: "Samake", emoji: "🐟" },
      { ar: "حْصان",   tl: "Ḥṣān",   emoji: "🐴" },
      { ar: "أَرْنَب",  tl: "Arnab",  emoji: "🐰" },
    ],
  },
  {
    id: "numbers", title: "Nombres", icon: "🔢",
    items: [
      { ar: "وَاحَد",   tl: "Wāḥad", emoji: "1️⃣" },
      { ar: "تْنِين",   tl: "Tnayn", emoji: "2️⃣" },
      { ar: "تْلاتَة",  tl: "Tlāte", emoji: "3️⃣" },
      { ar: "أَرْبَعَة", tl: "Arbaʿa",emoji: "4️⃣" },
      { ar: "خَمْسَة",   tl: "Khamse",emoji: "5️⃣" },
    ],
  },
  {
    id: "food", title: "Manger", icon: "🍽️",
    items: [
      { ar: "خُبْز",    tl: "Khubz",   emoji: "🍞" },
      { ar: "حَلِيب",   tl: "Ḥalīb",   emoji: "🥛" },
      { ar: "تُفّاحَة",  tl: "Tuffāḥa", emoji: "🍎" },
      { ar: "مَوْزَة",   tl: "Mōze",    emoji: "🍌" },
      { ar: "جُبْنِة",   tl: "Jubne",   emoji: "🧀" },
      { ar: "مَيّ",      tl: "Mayy",    emoji: "💧" },
    ],
  },
  {
    id: "feelings", title: "Émotions", icon: "🙂",
    items: [
      { ar: "مَبْسوط",  tl: "Mabsūṭ", emoji: "😄" },
      { ar: "زَعْلان",  tl: "Zaʿlān", emoji: "😢" },
      { ar: "تَعْبان",  tl: "Taʿbān", emoji: "😴" },
      { ar: "خايِف",   tl: "Khāyif", emoji: "😨" },
      { ar: "بْحِبَّك",  tl: "Bḥibbak",emoji: "❤️" },
    ],
  },
  {
    id: "colors", title: "Couleurs", icon: "🎨",
    items: [
      { ar: "أَحْمَر",  tl: "Aḥmar",  emoji: "🔴" },
      { ar: "أَزْرَق",  tl: "Azraʾ",  emoji: "🔵" },
      { ar: "أَصْفَر",  tl: "Aṣfar",  emoji: "🟡" },
      { ar: "أَخْضَر",  tl: "Akhḍar", emoji: "🟢" },
      { ar: "أَبْيَض",  tl: "Abyaḍ",  emoji: "⚪" },
    ],
  },
  {
    id: "body", title: "Corps", icon: "🧍",
    items: [
      { ar: "إِيد",    tl: "Īd",    emoji: "✋" },
      { ar: "عِين",    tl: "ʿEin",  emoji: "👁️" },
      { ar: "راس",     tl: "Rās",   emoji: "🗣️" },
      { ar: "رِجْل",    tl: "Rijl",  emoji: "🦶" },
      { ar: "قَلْب",    tl: "Alb",   emoji: "❤️" },
    ],
  },
  {
    id: "actions", title: "Actions", icon: "🏃",
    items: [
      { ar: "نام",     tl: "Nām",    emoji: "😴" },
      { ar: "كِل",      tl: "Kil",    emoji: "🍴" },
      { ar: "إِشْرَب",   tl: "Ishrab", emoji: "🥤" },
      { ar: "إِلْعَب",   tl: "Ilʿab",  emoji: "🧸" },
      { ar: "رْكُض",    tl: "Rkoḍ",   emoji: "🏃" },
    ],
  },
];

// Adult/reading mode data (intermediate + advanced) — unchanged from before
const TEXT_MODULES = {
  intermediate: [
    {
      id: "daily", icon: "🌆", titleFr: "Vie quotidienne",
      vocab: [
        { ar: "يَلّا",      tl: "Yalla",      fr: "Allez ! On y va !",       note: "LE mot libanais par excellence" },
        { ar: "شو فِي؟",    tl: "Shu fī?",    fr: "Qu'est-ce qu'il y a ?",  note: "Shu = quoi (pas mādhā)" },
        { ar: "ما فِي",     tl: "Mā fī",      fr: "Il n'y a pas / Rien",     note: "" },
        { ar: "بَدِّي",      tl: "Baddī",      fr: "Je veux",                 note: "Pas urīd — baddī est libanais" },
        { ar: "ما بَدِّي",   tl: "Mā baddī",   fr: "Je ne veux pas",          note: "" },
        { ar: "قَدِّيش؟",    tl: "Addeish?",   fr: "Combien ?",               note: "" },
        { ar: "بَس",        tl: "Bas",        fr: "Mais / Seulement / Stop", note: "3 sens selon le contexte !" },
        { ar: "لازِم",      tl: "Lāzim",      fr: "Il faut / Je dois",       note: "" },
        { ar: "مِش لازِم",  tl: "Mish lāzim", fr: "Ce n'est pas obligé",    note: "Mish = négation libanaise" },
        { ar: "وَاللَّه",    tl: "Wallāh",     fr: "Franchement / Vraiment",  note: "Juron doux, très fréquent" },
      ],
      sentences: [
        { ar: "شو عَم تَعْمَل هَلَّق؟",         tl: "Shu ʿam taʿmal hallaʾ?",      fr: "Qu'est-ce que tu fais là ?",      structure: "Shu + ʿam (présent continu) + verbe" },
        { ar: "عَم شْتَغَل مِن البِيت",          tl: "ʿam shtghel min el-beit",     fr: "Je travaille de la maison",       structure: "ʿam (en train de) + verbe + min el-beit" },
        { ar: "بَدِّي رُوح عَالسوبِرْماركِت",     tl: "Baddī rūḥ ʿa el-supermarket",fr: "Je veux aller au supermarché",   structure: "Baddī (je veux) + rūḥ (aller) + lieu" },
        { ar: "ما عِنْدِي مُشْكِلَة",            tl: "Mā ʿandī mushkle",            fr: "Pas de problème / Pas de souci", structure: "Mā + ʿandī (j'ai) + mushkle" },
        { ar: "شو رَأْيَك؟",                    tl: "Shu raʾyak?",                 fr: "Tu en penses quoi ?",            structure: "Shu (quoi) + raʾyak (ton avis)" },
        { ar: "وَاللَّه ما بَعْرِف",             tl: "Wallāh mā baʿrif",            fr: "Franchement je sais pas",        structure: "Wallāh + mā (pas) + baʿrif" },
      ],
    },
    {
      id: "feelings", icon: "💬", titleFr: "Émotions & Opinions",
      vocab: [
        { ar: "مَبْسوط",       tl: "Mabsūṭ",   fr: "Content / Heureux",      note: "-a au féminin : mabsūṭa" },
        { ar: "زَعْلان",       tl: "Zaʿlān",   fr: "Triste / Fâché",         note: "-e féminin : zaʿlāne" },
        { ar: "تَعْبان",       tl: "Taʿbān",   fr: "Fatigué / Épuisé",       note: "-e féminin : taʿbāne" },
        { ar: "كْتِير حِلْو",   tl: "Ktīr ḥelo",fr: "Très beau / Très bien",  note: "Ḥelo = beau, bon, sympa" },
        { ar: "يِسْلَمو",       tl: "Yislamo",  fr: "Merci du fond du cœur",  note: "'que tes mains soient bénies'" },
        { ar: "اَللَّه!",       tl: "Allāh!",   fr: "Waouh ! Mon Dieu !",     note: "Surprise, admiration" },
        { ar: "وْلاه",         tl: "Wlāh",     fr: "Sérieusement ?! Oh là",  note: "Très expressif, très libanais" },
        { ar: "ما شاءَ اللَّه", tl: "Māshallāh",fr: "Comme c'est beau !",    note: "Admiration + contre mauvais œil" },
      ],
      sentences: [
        { ar: "أَنا مَبْسوط كْتِير",                    tl: "Ana mabsūṭ ktīr",                   fr: "Je suis tellement content",       structure: "Ana + état + ktīr (très)" },
        { ar: "بْحِبَّك كْتِير",                         tl: "Bḥibbak ktīr",                      fr: "Je t'aime beaucoup",              structure: "Bḥibb- (j'aime) + -ak/-ik + ktīr" },
        { ar: "حاسِس حالِي تَعْبان اليَوم",              tl: "Ḥāssis ḥāle taʿbān el-yōm",        fr: "Je me sens fatigué aujourd'hui",  structure: "Ḥāssis ḥāle (je me sens) + état" },
        { ar: "هَالأَكَل كْتِير حِلْو، يِسْلَمو إِيدِيكِي", tl: "Hal-akl ktīr ḥelo, yislamo īdēki", fr: "Ce repas est délicieux, bravo !",  structure: "Hal- (ce) + objet + ḥelo + yislamo" },
      ],
    },
    {
      id: "transport", icon: "🚗", titleFr: "Déplacements",
      vocab: [
        { ar: "وِين؟",       tl: "Wein?",         fr: "Où ?",               note: "Wein, pas ayna en libanais" },
        { ar: "كِيف بْروح؟",  tl: "Kīf brūḥ?",    fr: "Comment j'y vais ?", note: "" },
        { ar: "قْرِيب",       tl: "Arīb",          fr: "Proche / Près",      note: "" },
        { ar: "بْعِيد",       tl: "Baʿīd",         fr: "Loin",               note: "" },
        { ar: "دُغْرِي",       tl: "Dughri",        fr: "Tout droit",         note: "Mot d'origine turque !" },
        { ar: "عَالشِّمال",    tl: "ʿa el-shamāl",  fr: "À gauche",           note: "" },
        { ar: "عَالْيَمِين",   tl: "ʿa el-yamīn",   fr: "À droite",           note: "" },
        { ar: "سِرْفِيس",      tl: "Service",       fr: "Taxi collectif",     note: "Transport typique au Liban" },
      ],
      sentences: [
        { ar: "وِين المَطار؟",                         tl: "Wein el-maṭār?",                        fr: "Où est l'aéroport ?",              structure: "Wein (où) + lieu" },
        { ar: "كِيف بْروح عَالمَطار؟",                  tl: "Kīf brūḥ ʿa el-maṭār?",                fr: "Comment je vais à l'aéroport ?",  structure: "Kīf + brūḥ (je vais) + ʿa + lieu" },
        { ar: "رُوح دُغْرِي وبَعْدِين دور عَالشِّمال",    tl: "Rūḥ dughri w baʿdein dūr ʿa el-shamāl",fr: "Tout droit puis tourne à gauche",  structure: "Impératif + dughri + w + baʿdein" },
        { ar: "قَدِّيش تَعَرَّفْنِي عَالمَحَطَّة؟",         tl: "Addeish taʿrufnī ʿa el-maḥaṭṭa?",     fr: "Combien pour la gare ?",          structure: "Addeish + verbe + ʿa + lieu" },
      ],
    },
  ],
  advanced: [
    {
      id: "idioms", icon: "🎭", titleFr: "Expressions idiomatiques",
      vocab: [
        { ar: "يِعْطِيك العافْيِة", tl: "Yʿaṭīk el-ʿāfye",  fr: "Bravo / Bon courage",       note: "Pour remercier quelqu'un qui travaille" },
        { ar: "عَلى راسِي",         tl: "ʿAla rāsī",          fr: "Avec plaisir / Bien sûr",   note: "Marque de respect absolu" },
        { ar: "قَلْبَك أَبْيَض",     tl: "Albak abyaḍ",        fr: "Tu as un cœur d'or",        note: "Grand compliment de générosité" },
        { ar: "طَوِّل بالَك",        tl: "Ṭawwel bālak",       fr: "Sois patient",              note: "Litt. 'allonge ton esprit'" },
        { ar: "اللَّه يِرْحَمو",     tl: "Allah yirḥamo",      fr: "Qu'il repose en paix",      note: "En parlant d'un défunt" },
        { ar: "إِنْشَاللَّه",         tl: "Inshallāh",          fr: "Si Dieu le veut",           note: "Oui, peut-être ou non selon le ton !" },
        { ar: "الحَمْدُ لِلَّه",      tl: "El-ḥamdu lillāh",   fr: "Dieu merci / Tout va bien", note: "Réponse à 'comment tu vas'" },
        { ar: "يِخْزِي العِين",      tl: "Ykhzī el-ʿein",     fr: "Contre le mauvais œil",     note: "Dit après un compliment" },
      ],
      sentences: [
        { ar: "يِعْطِيك العافْيِة عَلى كِلّ هَالشُّغَل",   tl: "Yʿaṭīk el-ʿāfye ʿala kell hal-shughl",fr: "Bravo pour tout ce travail",         structure: "Formule de bénédiction + ʿala (sur) + objet" },
        { ar: "إِنْشَاللَّه بُكْرا يْكون أَحْسَن",          tl: "Inshallāh bukra ykūn aḥsan",           fr: "Espérons que demain sera mieux",     structure: "Inshallāh + bukra + ykūn (sera) + aḥsan" },
        { ar: "الحَمْدُ لِلَّه، ما فِي شِي ناقِصْنا",      tl: "El-ḥamdu lillāh, mā fī shī nāʾisna",  fr: "Dieu merci, on ne manque de rien",   structure: "Formule de gratitude + mā fī (il n'y a pas)" },
        { ar: "طَوِّل بالَك، هَالأُمور بْتِمْشِي",          tl: "Ṭawwel bālak, hal-umūr btimshī",       fr: "Sois patient, les choses avancent",  structure: "Impératif + hal-umūr + btimshī (marchent)" },
      ],
    },
    {
      id: "storytelling", icon: "🗣️", titleFr: "Raconter & Débattre",
      vocab: [
        { ar: "يَعْنِي",       tl: "Yaʿni",         fr: "C'est-à-dire / Genre",    note: "Mot de remplissage universel libanais" },
        { ar: "هِيك وهِيك",    tl: "Hēk w hēk",     fr: "Comme ci comme ça",       note: "" },
        { ar: "بَالضَّبَط",     tl: "Bil-ẓabaṭ",     fr: "Exactement",              note: "" },
        { ar: "مِش هِيك؟",     tl: "Mish hēk?",     fr: "N'est-ce pas ?",          note: "Tag question très fréquente" },
        { ar: "بَالعَكَس",      tl: "Bil-ʿaks",      fr: "Au contraire",            note: "" },
        { ar: "عَالأَقَل",      tl: "ʿAl-aʾall",     fr: "Au moins",               note: "" },
        { ar: "كَأَنُّو",        tl: "Kaʾanno",       fr: "Comme si / On dirait que", note: "" },
        { ar: "خَلِّينِي أَفْهَم", tl: "Khallinī afham",fr: "Laisse-moi comprendre", note: "" },
      ],
      sentences: [
        { ar: "يَعْنِي، بَدَّك تْقول إِنُّو ما حَدا حَكى مَعَك؟", tl: "Yaʿni, baddak tʾūl inno mā ḥada ḥaka maʿak?",fr: "Genre, personne ne t'a parlé ?",      structure: "Yaʿni + baddak tʾūl (tu veux dire) + inno" },
        { ar: "بَالضَّبَط هَيْدا اللِّي عَم قُلُّو",               tl: "Bil-ẓabaṭ hayda lli ʿam ʾello",             fr: "C'est exactement ce que je dis",     structure: "Bil-ẓabaṭ + hayda + lli (que) + ʿam ʾello" },
        { ar: "بَالعَكَس، هَيْدا بِيساعِدْنا أَكْتَر",             tl: "Bil-ʿaks, hayda bisāʿidna aktar",           fr: "Au contraire, ça nous aide plus",    structure: "Bil-ʿaks + hayda + bisāʿidna + aktar (plus)" },
        { ar: "خَلِّينِي أَفْهَم شو اللِّي صار بَالضَّبَط",         tl: "Khallinī afham shu lli ṣār bil-ẓabaṭ",     fr: "Laisse-moi comprendre ce qui s'est passé", structure: "Khallinī + verbe + shu lli ṣār" },
      ],
    },
    {
      id: "culture", icon: "🏛️", titleFr: "Culture & Société",
      vocab: [
        { ar: "ضْيافَة",         tl: "Ḍiyāfe",       fr: "Hospitalité",              note: "Valeur cardinale libanaise" },
        { ar: "تْفَضَّل",          tl: "Tfaḍḍal",      fr: "Je vous en prie / Entrez", note: "Invitation universelle" },
        { ar: "عَلى صِحَّتَك",     tl: "ʿAla ṣaḥtak",  fr: "À ta santé !",             note: "Toast libanais" },
        { ar: "صَحْتِين",          tl: "Ṣaḥtein",      fr: "Bon appétit !",            note: "Réponse : ʿala albak" },
        { ar: "أَهْلاً وسَهْلاً",  tl: "Ahlan w sahlan",fr: "Bienvenue !",             note: "Litt. 'comme avec la famille'" },
        { ar: "عِيب",             tl: "ʿEib",          fr: "C'est honteux / Mal",     note: "Notion sociale forte" },
        { ar: "مَزْبوط",           tl: "Mazbuṭ",        fr: "C'est juste / Correct",   note: "" },
        { ar: "كاسَك",             tl: "Kāsak",         fr: "À ta santé (toast) !",    note: "En levant le verre" },
      ],
      sentences: [
        { ar: "أَهْلاً وسَهْلاً، البَيْت بَيْتَك",                tl: "Ahlan w sahlan, el-beit betak",               fr: "Bienvenue, cette maison est la tienne",       structure: "Formule d'accueil + el-beit betak" },
        { ar: "تْفَضَّل، اِتْفَضَّل مَعْنا",                       tl: "Tfaḍḍal, itfaḍḍal maʿna",                    fr: "Je t'en prie, viens avec nous",               structure: "Tfaḍḍal (invitation) + maʿna (avec nous)" },
        { ar: "الأَكَل اللُّبْناني مِن أَحْسَن أَكَل بَالعالَم",   tl: "El-akl el-Libnānī min aḥsan akl bil-ʿālam",  fr: "La cuisine libanaise est parmi les meilleures", structure: "Sujet + min aḥsan + bil-ʿālam (au monde)" },
        { ar: "الضْيافَة عِنَّا مِش بَس تَقْلِيد، هِيَ قِيمَة",    tl: "El-ḍiyāfe ʿinna mish bas taʾlīd, hiye ʾīme", fr: "L'hospitalité chez nous c'est une valeur",    structure: "Sujet + mish bas (pas seulement) + hiye (c'est)" },
      ],
    },
  ],
};

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ── KidCard — picto mode, auto-plays audio, big tap targets ───────────────────
function KidCard({ item, autoPlay }) {
  useEffect(() => {
    if (autoPlay) {
      const t = setTimeout(() => speak(item.ar), 300);
      return () => clearTimeout(t);
    }
  }, [item, autoPlay]);

  return (
    <div
      onClick={() => speak(item.ar)}
      style={{
        cursor: "pointer", borderRadius: 28, background: C.card,
        border: `2px solid ${C.border}`, height: 280,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 18, boxShadow: "0 6px 20px rgba(0,0,0,0.08)", userSelect: "none",
      }}
    >
      <div style={{
        width: 140, height: 140, borderRadius: "50%", background: C.sageSoft,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <EmojiImg emoji={item.emoji} peepSeed={item.peepSeed} size={92} />
      </div>
      <div style={{ fontSize: 34, fontWeight: 700, color: C.ink, direction: "rtl", fontFamily: "Georgia, serif" }}>{item.ar}</div>
      <button onClick={(e) => { e.stopPropagation(); speak(item.ar); }} style={{
        width: 64, height: 64, borderRadius: 32, background: C.sage, border: "none",
        color: "white", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 14px rgba(74,93,82,0.35)",
      }}>🔊</button>
    </div>
  );
}

// ── KidDeck — swipe through picto cards, no reading needed ────────────────────
function KidDeck({ items, onBack }) {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState({ x: 0, active: false });
  const startX = useRef(0);
  const done = idx >= items.length;

  function next() { setDrag({ x: 0, active: false }); setIdx(i => i + 1); }
  function onDown(e) { startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0; setDrag({ x: 0, active: true }); }
  function onMove(e) { if (!drag.active) return; setDrag({ x: (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - startX.current, active: true }); }
  function onUp() { if (!drag.active) return; if (Math.abs(drag.x) > 80) next(); else setDrag({ x: 0, active: false }); }

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 70, marginBottom: 16 }}>🎉</div>
        <button onClick={onBack} style={{ background: C.sage, color: "white", border: "none", borderRadius: 16, padding: "16px 32px", fontSize: 17, fontWeight: 700, cursor: "pointer" }}>
          Recommencer
        </button>
      </div>
    );
  }

  const current = items[idx];
  const rot = drag.x / 18;

  return (
    <div>
      {/* dots progress, no numbers */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
        {items.map((_, i) => (
          <div key={i} style={{ width: i === idx ? 20 : 8, height: 8, borderRadius: 4, background: i === idx ? C.sage : C.border, transition: "all 0.2s" }} />
        ))}
      </div>

      <div style={{ position: "relative", height: 300, marginBottom: 28 }}>
        {items[idx + 1] && (
          <div style={{ position: "absolute", inset: 0, background: C.card, borderRadius: 28, border: `2px solid ${C.border}`, transform: "scale(0.94) translateY(12px)", opacity: 0.5 }} />
        )}
        <div
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => drag.active && onUp()}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          style={{
            position: "absolute", inset: 0, transform: `translateX(${drag.x}px) rotate(${rot}deg)`,
            transition: drag.active ? "none" : "transform 0.3s", cursor: "grab",
          }}
        >
          <KidCard item={current} autoPlay={true} key={idx} />
        </div>
      </div>

      {/* Big visual nav — no text */}
      <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
        <button onClick={onBack} style={{
          width: 60, height: 60, borderRadius: 30, background: C.card, border: `2px solid ${C.border}`,
          fontSize: 24, cursor: "pointer", color: C.muted,
        }}>🏠</button>
        <button onClick={next} style={{
          width: 60, height: 60, borderRadius: 30, background: C.sage, border: "none",
          fontSize: 26, cursor: "pointer", color: "white", boxShadow: "0 4px 14px rgba(74,93,82,0.35)",
        }}>→</button>
      </div>
    </div>
  );
}

// ── KidQuiz — listen and tap the matching picture ──────────────────────────────
function KidQuiz({ allItems, onBack }) {
  const [questions] = useState(() => shuffle(allItems).slice(0, 6).map(q => ({
    q, options: shuffle([...shuffle(allItems.filter(x => x.tl !== q.tl)).slice(0, 2), q]),
  })));
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const done = idx >= questions.length;
  const cur = !done ? questions[idx] : null;

  useEffect(() => {
    if (cur) { const t = setTimeout(() => speak(cur.q.ar), 400); return () => clearTimeout(t); }
  }, [idx]);

  function pick(opt) {
    if (feedback) return;
    const correct = opt.tl === cur.q.tl;
    setFeedback(correct ? "good" : "bad");
    if (correct) setScore(s => s + 1);
    setTimeout(() => { setFeedback(null); setIdx(i => i + 1); }, correct ? 900 : 1300);
  }

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 70, marginBottom: 12 }}>{score >= questions.length * 0.7 ? "🏆" : "🌟"}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
          {Array.from({ length: questions.length }).map((_, i) => (
            <span key={i} style={{ fontSize: 24 }}>{i < score ? "⭐" : "·"}</span>
          ))}
        </div>
        <button onClick={onBack} style={{ background: C.sage, color: "white", border: "none", borderRadius: 16, padding: "16px 32px", fontSize: 17, fontWeight: 700, cursor: "pointer" }}>
          Rejouer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
        {questions.map((_, i) => <div key={i} style={{ width: i === idx ? 20 : 8, height: 8, borderRadius: 4, background: i <= idx ? C.sage : C.border }} />)}
      </div>

      <button onClick={() => speak(cur.q.ar)} style={{
        display: "block", margin: "0 auto 28px", width: 96, height: 96, borderRadius: 48,
        background: C.ink, border: "none", color: "white", fontSize: 38, cursor: "pointer",
        boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
      }}>🔊</button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {cur.options.map((opt, i) => {
          let bg = C.card, border = C.border, scale = 1;
          if (feedback) {
            if (opt.tl === cur.q.tl) { bg = "#EAF3EC"; border = C.green; scale = feedback === "good" ? 1.06 : 1; }
            else if (feedback === "bad") { /* leave neutral */ }
          }
          return (
            <button key={i} onClick={() => pick(opt)} style={{
              background: bg, border: `3px solid ${border}`, borderRadius: 22,
              height: 110, cursor: "pointer", transform: `scale(${scale})`,
              transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <EmojiImg emoji={opt.emoji} peepSeed={opt.peepSeed} size={64} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Adult mode components (intermediate/advanced) ─────────────────────────────
function SentenceCard({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 16, border: `1.5px solid ${C.border}`, background: C.card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, direction: "rtl", fontFamily: "Georgia, serif", flex: 1, textAlign: "right", lineHeight: 1.4 }}>{item.ar}</div>
        <button onClick={() => speak(item.ar)} style={{ background: "none", border: `1.5px solid ${C.border}`, borderRadius: 18, width: 36, height: 36, cursor: "pointer", color: C.sage, flexShrink: 0 }}>▶</button>
      </div>
      <div style={{ fontSize: 13, fontStyle: "italic", color: C.sage }}>{item.tl}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{item.fr}</div>
      <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", padding: 0, fontSize: 12, cursor: "pointer", color: C.sage, alignSelf: "flex-start", fontWeight: 600, textDecoration: "underline" }}>
        {open ? "Masquer la structure" : "Voir la structure"}
      </button>
      {open && <div style={{ background: C.sageSoft, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.ink }}>{item.structure}</div>}
    </div>
  );
}

function SwipeDeck({ vocab, onBack }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [drag, setDrag] = useState({ x: 0, active: false });
  const startX = useRef(0);
  const done = idx >= vocab.length;
  const current = !done ? vocab[idx] : null;

  function advance() { setFlipped(false); setDrag({ x: 0, active: false }); setIdx(i => i + 1); }
  function onDown(e) { startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0; setDrag({ x: 0, active: true }); }
  function onMove(e) { if (!drag.active) return; setDrag({ x: (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - startX.current, active: true }); }
  function onUp() { if (!drag.active) return; if (Math.abs(drag.x) > 90) advance(); else setDrag({ x: 0, active: false }); }

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 20 }}>Terminé</div>
        <button onClick={onBack} style={{ background: C.card, color: C.ink, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Retour</button>
      </div>
    );
  }

  const rot = drag.x / 18;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.sage, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>← Retour</button>
        <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{idx + 1} / {vocab.length}</span>
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 4, marginBottom: 28, overflow: "hidden" }}>
        <div style={{ width: `${(idx / vocab.length) * 100}%`, height: "100%", background: C.sage, transition: "width 0.3s" }} />
      </div>
      <div style={{ position: "relative", height: 340, marginBottom: 24 }}>
        {vocab[idx + 1] && <div style={{ position: "absolute", inset: 0, background: C.card, borderRadius: 20, border: `1.5px solid ${C.border}`, transform: "scale(0.95) translateY(10px)", opacity: 0.6 }} />}
        <div
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => drag.active && onUp()}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          onClick={() => !drag.x && setFlipped(f => !f)}
          style={{
            position: "absolute", inset: 0, borderRadius: 20, cursor: "grab",
            background: flipped ? C.sage : C.card, border: `1.5px solid ${flipped ? C.sage : C.border}`,
            transform: `translateX(${drag.x}px) rotate(${rot}deg)`,
            transition: drag.active ? "none" : "transform 0.3s, background 0.2s",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "32px 28px", userSelect: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }}
        >
          {!flipped ? (
            <>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.ink, textAlign: "center", marginBottom: 10 }}>{current.fr}</div>
              {current.note && <div style={{ fontSize: 13, color: C.muted, textAlign: "center", maxWidth: 240 }}>{current.note}</div>}
              <div style={{ fontSize: 12, color: C.sage, marginTop: 20, fontWeight: 600 }}>Toucher pour révéler</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 42, fontWeight: 700, color: "white", direction: "rtl", fontFamily: "Georgia, serif", textAlign: "center", marginBottom: 10 }}>{current.ar}</div>
              <div style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", fontStyle: "italic", marginBottom: 16 }}>{current.tl}</div>
              <button onClick={(e) => { e.stopPropagation(); speak(current.ar); }} style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 24, padding: "8px 18px", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Écouter</button>
            </>
          )}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={advance} style={{ background: C.sage, color: "white", border: "none", borderRadius: 14, padding: "14px 40px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Suivant</button>
      </div>
    </div>
  );
}

function ModuleView({ module, onBack }) {
  const [tab, setTab] = useState("vocab");
  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.sage, cursor: "pointer", fontSize: 14, fontWeight: 700, marginBottom: 20 }}>← Retour</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <span style={{ fontSize: 28 }}>{module.icon}</span>
        <h2 style={{ margin: 0, fontSize: 20, color: C.ink, fontWeight: 700 }}>{module.titleFr}</h2>
      </div>
      <div style={{ display: "flex", borderBottom: `1.5px solid ${C.border}`, marginBottom: 24 }}>
        {[{ id: "vocab", label: "Vocabulaire" }, { id: "phrases", label: "Phrases" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", borderBottom: tab === t.id ? `2px solid ${C.sage}` : "2px solid transparent", padding: "10px 4px", marginRight: 24, cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.ink : C.muted }}>{t.label}</button>
        ))}
      </div>
      {tab === "vocab" && <SwipeDeck vocab={module.vocab} onBack={() => setTab("phrases")} />}
      {tab === "phrases" && <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{module.sentences.map((s, i) => <SentenceCard key={i} item={s} />)}</div>}
    </div>
  );
}

function AIChat({ onBack }) {
  const [msgs, setMsgs] = useState([]);
  const [apiMsgs, setApiMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const starters = ["Conjuguer les verbes au présent", "Différence entre baddī et urīd", "Phrase négative", "5 mots libanais essentiels"];

  function send(text) {
    if (!text.trim() || loading) return;
    const um = { role: "user", content: text };
    const newApi = [...apiMsgs, um];
    setMsgs(m => [...m, { role: "user", text }]);
    setApiMsgs(newApi);
    setInput("");
    setLoading(true);
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: "Tu es un professeur expert en arabe libanais (dialecte ʿAmmiyye). Réponds toujours en français.", messages: newApi }),
    })
    .then(r => r.json())
    .then(data => { const reply = data.content?.find(b => b.type === "text")?.text || "Erreur."; setMsgs(m => [...m, { role: "assistant", text: reply }]); setApiMsgs(m => [...m, { role: "assistant", content: reply }]); })
    .catch(() => setMsgs(m => [...m, { role: "assistant", text: "Erreur de connexion." }]))
    .finally(() => setLoading(false));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "75vh" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.sage, cursor: "pointer", fontSize: 14, fontWeight: 700, marginBottom: 14, alignSelf: "flex-start" }}>← Retour</button>
      <div style={{ flexShrink: 0, marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {starters.map((s, i) => <button key={i} onClick={() => send(s)} style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "7px 14px", fontSize: 12, cursor: "pointer", color: C.sage, fontWeight: 600 }}>{s}</button>)}
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: C.sageSoft, borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.length === 0 && <div style={{ margin: "auto", textAlign: "center", color: C.muted, fontSize: 14 }}>Pose une question sur l'arabe libanais</div>}
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
            <div style={{ background: m.role === "user" ? C.sage : C.card, color: m.role === "user" ? "white" : C.ink, borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "12px 16px", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ alignSelf: "flex-start", background: C.card, borderRadius: "16px 16px 16px 4px", padding: "14px 18px", fontSize: 20, letterSpacing: 4, color: C.muted }}>···</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)} placeholder="Ta question…" style={{ flex: 1, padding: "13px 16px", borderRadius: 20, border: `1.5px solid ${C.border}`, fontSize: 14, outline: "none" }} />
        <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{ background: C.sage, color: "white", border: "none", borderRadius: 20, padding: "13px 20px", cursor: "pointer", fontSize: 15, opacity: loading || !input.trim() ? 0.4 : 1 }}>→</button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("kid"); // kid | adult
  const [level, setLevel] = useState("intermediate"); // for adult mode
  const [view, setView] = useState("home");
  const [activeModule, setActiveModule] = useState(null);
  const [kidModule, setKidModule] = useState(null);

  const allKidItems = KID_MODULES.flatMap(m => m.items);
  const currentTextModules = TEXT_MODULES[level] || [];

  // ── Kid mode (picto, audio-first, no reading) ────────────────────────────────
  if (mode === "kid") {
    return (
      <div style={{ minHeight: "100vh", background: C.paper, fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.ink }}>
        <div style={{ borderBottom: `1.5px solid ${C.border}`, padding: "0 16px" }}>
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
            <div onClick={() => { setView("home"); setKidModule(null); }} style={{ cursor: "pointer", fontSize: 16, fontWeight: 700 }}>🇱🇧 Arabe</div>
            <button onClick={() => { setMode("adult"); setView("home"); }} style={{ background: "none", border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "6px 14px", color: C.muted, cursor: "pointer", fontSize: 12 }}>Mode parent</button>
          </div>
        </div>

        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
          {view === "home" && !kidModule && (
            <>
              <button onClick={() => setView("kidquiz")} style={{
                width: "100%", background: C.ink, color: "white", border: "none", borderRadius: 20,
                padding: "20px", fontSize: 20, fontWeight: 700, cursor: "pointer", marginBottom: 20,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                🎧 Écoute et trouve
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                {KID_MODULES.map(m => (
                  <button key={m.id} onClick={() => { setKidModule(m); }} style={{
                    background: C.card, border: `2px solid ${C.border}`, borderRadius: 22,
                    padding: "26px 14px", cursor: "pointer", textAlign: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
                      <EmojiImg emoji={m.icon} size={56} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{m.title}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {kidModule && <KidDeck items={kidModule.items} onBack={() => setKidModule(null)} />}
          {view === "kidquiz" && <KidQuiz allItems={allKidItems} onBack={() => setView("home")} />}
        </div>
      </div>
    );
  }

  // ── Adult mode (text, structure, AI tutor) ───────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: C.ink }}>
      <div style={{ borderBottom: `1.5px solid ${C.border}`, padding: "0 16px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div onClick={() => setView("home")} style={{ cursor: "pointer", fontSize: 16, fontWeight: 700 }}>Arabe Libanais</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setView("chat")} style={{ background: "none", border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "7px 16px", color: C.ink, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Tuteur</button>
            <button onClick={() => { setMode("kid"); setView("home"); }} style={{ background: C.sage, border: "none", borderRadius: 16, padding: "7px 16px", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Mode enfant</button>
          </div>
        </div>
      </div>

      {view === "home" && (
        <div style={{ borderBottom: `1.5px solid ${C.border}`, padding: "0 16px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex" }}>
            {[{ id: "intermediate", fr: "Intermédiaire" }, { id: "advanced", fr: "Avancé" }].map(l => (
              <button key={l.id} onClick={() => setLevel(l.id)} style={{ background: "none", border: "none", borderBottom: level === l.id ? `2px solid ${C.sage}` : "2px solid transparent", padding: "13px 16px", cursor: "pointer", fontSize: 13, fontWeight: level === l.id ? 700 : 500, color: level === l.id ? C.ink : C.muted }}>{l.fr}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px" }}>
        {view === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentTextModules.map(mod => (
              <button key={mod.id} onClick={() => { setActiveModule(mod); setView("module"); }} style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 24 }}>{mod.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{mod.titleFr}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{mod.vocab.length} mots · {mod.sentences.length} phrases</div>
                </div>
                <span style={{ color: C.muted }}>→</span>
              </button>
            ))}
          </div>
        )}
        {view === "module" && activeModule && <ModuleView module={activeModule} onBack={() => setView("home")} />}
        {view === "chat" && <AIChat onBack={() => setView("home")} />}
      </div>
    </div>
  );
}
