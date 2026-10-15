import type { Metadata } from "next";
import Link from "next/link";
import { H2, LegalPage } from "../components/LegalPage";

export const metadata: Metadata = { title: "Personvern – Scavenger" };

export default function PersonvernPage() {
  return (
    <LegalPage title="Personvernerklæring" updated="15. oktober 2026">
      <p>
        Scavenger er en søketjeneste som samler produkter fra flere nettbutikker på ett sted. Her forklarer vi hvilke
        opplysninger vi behandler, hvorfor, og hvilke rettigheter du har.
      </p>

      <H2>Når du søker</H2>
      <p>
        Du trenger ikke konto for å søke. Vi lagrer ikke søkene dine. Søketeksten kan sendes til vår AI-leverandør
        (Anthropic) for å forstå hva du leter etter. Den brukes bare til å svare på søket. For å vise priser i din valuta bruker vi hvilket
        land forespørselen kommer fra (gjettet ut fra IP-adressen av vår hostingleverandør). Landet brukes bare der og
        da og lagres ikke.
      </p>
      <p>
        Når du klikker på et produkt, sendes du til butikkens egen nettside. Lenken inneholder en merking som viser at
        du kom fra Scavenger. Vi teller klikket (hvilken butikk og hvilket produkt, og tidspunktet) så butikken kan se
        statistikk, men vi lagrer ikke hvem som klikket. Kjøpet skjer hos butikken, og deres personvernerklæring gjelder der.
      </p>

      <H2>Når du lager en konto</H2>
      <p>
        Logger du inn for å lagre annonser, lagrer vi e-postadressen din og hvilke annonser du har lagret. For å logge
        inn sender vi en engangskode til e-posten din. Grunnlaget er avtalen med deg om å levere tjenesten. Velger du et
        brukernavn, kan andre brukere se det og sende annonser til deg med det. Sender du en annonse til noen, lagrer vi
        mottakerens e-postadresse og hilsenen din, og mottakeren ser brukernavnet ditt (ikke e-postadressen din). Du kan slette kontoen din når som helst på Min side, og da slettes alt vi har lagret om deg.
      </p>

      <H2>Når du kontakter oss</H2>
      <p>
        Bruker du <Link href="/kontakt" style={{ color: "var(--primary)" }}>kontaktskjemaet</Link>, lagrer vi navn,
        e-postadresse og meldingen din, slik at vi kan lese og svare på den. Grunnlaget er vår berettigede interesse i å
        svare på henvendelser. Meldinger slettes når de ikke lenger trengs, og senest etter 12 måneder.
      </p>

      <H2>Butikker som kobler seg til</H2>
      <p>
        Scavenger-appen for Shopify ber bare om lesetilgang til butikkens produkter. Vi henter ikke kunder, ordrer eller
        andre personopplysninger fra butikken.
      </p>
      <p>
        For butikker lagrer vi butikkdomene, tilgangsnøkkel til Shopify (for å hente produkter), visningsnavn,
        kontakt-e-post, abonnementsstatus, produkter butikken har skjult, annonser butikken laster opp og
        klikkstatistikk. Grunnlaget er avtalen med butikken.
      </p>
      <p>
        Avinstallerer butikken appen eller kobler seg fra, slutter vi å hente produktene med en gang. Senest 48 timer
        etter avinstallering sletter vi alt vi har lagret om butikken, når Shopify ber oss om det.
      </p>

      <H2>Cookies og lagring i nettleseren</H2>
      <p>
        Vi bruker nødvendige cookies for å holde deg innlogget, både som bruker og som butikk. I tillegg husker nettleseren din om du har valgt
        mørk eller lys modus. Vi bruker ikke cookies til reklame eller sporing.
      </p>

      <H2>Hvem vi deler med</H2>
      <p>Vi selger aldri opplysninger. Vi bruker disse leverandørene for å drive tjenesten:</p>
      <ul>
        <li>Vercel – hosting av nettsiden</li>
        <li>Supabase – database og lagring av annonser</li>
        <li>Resend – sending av e-post</li>
        <li>Stripe – betaling av abonnement for butikker</li>
        <li>Shopify – henting av produkter fra butikkene</li>
        <li>Anthropic – tolking av søketekst (AI-søk)</li>
      </ul>
      <p>
        Noen av disse kan behandle data utenfor EU/EØS. Det skjer i så fall med EUs standard personvernbestemmelser
        eller tilsvarende grunnlag.
      </p>

      <H2>Dine rettigheter</H2>
      <p>
        Du kan be om innsyn i, retting av eller sletting av opplysningene vi har om deg, og protestere mot behandlingen.
        Ta kontakt via kontaktskjemaet, så svarer vi innen 30 dager. Du kan også klage til Datatilsynet
        (datatilsynet.no).
      </p>
    </LegalPage>
  );
}
