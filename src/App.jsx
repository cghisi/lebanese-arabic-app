import { useState, useRef, useEffect } from "react";

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  ink:      "#0F0F0F",
  paper:    "#F7F4EE",
  blue:     "#1B4FD8",
  gold:     "#C9963A",
  muted:    "#6B6560",
  border:   "#DDD9D0",
  card:     "#FFFFFF",
  green:    "#1A7A4A",
  red:      "#C0392B",
  blueSoft: "#EBF0FD",
  goldSoft: "#FDF5E6",
};

// ── TTS — via /api/tts Vercel proxy → Azure ar-LB-RamiNeural ─────────────────
let currentAudio = null;

async function speak(text, slow) {
  try {
    if (currentAudio) { currentAudio.pause(); currentAudio.src = ""; currentAudio = null; }

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, slow: !!slow }),
    });

    if (!res.ok) throw new Error("TTS proxy error: " + res.status);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = function() { URL.revokeObjectURL(url); };
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

function unlockAudio(cb) { if (cb) cb(); }
function loadVoices() { return null; }

// ── Data ──────────────────────────────────────────────────────────────────────
const LEVELS = [
  { id: "beginner",     fr: "Débutant",      desc: "Mots essentiels & premières phrases" },
  { id: "intermediate", fr: "Intermédiaire", desc: "Conversations du quotidien" },
  { id: "advanced",     fr: "Avancé",        desc: "Expressions idiomatiques & nuances" },
];

