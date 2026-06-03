import Stripe from "stripe";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { verifySession } from "./auth-crypto";
import { getCloudflareEnv } from "./cloudflare-env";
import { getTenantDashboard } from "../db/queries";

const SESSION_COOKIE_NAME = "propease_session";
let stripeInstance: Stripe | null = null;

async function requireAuth() {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) throw new Error("Not authenticated");
  const session = await verifySession(token);
  if (!session) throw new Error("Invalid or expired session");
  return session;
}

export async function getStripe(): Promise<Stripe> {
  if (stripeInstance) return stripeInstance;

  let stripeSecretKey = "";

  if (import.meta.env?.DEV) {
    try {
      const { getPlatformProxy } = await import("wrangler");
      const { env } = await getPlatformProxy();
      stripeSecretKey = env.STRIPE_SECRET_KEY as string;
    } catch {
      // Fallback
    }
  }

  if (!stripeSecretKey) {
    const env = getCloudflareEnv();
    stripeSecretKey = env.STRIPE_SECRET_KEY;
  }

  if (!stripeSecretKey) {
    const globalEnv = (typeof process !== "undefined" ? process.env : (globalThis as any)) || {};
    stripeSecretKey = globalEnv.STRIPE_SECRET_KEY;
  }

  if (!stripeSecretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Please define it in your .dev.vars file for local development or Cloudflare environment variables for production.",
    );
  }

  // API version casting avoids strict type mismatches between different Stripe SDK versions
  stripeInstance = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20" as any,
  });

  return stripeInstance;
}

export const createStripeCheckoutSessionFn = createServerFn({ method: "POST" }).handler(
  async (ctx) => {
    const session = await requireAuth();
    if (session.role !== "tenant") {
      throw new Error("Only tenants can initiate rent payment checkout.");
    }

    const dashboard = await getTenantDashboard(session.id);
    if (!dashboard.hasLease || dashboard.balance <= 0) {
      throw new Error("No pending balance to pay.");
    }

    const stripe = await getStripe();

    // Determine redirect host and protocol
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const host = getRequestHeader("host") || "localhost:8080";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const successUrl = `${protocol}://${host}/tenant/pay?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${protocol}://${host}/tenant/pay`;

    const amountInCents = Math.round(dashboard.balance * 100);

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `PropEase Rent Payment`,
              description: `Apt ${dashboard.unitLabel}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: session.id,
      metadata: {
        tenantId: session.id,
        amountInCents: String(amountInCents),
        unitLabel: dashboard.unitLabel,
      },
    });

    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a checkout session URL.");
    }

    return { checkoutUrl: checkoutSession.url };
  },
);

export const verifyStripePaymentFn = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string }) => d)
  .handler(async (ctx) => {
    const { sessionId } = ctx.data;
    const session = await requireAuth();
    if (session.role !== "tenant") {
      throw new Error("Unauthorized.");
    }

    const stripe = await getStripe();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.payment_status !== "paid") {
      throw new Error("Payment was not completed successfully.");
    }

    const tenantId = checkoutSession.metadata?.tenantId || checkoutSession.client_reference_id;
    if (!tenantId || tenantId !== session.id) {
      throw new Error("Invalid checkout session metadata.");
    }

    const { payTenantPaymentWithStripe } = await import("../db/queries");
    const updatedPayments = await payTenantPaymentWithStripe(session.id, sessionId);

    return { success: true, updatedPayments };
  });
