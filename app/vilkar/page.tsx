import type { Metadata } from "next";
import Link from "next/link";
import { H2, LegalPage } from "../components/LegalPage";

export const metadata: Metadata = { title: "Vilkår – Scavenger" };

export default function VilkarPage() {
  return (
    <LegalPage title="Vilkår for bruk" updated="11. oktober 2026">
      <H2>For alle</H2>
      <p>
        Scavenger viser produkter fra tilkoblede nettbutikker. Vi selger ingenting selv. Når du kjøper noe, inngår du
        avtalen med butikken, og det er butikken som har ansvar for produktet, levering, retur og reklamasjon.
      </p>
      <p>
        Vi gjør vårt beste for at priser og informasjon er riktige, men de hentes fra butikkene og kan være utdaterte.
        Priser i andre valutaer er omregnet automatisk og kun veiledende. Prisen hos butikken gjelder.
      </p>

      <H2>For butikker</H2>
      <p>
        <strong>Gratis i starten:</strong> Det er gratis å være med frem til lansering og i 3 måneder etter at Scavenger
        er lansert.
      </p>
      <p>
        <strong>Etter gratisperioden</strong> velger butikken én av disse:
      </p>
      <ul>
        <li>4 % provisjon av salg som kommer via Scavenger, eller</li>
        <li>
          299 kr per måned i fast abonnement. Dette gjelder butikker med under 300 salg via Scavenger per måned. Over
          det gjelder provisjon.
        </li>
      </ul>
      <p>Salg regnes som «via Scavenger» når kunden kom fra en Scavenger-lenke.</p>
      <p>
        Butikken er ansvarlig for at produkter og annonser er lovlige og ikke krenker andres rettigheter. Vi kan skjule
        eller fjerne innhold som bryter med dette. Butikken holder innloggingsopplysningene sine hemmelige.
      </p>
      <p>
        Butikken kan når som helst koble seg fra under Administrasjon. Abonnement kan sies opp når som helst og løper ut
        inneværende periode.
      </p>

      <H2>Endringer</H2>
      <p>
        Vi kan endre vilkårene. Ved vesentlige endringer for butikker gir vi beskjed minst 30 dager i forveien.
      </p>

      <p style={{ marginTop: 24, opacity: 0.75 }}>
        Se også <Link href="/personvern" style={{ color: "var(--primary)" }}>personvernerklæringen</Link>.
      </p>
    </LegalPage>
  );
}