const MODULES = {
  beginner: [
    {
      id: "greetings", icon: "👋", titleFr: "Salutations",
      vocab: [
        { ar: "مرحبا",      tl: "Marḥaba",         fr: "Bonjour / Salut",       note: "La salutation universelle" },
        { ar: "كيفك؟",     tl: "Kīfak? / Kīfik?", fr: "Comment tu vas ?",       note: "-ak (homme) / -ik (femme)" },
        { ar: "منيح",       tl: "Mnīḥ",            fr: "Bien / Bon",             note: "Mot clé du dialecte libanais" },
        { ar: "شكراً",      tl: "Shukran",         fr: "Merci",                  note: "" },
        { ar: "عفواً",      tl: "ʿAfwan",          fr: "De rien / Pardon",       note: "" },
        { ar: "صباح الخير", tl: "Ṣabāḥ el-kheir", fr: "Bonjour (matin)",        note: "Réponse : Ṣabāḥ el-nūr" },
        { ar: "مساء الخير", tl: "Masā el-kheir",  fr: "Bonsoir",                note: "Réponse : Masā el-nūr" },
        { ar: "يلا باي",    tl: "Yalla bye",       fr: "Au revoir !",            note: "Mix arabe-anglais typiquement libanais" },
      ],
      sentences: [
        { ar: "مرحبا! كيفك؟",                 tl: "Marḥaba! Kīfak?",               fr: "Bonjour ! Comment tu vas ?",                structure: "Salutation + Question" },
        { ar: "منيح كتير، شكراً",              tl: "Mnīḥ ktīr, shukran",            fr: "Très bien, merci",                          structure: "Adjectif + ktīr (très) + merci" },
        { ar: "شو اسمك؟",                     tl: "Shu ismak?",                    fr: "Comment tu t'appelles ?",                   structure: "Shu (quoi) + ism (nom) + -ak (toi)" },
        { ar: "من وين انت؟",                  tl: "Min wein inta?",                fr: "Tu viens d'où ?",                           structure: "Min (de) + wein (où) + inta (tu, masc.)" },
        { ar: "أنا من كندا، بس أصلي لبناني",  tl: "Ana min Kanada, bas aṣlī Libnānī", fr: "Je suis du Canada, mais d'origine libanaise", structure: "Ana min + pays + bas (mais) + aṣlī (mes origines)" },
      ],
    },
    {
      id: "numbers", icon: "🔢", titleFr: "Nombres & Temps",
      vocab: [
        { ar: "واحد",   tl: "Wāḥad",  fr: "Un",          note: "" },
        { ar: "تنين",   tl: "Tnayn",  fr: "Deux",         note: "Libanais : tnayn (MSA : ithnān)" },
        { ar: "تلاتة",  tl: "Tlāte",  fr: "Trois",        note: "" },
        { ar: "أربعة",  tl: "Arbaʿa", fr: "Quatre",       note: "" },
        { ar: "خمسة",   tl: "Khamse", fr: "Cinq",         note: "" },
        { ar: "عشرة",   tl: "ʿAshra", fr: "Dix",          note: "" },
        { ar: "هلق",    tl: "Hallaʾ", fr: "Maintenant",   note: "Très libanais" },
        { ar: "بكرا",   tl: "Bukra",  fr: "Demain",       note: "" },
        { ar: "امبارح", tl: "Embāriḥ",fr: "Hier",         note: "" },
      ],
      sentences: [
        { ar: "قديش الساعة؟",      tl: "Addeish el-sāʿa?",      fr: "Quelle heure est-il ?",       structure: "Addeish (combien) + sāʿa (heure)" },
        { ar: "الساعة تلاتة",      tl: "El-sāʿa tlāte",         fr: "Il est trois heures",         structure: "El-sāʿa + nombre" },
        { ar: "قديش هالشي؟",       tl: "Addeish hal-shī?",      fr: "Combien ça coûte ?",          structure: "Addeish + hal (ce) + shī (chose)" },
        { ar: "بكرا رح نشوف بعض", tl: "Bukra raḥ nshūf baʿd", fr: "Demain on se voit",           structure: "Bukra + raḥ (futur) + verbe" },
        { ar: "هلق ما عندي وقت",  tl: "Hallaʾ mā ʿandī waʾt", fr: "Là je n'ai pas le temps",    structure: "Hallaʾ + mā (pas) + ʿandī (j'ai)" },
      ],
    },
    {
      id: "family", icon: "👨‍👩‍👧", titleFr: "Famille",
      vocab: [
        { ar: "ماما",    tl: "Māma",    fr: "Maman",          note: "" },
        { ar: "بابا",    tl: "Bāba",    fr: "Papa",           note: "" },
        { ar: "تيتا",    tl: "Teta",    fr: "Grand-mère",     note: "Très courant au Liban" },
        { ar: "جدو",     tl: "Jeddo",   fr: "Grand-père",     note: "" },
        { ar: "خي",      tl: "Khayye",  fr: "Frère",          note: "Forme affectueuse libanaise" },
        { ar: "ختي",     tl: "Khté",    fr: "Sœur",           note: "" },
        { ar: "عمو",     tl: "ʿAmmo",   fr: "Oncle",          note: "Aussi pour les hommes plus âgés" },
        { ar: "حبيبي",   tl: "Ḥabībī",  fr: "Mon chéri (m)", note: "Terme d'affection omniprésent" },
        { ar: "حبيبتي",  tl: "Ḥabībti", fr: "Ma chérie (f)", note: "" },
      ],
      sentences: [
        { ar: "هيدا اخوي",         tl: "Hayda akhūye",       fr: "C'est mon frère",             structure: "Hayda (c'est lui) + akhūye (mon frère)" },
        { ar: "عندي تلت ولاد",     tl: "ʿAndī tlāt wlād",   fr: "J'ai trois enfants",          structure: "ʿAndī (j'ai) + nombre + wlād (enfants)" },
        { ar: "كيف حال ماماتك؟",   tl: "Kīf ḥāl māmātak?", fr: "Comment va ta maman ?",       structure: "Kīf ḥāl (comment va) + māmātak (ta maman)" },
        { ar: "عيلتي كبيرة كتير",  tl: "ʿEylté kbīre ktīr", fr: "Ma famille est très grande", structure: "ʿEylté (ma famille) + kbīre + ktīr (très)" },
      ],
    },
  ],
  intermediate: [
    {
      id: "daily", icon: "🌆", titleFr: "Vie quotidienne",
      vocab: [
        { ar: "يلا",      tl: "Yalla",     fr: "Allez ! On y va !",        note: "LE mot libanais par excellence" },
        { ar: "شو في؟",   tl: "Shu fī?",   fr: "Qu'est-ce qu'il y a ?",   note: "Shu = quoi (pas mādhā en libanais)" },
        { ar: "ما في",    tl: "Mā fī",     fr: "Il n'y a pas / Rien",      note: "" },
        { ar: "بدي",      tl: "Baddī",     fr: "Je veux",                  note: "Pas urīd — baddī est le mot libanais" },
        { ar: "ما بدي",   tl: "Mā baddī",  fr: "Je ne veux pas",           note: "" },
        { ar: "قديش؟",    tl: "Addeish?",  fr: "Combien ?",                note: "" },
        { ar: "بس",       tl: "Bas",       fr: "Mais / Seulement / Stop",  note: "3 sens selon le contexte !" },
        { ar: "لازم",     tl: "Lāzim",     fr: "Il faut / Je dois",        note: "" },
        { ar: "مش لازم",  tl: "Mish lāzim",fr: "Ce n'est pas obligé",     note: "Mish = négation libanaise" },
        { ar: "والله",    tl: "Wallāh",    fr: "Franchement / Vraiment",   note: "Juron doux, très fréquent" },
      ],
      sentences: [
        { ar: "شو عم تعمل هلق؟",          tl: "Shu ʿam taʿmal hallaʾ?",      fr: "Qu'est-ce que tu fais là ?",       structure: "Shu + ʿam (présent continu) + verbe + hallaʾ" },
        { ar: "عم شتغل من البيت",          tl: "ʿam shtghel min el-beit",      fr: "Je travaille de la maison",        structure: "ʿam (en train de) + verbe + min el-beit" },
        { ar: "بدي روح عالسوبرماركت",      tl: "Baddī rūḥ ʿa el-supermarket", fr: "Je veux aller au supermarché",    structure: "Baddī (je veux) + rūḥ (aller) + lieu" },
        { ar: "ما عندي مشكلة",            tl: "Mā ʿandī mushkle",             fr: "Pas de problème / Pas de souci",  structure: "Mā (pas) + ʿandī (j'ai) + mushkle" },
        { ar: "شو رأيك؟",                 tl: "Shu raʾyak?",                  fr: "Tu en penses quoi ?",             structure: "Shu (quoi) + raʾyak (ton avis)" },
        { ar: "والله ما بعرف",            tl: "Wallāh mā baʿrif",             fr: "Franchement je sais pas",         structure: "Wallāh + mā (pas) + baʿrif (je sais)" },
      ],
    },
    {
      id: "feelings", icon: "💬", titleFr: "Émotions & Opinions",
      vocab: [
        { ar: "مبسوط",     tl: "Mabsūṭ",   fr: "Content / Heureux",       note: "-a au féminin : mabsūṭa" },
        { ar: "زعلان",     tl: "Zaʿlān",   fr: "Triste / Fâché",          note: "-e féminin : zaʿlāne" },
        { ar: "تعبان",     tl: "Taʿbān",   fr: "Fatigué / Épuisé",        note: "-e féminin : taʿbāne" },
        { ar: "كتير حلو",  tl: "Ktīr ḥelo",fr: "Très beau / Très bien",   note: "Ḥelo = beau, bon, sympa" },
        { ar: "يسلمو",     tl: "Yislamo",  fr: "Merci du fond du cœur",   note: "Litt. 'que tes mains soient bénies'" },
        { ar: "الله!",     tl: "Allāh!",   fr: "Waouh ! Mon Dieu !",      note: "Surprise, admiration" },
        { ar: "ولاه",      tl: "Wlāh",     fr: "Sérieusement ?! Oh là",   note: "Très expressif, très libanais" },
        { ar: "ما شاء الله",tl: "Māshallāh",fr: "Comme c'est beau !",     note: "Admiration + protection du mauvais œil" },
      ],
      sentences: [
        { ar: "أنا مبسوط كتير",             tl: "Ana mabsūṭ ktīr",              fr: "Je suis tellement content",       structure: "Ana + état + ktīr (très)" },
        { ar: "بحبك كتير",                  tl: "Bḥibbak ktīr",                 fr: "Je t'aime beaucoup",              structure: "Bḥibb- (j'aime) + -ak/-ik (toi) + ktīr" },
        { ar: "حاسس حالي تعبان اليوم",      tl: "Ḥāssis ḥāle taʿbān el-yōm",  fr: "Je me sens fatigué aujourd'hui",  structure: "Ḥāssis ḥāle (je me sens) + état + el-yōm" },
        { ar: "هالأكل كتير حلو، يسلمو إيديكي", tl: "Hal-akl ktīr ḥelo, yislamo īdēki", fr: "Ce repas est délicieux, bravo !", structure: "Hal- (ce) + objet + ḥelo + yislamo (formule de gratitude)" },
      ],
    },
    {
      id: "transport", icon: "🚗", titleFr: "Déplacements",
      vocab: [
        { ar: "وين؟",      tl: "Wein?",        fr: "Où ?",                note: "Wein, pas ayna en libanais" },
        { ar: "كيف بروح؟", tl: "Kīf brūḥ?",   fr: "Comment j'y vais ?",  note: "" },
        { ar: "قريب",      tl: "Arīb",         fr: "Proche / Près",       note: "" },
        { ar: "بعيد",      tl: "Baʿīd",        fr: "Loin",                note: "" },
        { ar: "دغري",      tl: "Dughri",       fr: "Tout droit",          note: "Mot d'origine turque !" },
        { ar: "عالشمال",   tl: "ʿa el-shamāl", fr: "À gauche",           note: "" },
        { ar: "عاليمين",   tl: "ʿa el-yamīn",  fr: "À droite",           note: "" },
        { ar: "سرفيس",     tl: "Service",      fr: "Taxi collectif",      note: "Transport typique au Liban" },
      ],
      sentences: [
        { ar: "وين المطار؟",                       tl: "Wein el-maṭār?",                     fr: "Où est l'aéroport ?",              structure: "Wein (où) + lieu" },
        { ar: "كيف بروح عالمطار؟",                 tl: "Kīf brūḥ ʿa el-maṭār?",             fr: "Comment je vais à l'aéroport ?",  structure: "Kīf (comment) + brūḥ (je vais) + ʿa (à) + lieu" },
        { ar: "روح دغري وبعدين دور عالشمال",       tl: "Rūḥ dughri w baʿdein dūr ʿa el-shamāl", fr: "Vas tout droit puis tourne à gauche", structure: "Impératif + dughri + w (et) + baʿdein (puis)" },
        { ar: "قديش تعرفني عالمحطة؟",              tl: "Addeish taʿrufnī ʿa el-maḥaṭṭa?",  fr: "Combien pour la gare ?",          structure: "Addeish (combien) + verbe + ʿa (à) + lieu" },
      ],
    },
  ],
  advanced: [
    {
      id: "idioms", icon: "🎭", titleFr: "Expressions idiomatiques",
      vocab: [
        { ar: "يعطيك العافية",  tl: "Yʿaṭīk el-ʿāfye",  fr: "Bravo / Bon courage",         note: "Pour remercier quelqu'un qui travaille" },
        { ar: "على راسي",       tl: "ʿAla rāsī",         fr: "Avec plaisir / Bien sûr",     note: "Marque de respect absolu" },
        { ar: "قلبك أبيض",     tl: "Albak abyaḍ",       fr: "Tu as un cœur d'or",          note: "Grand compliment de générosité" },
        { ar: "طول بالك",       tl: "Ṭawwel bālak",      fr: "Sois patient",                note: "Litt. 'allonge ton esprit'" },
        { ar: "الله يرحمو",     tl: "Allah yirḥamo",     fr: "Qu'il repose en paix",        note: "En parlant d'un défunt" },
        { ar: "إنشالله",        tl: "Inshallāh",         fr: "Si Dieu le veut",             note: "Peut signifier oui, peut-être ou non selon le ton !" },
        { ar: "الحمد لله",      tl: "El-ḥamdu lillāh",  fr: "Dieu merci / Tout va bien",   note: "Réponse courante à 'comment tu vas'" },
        { ar: "يخزي العين",    tl: "Ykhzī el-ʿein",    fr: "Contre le mauvais œil",       note: "Dit après un compliment" },
      ],
      sentences: [
        { ar: "يعطيك العافية على كل هالشغل",    tl: "Yʿaṭīk el-ʿāfye ʿala kell hal-shughl", fr: "Bravo pour tout ce travail",          structure: "Formule de bénédiction + ʿala (sur) + objet" },
        { ar: "إنشالله بكرا يكون أحسن",         tl: "Inshallāh bukra ykūn aḥsan",            fr: "Espérons que demain ce sera mieux",   structure: "Inshallāh + bukra + ykūn (sera) + aḥsan (mieux)" },
        { ar: "الحمد لله، ما في شي ناقصنا",     tl: "El-ḥamdu lillāh, mā fī shī nāʾisna",   fr: "Dieu merci, on ne manque de rien",    structure: "Formule de gratitude + mā fī (il n'y a pas) + nāʾisna" },
        { ar: "طول بالك، هالأمور بتمشي",         tl: "Ṭawwel bālak, hal-umūr btimshī",        fr: "Sois patient, les choses avancent",   structure: "Impératif + hal-umūr (ces affaires) + btimshī (marchent)" },
      ],
    },
    {
      id: "storytelling", icon: "🗣️", titleFr: "Raconter & Débattre",
      vocab: [
        { ar: "يعني",      tl: "Yaʿni",       fr: "C'est-à-dire / Genre",       note: "Mot de remplissage universel libanais" },
        { ar: "هيك وهيك",  tl: "Hēk w hēk",   fr: "Comme ci comme ça",          note: "" },
        { ar: "بالظبط",    tl: "Bil-ẓabaṭ",   fr: "Exactement / Précisément",   note: "" },
        { ar: "مش هيك؟",   tl: "Mish hēk?",   fr: "N'est-ce pas ? Tu vois ?",   note: "Tag question très fréquente" },
        { ar: "بالعكس",    tl: "Bil-ʿaks",    fr: "Au contraire",               note: "" },
        { ar: "عالأقل",    tl: "ʿAl-aʾall",   fr: "Au moins",                   note: "" },
        { ar: "كأنو",      tl: "Kaʾanno",     fr: "Comme si / On dirait que",   note: "" },
        { ar: "خليني أفهم",tl: "Khallinī afham",fr: "Laisse-moi comprendre",   note: "" },
      ],
      sentences: [
        { ar: "يعني، بدك تقول إنو ما حدا حكى معك؟", tl: "Yaʿni, baddak tʾūl inno mā ḥada ḥaka maʿak?", fr: "Genre, tu veux dire que personne ne t'a parlé ?", structure: "Yaʿni + baddak tʾūl (tu veux dire) + inno (que)" },
        { ar: "بالظبط هيدا اللي عم قلو",             tl: "Bil-ẓabaṭ hayda lli ʿam ʾello",               fr: "C'est exactement ce que je dis",                 structure: "Bil-ẓabaṭ + hayda (ça) + lli (que) + ʿam ʾello (je dis)" },
        { ar: "بالعكس، هيدا بيساعدنا أكتر",          tl: "Bil-ʿaks, hayda bisāʿidna aktar",              fr: "Au contraire, ça nous aide encore plus",          structure: "Bil-ʿaks + hayda + bisāʿidna (aide) + aktar (plus)" },
        { ar: "خليني أفهم شو اللي صار بالظبط",       tl: "Khallinī afham shu lli ṣār bil-ẓabaṭ",        fr: "Laisse-moi comprendre ce qui s'est passé",       structure: "Khallinī (laisse-moi) + verbe + shu lli ṣār (ce qui s'est passé)" },
      ],
    },
    {
      id: "culture", icon: "🏛️", titleFr: "Culture & Société",
      vocab: [
        { ar: "ضيافة",        tl: "Ḍiyāfe",      fr: "Hospitalité",               note: "Valeur cardinale libanaise" },
        { ar: "تفضل",         tl: "Tfaḍḍal",     fr: "Je vous en prie / Entrez",  note: "Invitation universelle" },
        { ar: "على صحتك",     tl: "ʿAla ṣaḥtak", fr: "À ta santé !",              note: "Toast libanais" },
        { ar: "صحتين",        tl: "Ṣaḥtein",     fr: "Bon appétit ! (deux santés)", note: "Réponse : ʿala albak" },
        { ar: "أهلاً وسهلاً", tl: "Ahlan w sahlan",fr: "Bienvenue !",             note: "Litt. 'comme avec la famille et en terrain facile'" },
        { ar: "عيب",          tl: "ʿEib",         fr: "C'est honteux / Mal",      note: "Notion sociale forte" },
        { ar: "مزبوط",        tl: "Mazbuṭ",       fr: "C'est juste / Correct",    note: "" },
        { ar: "كاسك",         tl: "Kāsak",        fr: "À ta santé (toast) !",     note: "En levant le verre" },
      ],
      sentences: [
        { ar: "أهلاً وسهلاً، البيت بيتك",              tl: "Ahlan w sahlan, el-beit betak",                fr: "Bienvenue, cette maison est la tienne",       structure: "Formule d'accueil + el-beit betak (la maison est tienne)" },
        { ar: "تفضل، اتفضل معنا",                      tl: "Tfaḍḍal, itfaḍḍal maʿna",                     fr: "Je t'en prie, viens avec nous",               structure: "Tfaḍḍal (invitation) + maʿna (avec nous)" },
        { ar: "الأكل اللبناني من أحسن أكل بالعالم",   tl: "El-akl el-Libnānī min aḥsan akl bil-ʿālam",   fr: "La cuisine libanaise est parmi les meilleures", structure: "Sujet + min aḥsan (parmi les meilleurs) + bil-ʿālam (au monde)" },
        { ar: "الضيافة عنا مش بس تقليد، هي قيمة",    tl: "El-ḍiyāfe ʿinna mish bas taʾlīd, hiye ʾīme", fr: "L'hospitalité chez nous c'est une valeur",    structure: "Sujet + mish bas (pas seulement) + taʾlīd + hiye (c'est) + valeur" },
      ],
    },
  ],
};

