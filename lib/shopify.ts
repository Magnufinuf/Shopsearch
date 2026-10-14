// Kall mot Shopify Admin GraphQL API (kun server).
// Nye offentlige Shopify-apper må bruke GraphQL i stedet for det gamle REST-API-et.

export const SHOPIFY_API_VERSION = "2026-07";

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
  extensions?: { cost?: { throttleStatus?: { currentlyAvailable: number; restoreRate: number } } };
};

const MAX_RETRIES = 3;

// Kaster en feil hvis Shopify svarer med feil. Ved «for mange kall» venter vi og prøver igjen.
export async function shopifyGraphQL<T>(
  shop: string,
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
    if (!res.ok) throw new ShopifyError(res.status, `Shopify ${shop} svarte ${res.status}`);

    const body = (await res.json()) as GraphQLResponse<T>;
    const throttled = body.errors?.some((e) => e.extensions?.code === "THROTTLED");
    if (throttled && attempt < MAX_RETRIES) {
      const restore = body.extensions?.cost?.throttleStatus?.restoreRate || 50;
      await new Promise((r) => setTimeout(r, Math.min(5000, (1000 * 200) / restore)));
      continue;
    }
    if (body.errors?.length) throw new ShopifyError(throttled ? 429 : 500, body.errors.map((e) => e.message).join("; "));
    if (!body.data) throw new ShopifyError(500, "Tomt svar fra Shopify");
    return body.data;
  }
}

export class ShopifyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
