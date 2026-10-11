import type { Metadata } from "next";
import Link from "next/link";
import { H2, LegalPage } from "../components/LegalPage";

export const metadata: Metadata = { title: "Personvern – Scavenger" };

export default function PersonvernPage() {
  return (
    <LegalPage title="Personvernerklæring" updated="11. oktober 2026">
      <p>
        Scavenger er en søketjeneste som samler produkter fra flere nettbutikker på ett sted. Her forklarer vi hvilke
        opplysninger vi behandler, hvorfor, og hvilke rettigheter du har.
      </p>

      <H2>Når du søker</H2>
      <p>
        Du trenger ikke konto for å søke. Vi lagrer ikke søkene dine. For å vise priser i din valuta bruker vi hvilket
        land forespørselen kommer fra (gjettet ut fra IP-adressen av vår hostingleverandør). Landet brukes bare der og
        da og lagres ikke.
      </p>
      <p>
        Når du klikker på et produkt, sendes du til butikkens egen nettside. Lenken inneholder en merking som viser at
        du kom fra Scavenger. Kjøpet skjer hos butikken, og deres personvernerklæring gjelder der.
      </p>

      <H2>Når du kontakter oss</H2>
      <p>
        Bruker du <Link href="/kontakt" style={{ color: "var(--primary)" }}>kontaktskjemaet</Link>, lagrer vi navn,
        e-postadresse og meldingen din, slik at vi kan lese og svare på den. Grunnlaget er vår berettigede interesse i å
        svare på henvendelser. Meldinger slettes når de ikke lenger trengs, og senest etter 12 måneder.
      </p>

      <H2>Butikker som kobler seg til</H2>
      <p>
        For butikker lagrer vi butikkdomene, tilgangsnøkkel til Shopify (for å hente produkter), visningsnavn,
        kontakt-e-post, abonnementsstatus, produkter butikken har skjult og annonser butikken laster opp. Grunnlaget er
        avtalen med butikken. Kobler butikken seg fra, slettes butikkens oppføring.
      </p>

      <H2>Cookies og lagring i nettleseren</H2>
      <p>
        Vi bruker én nødvendig cookie for å holde butikker innlogget. I tillegg husker nettleseren din om du har valgt
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