// ── AudioBtn ──────────────────────────────────────────────────────────────────
function AudioBtn({ text, size }) {
  size = size || 18;
  const [state, setState] = useState("idle");

  function handlePlay(e, slow) {
    e.stopPropagation();
    setState(slow ? "slow" : "playing");
    speak(text, slow);
    setTimeout(function() { setState("idle"); }, slow ? 3500 : 2000);
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={function(e) { e.stopPropagation(); }}>
      <button
        onClick={function(e) { handlePlay(e, false); }}
        title="Écouter"
        style={{
          background: state === "playing" ? T.blue : "transparent",
          border: "1.5px solid " + (state === "playing" ? T.blue : T.border),
          borderRadius: "50%",
          width: size + 16,
          height: size + 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
          flexShrink: 0,
          color: state === "playing" ? "white" : T.muted,
        }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
        </svg>
      </button>
      <button
        onClick={function(e) { handlePlay(e, true); }}
        title="Écouter lentement"
        style={{
          background: state === "slow" ? T.gold : "transparent",
          border: "1.5px solid " + (state === "slow" ? T.gold : T.border),
          borderRadius: 20,
          padding: "0 10px",
          height: size + 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          transition: "all 0.2s",
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 700,
          color: state === "slow" ? "white" : T.muted,
        }}
      >
        🐢 lent
      </button>
    </div>
  );
}

// ── VocabCard ─────────────────────────────────────────────────────────────────
function VocabCard({ item }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      onClick={function() { setFlipped(function(f) { return !f; }); }}
      style={{
        cursor: "pointer",
        borderRadius: 14,
        border: "1.5px solid " + (flipped ? T.blue : T.border),
        background: flipped ? T.ink : T.card,
        minHeight: 130,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "18px 16px",
        gap: 8,
        transition: "all 0.2s",
        userSelect: "none",
      }}
    >
      {!flipped ? (
        <>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.ink }}>{item.fr}</div>
          {item.note && <div style={{ fontSize: 12, color: T.muted }}>{item.note}</div>}
          <div style={{ fontSize: 11, color: T.blue, marginTop: 4 }}>Taper pour voir en arabe</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 34, fontWeight: 700, color: "white", direction: "rtl", fontFamily: "serif", textAlign: "center" }}>{item.ar}</div>
          <div style={{ fontSize: 15, color: T.gold, textAlign: "center", fontStyle: "italic" }}>{item.tl}</div>
          {item.note && <div style={{ fontSize: 11, color: "#8ab4ac", textAlign: "center" }}>💡 {item.note}</div>}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
            <AudioBtn text={item.ar} />
          </div>
        </>
      )}
    </div>
  );
}

