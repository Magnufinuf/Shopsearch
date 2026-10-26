// Tekst til stilsidene (/stil/old-money osv.), så Google og AI-assistenter forstår hva sidene handler om.
// Én oppføring per stil i lib/styles.ts.

export type StylePage = {
  slug: string;
  heading: string;
  metaTitle: string;
  description: string;
  intro: string[];
  searches: string[];
};

export const STYLE_PAGES: StylePage[] = [
  {
    slug: "old-money",
    heading: "Old money-klær fra norske nettbutikker",
    metaTitle: "Old money-klær – finn stilen i mange nettbutikker | Scavenger",
    description:
      "Finn old money-klær som polo, kabelstrikk, chinos, loafers og blazere fra mange norske nettbutikker på ett sted. Søk med vanlige ord eller bilde.",
    intro: [
      "Old money, også kalt quiet luxury, handler om tidløse klær i gode materialer: piquépoloer, kabelstrikk, skjorter i oxford eller lin, chinos, blazere og loafers – gjerne i nøytrale farger som marine, beige, hvit og grønn.",
      "På Scavenger ser du old money-plagg fra flere nettbutikker samtidig, så du slipper å lete butikk for butikk. Skriv for eksempel «old money-outfit til date under 1500 kr», ta bilde av et plagg du liker, eller la AI-outfit sette sammen et helt antrekk for deg.",
    ],
    searches: ["Strikket genser i old money-stil", "Beige chinos herre", "Loafers under 1000 kr", "Old money-outfit til date"],
  },
  {
    slug: "soss",
    heading: "Soss og preppy klær fra norske nettbutikker",
    metaTitle: "Sosse klær og preppy stil – mange nettbutikker på ett sted | Scavenger",
    description:
      "Finn sosse og preppy klær: half-zip, polo, skjorter, cardigans og chinos fra mange norske nettbutikker. Søk med vanlige ord på Scavenger.",
    intro: [
      "Soss – eller preppy på engelsk – er den klassiske norske «vestkant-stilen»: half-zip og quarter-zip, piquépolo, oxfordskjorter, cardigans, chinos og pene sko. Ofte med små logoer og rolige farger.",
      "Scavenger samler sosse klær fra flere nettbutikker på ett sted. Skriv hva du ser etter, for eksempel «marineblå half-zip» eller «sosse genser under 800 kr», og få treff fra mange butikker samtidig.",
    ],
    searches: ["Half-zip genser", "Hvit oxfordskjorte", "Sosse genser under 800 kr", "Preppy outfit til skolen"],
  },
  {
    slug: "streetwear",
    heading: "Streetwear fra norske nettbutikker",
    metaTitle: "Streetwear – hoodies, cargo og sneakers fra mange nettbutikker | Scavenger",
    description:
      "Finn streetwear som oversized hoodies, t-skjorter med trykk, cargobukser og sneakers fra mange norske nettbutikker på ett sted.",
    intro: [
      "Streetwear er avslappede klær med attitude: oversized og boxy hoodies, t-skjorter med grafisk trykk, cargobukser, baggy jeans, caps og sneakers.",
      "På Scavenger kan du søke på tvers av mange nettbutikker samtidig. Skriv for eksempel «svart oversized hoodie under 600 kr» eller «streetwear til skolen», eller sveip gjennom produkter med Swipe og la Scavenger lære stilen din.",
    ],
    searches: ["Oversized hoodie", "Cargobukse", "T-skjorte med trykk", "Streetwear til skolen"],
  },
  {
    slug: "sporty",
    heading: "Sporty klær og treningstøy fra norske nettbutikker",
    metaTitle: "Sporty klær og treningstøy – mange nettbutikker på ett sted | Scavenger",
    description:
      "Finn treningstøy og sporty hverdagsklær som tights, shorts, treningsjakker og joggesko fra mange norske nettbutikker.",
    intro: [
      "Sporty stil er klær som fungerer både på trening og i hverdagen: tights, shorts, treningsjakker, t-skjorter i funksjonsmateriale, joggebukser og joggesko.",
      "Scavenger viser sporty klær fra flere nettbutikker samtidig. Skriv hva du trenger, for eksempel «treningstights dame» eller «joggesko under 1000 kr».",
    ],
    searches: ["Treningstights", "Joggebukse herre", "Treningsjakke", "Joggesko under 1000 kr"],
  },
  {
    slug: "friluft",
    heading: "Friluftsklær fra norske nettbutikker",
    metaTitle: "Friluftsklær – skalljakker, ull og tursko fra mange nettbutikker | Scavenger",
    description:
      "Finn friluftsklær som skalljakker, ullundertøy, fleece, turbukser og tursko fra mange norske nettbutikker på ett sted.",
    intro: [
      "Friluft er klær laget for norsk vær: skalljakker, dunjakker, fleece, ullundertøy, turbukser, luer og tursko – plagg som holder deg tørr og varm på tur.",
      "Med Scavenger søker du i mange nettbutikker samtidig. Skriv for eksempel «varm jakke til vinteren under 2000 kr» eller «ullgenser til tur».",
    ],
    searches: ["Skalljakke", "Ullundertøy", "Varm vinterjakke", "Tursko"],
  },
  {
    slug: "minimalistisk",
    heading: "Minimalistiske klær fra norske nettbutikker",
    metaTitle: "Minimalistiske klær – enkle basisplagg fra mange nettbutikker | Scavenger",
    description:
      "Finn minimalistiske klær og enkle basisplagg i nøytrale farger fra mange norske nettbutikker på ett sted.",
    intro: [
      "Minimalistisk stil handler om enkle, rene plagg uten store logoer: t-skjorter og gensere i svart, hvitt, grått og beige, rette bukser og plagg som er lette å kombinere.",
      "Scavenger samler basisplagg fra mange nettbutikker. Skriv for eksempel «hvit t-skjorte i tykk bomull» eller «minimalistisk hverdagsoutfit under 1000 kr».",
    ],
    searches: ["Hvit t-skjorte", "Svart genser uten logo", "Beige bukse", "Minimalistisk hverdagsoutfit"],
  },
  {
    slug: "vintage",
    heading: "Vintage og retro klær fra norske nettbutikker",
    metaTitle: "Vintage og retro klær – mange nettbutikker på ett sted | Scavenger",
    description:
      "Finn vintage, retro og brukte klær fra mange norske nettbutikker på ett sted. Søk med vanlige ord eller bilde på Scavenger.",
    intro: [
      "Vintage er klær med historie – brukte designerplagg, retro-jakker, gamle collegegensere og klassikere fra 70-, 80- og 90-tallet. Bra for både lommeboka og miljøet.",
      "På Scavenger ser du vintage og retro fra flere nettbutikker samtidig. Skriv for eksempel «retro collegegenser» eller «vintage skinnjakke», eller ta bilde av et plagg du vil finne noe lignende som.",
    ],
    searches: ["Vintage skinnjakke", "Retro collegegenser", "90-talls jeans", "Brukt designerveske"],
  },
];

export function getStylePage(slug: string): StylePage | undefined {
  return STYLE_PAGES.find((s) => s.slug === slug);
}
