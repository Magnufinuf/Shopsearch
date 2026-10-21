// Ber Shopify si fra til Scavenger når appen avinstalleres eller produktene endres
// (håndteres i /api/webhooks/shopify). Kun server.
import { unstable_cache } from "next/cache";
import { APP_URL } from "@/lib/app-url";
import { shopifyGraphQL } from "@/lib/shopify";

const REGISTER_WEBHOOK = `
  mutation RegisterWebhook($topic: WebhookSubscriptionTopic!, $uri: String!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: { uri: $uri }) {
      userErrors { message }
    }
  }
`;

const WEBHOOK_TOPICS = ["APP_UNINSTALLED", "PRODUCTS_CREATE", "PRODUCTS_UPDATE", "PRODUCTS_DELETE"];

// Finnes varselet allerede, svarer Shopify med en feilmelding som vi bare ignorerer.
export async function registerWebhooks(shop: string, accessToken: string) {
  await Promise.all(
    WEBHOOK_TOPICS.map((topic) =>
      shopifyGraphQL(shop, accessToken, REGISTER_WEBHOOK, { topic, uri: `${APP_URL}/api/webhooks/shopify` }).catch((err) =>
        console.error(`Kunne ikke registrere ${topic} for ${shop}:`, err)
      )
    )
  );
}

// Samme, men høyst én gang i måneden per butikk, så butikker som ble koblet til
// før varslene fantes får dem uten å logge inn på nytt.
const registerOncePerMonth = unstable_cache(
  async (shop: string, accessToken: string) => {
    await registerWebhooks(shop, accessToken);
    return true;
  },
  ["shopify-webhooks-v1"],
  { revalidate: 30 * 24 * 60 * 60 }
);

export async function ensureWebhooks(shop: string, accessToken: string) {
  await registerOncePerMonth(shop, accessToken).catch(() => {});
}