// ── SentenceCard ──────────────────────────────────────────────────────────────
function SentenceCard({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: 14,
      border: "1.5px solid " + T.border,
      background: T.card,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, direction: "rtl", fontFamily: "serif", flex: 1, textAlign: "right" }}>
          {item.ar}
        </div>
        <AudioBtn text={item.ar} />
      </div>
      <div style={{ fontSize: 14, fontStyle: "italic", color: T.blue }}>{item.tl}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{item.fr}</div>
      <button
        onClick={function() { setOpen(function(o) { return !o; }); }}
        style={{
          background: open ? T.blueSoft : "transparent",
          border: "1px solid " + (open ? T.blue : T.border),
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 12,
          cursor: "pointer",
          color: T.blue,
          alignSelf: "flex-start",
          fontWeight: 600,
        }}
      >
        {open ? "▾ Structure" : "▸ Voir la structure"}
      </button>
      {open && (
        <div style={{ background: T.blueSoft, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.blue }}>
          🔍 {item.structure}
        </div>
      )}
    </div>
  );
}

// ── ModuleView ────────────────────────────────────────────────────────────────
function ModuleView({ module, onBack }) {
  const [tab, setTab] = useState("vocab");
  const tabs = [
    { id: "vocab",    label: "Vocabulaire (" + module.vocab.length + ")" },
    { id: "phrases",  label: "Phrases (" + module.sentences.length + ")" },
    { id: "quiz",     label: "Quiz rapide" },
  ];

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.blue, cursor: "pointer", fontSize: 14, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}>
        ← Retour
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 32 }}>{module.icon}</span>
        <h2 style={{ margin: 0, fontSize: 20, color: T.ink, fontWeight: 800 }}>{module.titleFr}</h2>
      </div>
      <div style={{ display: "flex", gap: 4, background: "#EEEBE4", borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {tabs.map(function(t) {
          return (
            <button
              key={t.id}
              onClick={function() { setTab(t.id); }}
              style={{
                flex: 1,
                background: tab === t.id ? T.card : "transparent",
                border: "none",
                borderRadius: 8,
                padding: "9px 8px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: tab === t.id ? T.ink : T.muted,
                boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === "vocab" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {module.vocab.map(function(v, i) { return <VocabCard key={i} item={v} />; })}
        </div>
      )}
      {tab === "phrases" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {module.sentences.map(function(s, i) { return <SentenceCard key={i} item={s} />; })}
        </div>
      )}
      {tab === "quiz" && (
        <QuizEngine modules={[module]} onBack={function() { setTab("vocab"); }} />
      )}
    </div>
  );
}

// ── QuizEngine ────────────────────────────────────────────────────────────────
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function QuizEngine({ modules, onBack }) {
  var allVocab = [];
  modules.forEach(function(m) { m.vocab.forEach(function(v) { allVocab.push(v); }); });

  var [questions] = useState(function() {
    var pool = shuffle(allVocab).slice(0, 8);
    return pool.map(function(q) {
      var wrong = shuffle(allVocab.filter(function(x) { return x.tl !== q.tl; })).slice(0, 3);
      return { q: q, options: shuffle(wrong.concat([q])) };
    });
  });

  var [idx, setIdx] = useState(0);
  var [chosen, setChosen] = useState(null);
  var [score, setScore] = useState(0);
  var [done, setDone] = useState(false);

  var cur = questions[idx];

  function pick(opt) {
    if (chosen) return;
    setChosen(opt.tl);
    if (opt.tl === cur.q.tl) setScore(function(s) { return s + 1; });
  }

  function next() {
    if (idx + 1 >= questions.length) { setDone(true); }
    else { setIdx(function(i) { return i + 1; }); setChosen(null); }
  }

  if (done) {
    var pct = Math.round(score / questions.length * 100);
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>{pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📚"}</div>
        <div style={{ fontSize: 42, fontWeight: 800, color: T.ink }}>{score}<span style={{ fontSize: 22, color: T.muted }}>/{questions.length}</span></div>
        <div style={{ fontSize: 16, color: T.muted, margin: "12px 0 32px" }}>
          {pct >= 80 ? "Excellent niveau !" : pct >= 50 ? "Continue comme ça !" : "Revois les leçons et réessaie !"}
        </div>
        <button onClick={onBack} style={{ background: T.ink, color: "white", border: "none", borderRadius: 10, padding: "14px 32px", fontSize: 15, cursor: "pointer", fontWeight: 700 }}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.blue, cursor: "pointer", fontSize: 14, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>
        ← Retour
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
        <div style={{ height: 6, background: T.border, borderRadius: 4, flex: 1, marginRight: 12, overflow: "hidden" }}>
          <div style={{ width: ((idx / questions.length) * 100) + "%", height: "100%", background: T.blue, borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>{idx + 1} / {questions.length}</span>
        <span style={{ fontSize: 13, color: T.gold, fontWeight: 700, marginLeft: 12 }}>★ {score}</span>
      </div>
      <div style={{ background: T.ink, borderRadius: 18, padding: "32px 24px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Traduire en arabe libanais</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "white" }}>{cur.q.fr}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {cur.options.map(function(opt, i) {
          var bg = T.card, border = T.border;
          if (chosen) {
            if (opt.tl === cur.q.tl) { bg = "#e8f5e9"; border = T.green; }
            else if (opt.tl === chosen) { bg = "#ffebee"; border = T.red; }
          }
          return (
            <button key={i} onClick={function() { pick(opt); }} style={{ background: bg, border: "2px solid " + border, borderRadius: 12, padding: "14px 10px", cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, direction: "rtl", fontFamily: "serif" }}>{opt.ar}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4, fontStyle: "italic" }}>{opt.tl}</div>
            </button>
          );
        })}
      </div>
      {chosen && (
        <button onClick={next} style={{ marginTop: 16, width: "100%", background: T.ink, color: "white", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, cursor: "pointer", fontWeight: 700 }}>
          {idx + 1 >= questions.length ? "Voir les résultats" : "Question suivante →"}
        </button>
      )}
    </div>
  );
}

// ── AIChat ────────────────────────────────────────────────────────────────────
function AIChat({ onBack }) {
  var [msgs, setMsgs] = useState([]);
  var [apiMsgs, setApiMsgs] = useState([]);
  var [input, setInput] = useState("");
  var [loading, setLoading] = useState(false);
  var endRef = useRef(null);

  var starters = [
    "Comment conjuguer les verbes au présent en libanais ?",
    "Quelle est la différence entre baddī et urīd ?",
    "Apprenez-moi à faire une phrase négative",
    "Donne-moi 5 mots libanais qu'on utilise tout le temps",
    "Comment exprimer la politesse au Liban ?",
  ];

  useEffect(function() {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  function send(text) {
    if (!text.trim() || loading) return;
    var um = { role: "user", content: text };
    var newApi = apiMsgs.concat([um]);
    setMsgs(function(m) { return m.concat([{ role: "user", text: text }]); });
    setApiMsgs(newApi);
    setInput("");
    setLoading(true);
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "Tu es un professeur expert en arabe libanais (dialecte ʿAmmiyye). Tu enseignes à des francophones.\nRègles :\n- Toujours enseigner le DIALECTE LIBANAIS, jamais l'arabe standard (MSA)\n- Pour chaque mot/phrase : donne le script arabe, la translittération phonétique, et la traduction française\n- Explique les nuances grammaticales simplement (négation mā/mish, présent avec ʿam, futur avec raḥ)\n- Sois chaleureux, encourageant, précis\n- Réponds TOUJOURS en français",
        messages: newApi,
      }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var reply = "";
      if (data.content) {
        data.content.forEach(function(b) { if (b.type === "text") reply += b.text; });
      }
      if (!reply) reply = "Erreur de réponse.";
      setMsgs(function(m) { return m.concat([{ role: "assistant", text: reply }]); });
      setApiMsgs(function(m) { return m.concat([{ role: "assistant", content: reply }]); });
    })
    .catch(function() {
      setMsgs(function(m) { return m.concat([{ role: "assistant", text: "Erreur de connexion. Réessaye." }]); });
    })
    .finally(function() { setLoading(false); });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "72vh" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.blue, cursor: "pointer", fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        ← Retour
      </button>
      <div style={{ flexShrink: 0, marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {starters.map(function(s, i) {
          return (
            <button key={i} onClick={function() { send(s); }} style={{ background: T.goldSoft, border: "1px solid " + T.gold, borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", color: T.gold, fontWeight: 600 }}>
              {s}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: "#F0EDE8", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", color: T.muted }}>
            <div style={{ fontSize: 48, marginBottom: 8, direction: "rtl", fontFamily: "serif" }}>مرحبا</div>
            <p style={{ fontSize: 14 }}>Pose-moi n'importe quelle question sur le dialecte libanais</p>
          </div>
        )}
        {msgs.map(function(m, i) {
          return (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
              <div style={{
                background: m.role === "user" ? T.ink : T.card,
                color: m.role === "user" ? "white" : T.ink,
                borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "12px 16px", fontSize: 14, lineHeight: 1.65,
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)", whiteSpace: "pre-wrap",
              }}>{m.text}</div>
            </div>
          );
        })}
        {loading && (
          <div style={{ alignSelf: "flex-start", background: T.card, borderRadius: "18px 18px 18px 4px", padding: "14px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", color: T.muted, fontSize: 22, letterSpacing: 4 }}>•••</div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexShrink: 0 }}>
        <input
          value={input}
          onChange={function(e) { setInput(e.target.value); }}
          onKeyDown={function(e) { if (e.key === "Enter") send(input); }}
          placeholder="Pose ta question en français…"
          style={{ flex: 1, padding: "13px 18px", borderRadius: 24, border: "2px solid " + T.border, fontSize: 14, outline: "none", background: T.card }}
        />
        <button
          onClick={function() { send(input); }}
          disabled={loading || !input.trim()}
          style={{ background: T.ink, color: "white", border: "none", borderRadius: 24, padding: "13px 22px", cursor: "pointer", fontSize: 16, opacity: (loading || !input.trim()) ? 0.4 : 1 }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
var levelColors = { beginner: T.green, intermediate: T.blue, advanced: T.gold };

export default function App() {
  var [level, setLevel] = useState("beginner");
  var [view, setView] = useState("home");
  var [activeModule, setActiveModule] = useState(null);
  var [audioReady, setAudioReady] = useState(false);
  var [voiceName, setVoiceName] = useState("");

  function handleUnlock() {
    setAudioReady(true);
  }

  if (!audioReady) {
    return (
      <div
        onClick={handleUnlock}
        style={{ minHeight: "100vh", background: T.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif", textAlign: "center", cursor: "pointer" }}
      >
        <div style={{ fontSize: 72, marginBottom: 20, direction: "rtl", fontFamily: "serif", color: T.gold }}>عربي</div>
        <h1 style={{ color: "white", fontSize: 24, fontWeight: 800, margin: "0 0 10px" }}>Arabe Libanais</h1>
        <p style={{ color: "#888", fontSize: 14, margin: "0 0 12px", lineHeight: 1.7 }}>
          Voix : <strong style={{ color: T.gold }}>Rami — ar-LB (Azure)</strong>
        </p>
        <p style={{ color: "#666", fontSize: 13, margin: "0 0 36px", lineHeight: 1.7 }}>
          Appuie n'importe où pour démarrer
        </p>
        <div style={{ background: T.gold, color: T.ink, borderRadius: 16, padding: "18px 44px", fontSize: 18, fontWeight: 800 }}>
          Démarrer ▶
        </div>
      </div>
    );
  }

  var currentModules = MODULES[level] || [];
  var lc = levelColors[level];

  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: T.ink }}>

      {/* Header */}
      <div style={{ background: T.ink, padding: "0 20px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
            onClick={function() { setView("home"); }}
          >
            <div style={{ fontSize: 22, direction: "rtl", fontFamily: "serif", color: T.gold, fontWeight: 700, letterSpacing: 2 }}>عربي</div>
            <div>
              <div style={{ color: "white", fontSize: 15, fontWeight: 700 }}>Arabe Libanais</div>
              {voiceName ? <div style={{ color: "#666", fontSize: 10, marginTop: 1 }}>🔊 {voiceName}</div> : null}
            </div>
          </div>
          <button
            onClick={function() { setView("chat"); }}
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "7px 16px", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            💬 Tuteur IA
          </button>
        </div>
      </div>

      {/* Level tabs */}
      {view === "home" && (
        <div style={{ background: "white", borderBottom: "1px solid " + T.border, padding: "0 20px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex" }}>
            {LEVELS.map(function(l) {
              return (
                <button
                  key={l.id}
                  onClick={function() { setLevel(l.id); }}
                  style={{
                    background: "none", border: "none",
                    borderBottom: level === l.id ? "3px solid " + levelColors[l.id] : "3px solid transparent",
                    padding: "14px 20px", cursor: "pointer", fontSize: 14,
                    fontWeight: level === l.id ? 700 : 500,
                    color: level === l.id ? levelColors[l.id] : T.muted,
                    transition: "all 0.15s",
                  }}
                >
                  {l.fr}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>

        {view === "home" && (
          <>
            {/* Hero */}
            <div style={{ background: "linear-gradient(135deg, #0F0F0F 0%, #2a2a2a 100%)", borderRadius: 20, padding: "28px 24px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", fontSize: 80, opacity: 0.07, direction: "rtl", fontFamily: "serif", lineHeight: 1 }}>
                {level === "beginner" ? "أهلاً" : level === "intermediate" ? "كيفك" : "يعني"}
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ display: "inline-block", background: lc, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                  {LEVELS.find(function(l) { return l.id === level; }).fr}
                </div>
                <h2 style={{ color: "white", margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>
                  {level === "beginner" ? "Les bases du dialecte libanais" : level === "intermediate" ? "Conversations du quotidien" : "Expressions & nuances avancées"}
                </h2>
                <p style={{ color: "#999", margin: 0, fontSize: 13 }}>
                  {LEVELS.find(function(l) { return l.id === level; }).desc}
                </p>
              </div>
            </div>

            {/* Module list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {currentModules.map(function(mod) {
                return (
                  <button
                    key={mod.id}
                    onClick={function() { setActiveModule(mod); setView("module"); }}
                    style={{ background: T.card, border: "1.5px solid " + T.border, borderRadius: 14, padding: "18px 20px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 16, transition: "all 0.2s" }}
                    onMouseEnter={function(e) { e.currentTarget.style.borderColor = lc; e.currentTarget.style.transform = "translateX(4px)"; }}
                    onMouseLeave={function(e) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "none"; }}
                  >
                    <span style={{ fontSize: 30, flexShrink: 0 }}>{mod.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: T.ink }}>{mod.titleFr}</div>
                      <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{mod.vocab.length} mots · {mod.sentences.length} phrases</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ background: T.blueSoft, color: T.blue, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>Vocab</span>
                      <span style={{ background: T.goldSoft, color: T.gold, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>Phrases</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quiz CTA */}
            <button
              onClick={function() { setView("quiz"); }}
              style={{ width: "100%", background: T.ink, color: "white", border: "none", borderRadius: 14, padding: "16px", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              <span style={{ fontSize: 20 }}>🎯</span> Quiz — niveau {LEVELS.find(function(l) { return l.id === level; }).fr}
            </button>

            {/* Note */}
            <div style={{ marginTop: 20, background: T.card, border: "1px solid " + T.border, borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>💡 Pourquoi le dialecte libanais</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: T.ink }}>
                L'arabe libanais (<em>ʿAmmiyye</em>) est le vrai arabe parlé à Beyrouth, Jbeil et dans les familles libanaises. Il diffère de l'arabe standard par son vocabulaire (<em>baddī</em> au lieu de <em>urīd</em>), sa syntaxe, et ses nombreux emprunts au français et à l'anglais.
              </p>
            </div>
          </>
        )}

        {view === "module" && activeModule && (
          <ModuleView module={activeModule} onBack={function() { setView("home"); }} />
        )}
        {view === "quiz" && (
          <QuizEngine modules={currentModules} onBack={function() { setView("home"); }} />
        )}
        {view === "chat" && (
          <AIChat onBack={function() { setView("home"); }} />
        )}
      </div>
    </div>
  );
}
