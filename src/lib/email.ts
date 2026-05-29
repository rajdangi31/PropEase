/**
 * PropEase Email Dispatcher Utility
 * Prints nicely formatted, bordered email mock-ups in the developer console,
 * and provides a hook for production mailing services (e.g. Resend, SendGrid).
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Retrieves the Resend configuration dynamically from Cloudflare bindings or fallbacks.
 */
async function getResendConfig(): Promise<{ apiKey?: string; from?: string }> {
  if (import.meta.env?.DEV) {
    try {
      const { getPlatformProxy } = await import("wrangler");
      const { env } = await getPlatformProxy();
      return {
        apiKey: env.RESEND_API_KEY as string | undefined,
        from: env.RESEND_FROM as string | undefined,
      };
    } catch {
      // Fallback
    }
  }

  // Production env from request context
  let env: any = {};
  try {
    const { getCloudflareEnv } = await import("./cloudflare-env");
    env = getCloudflareEnv();
  } catch {
    // Ignore
  }

  const globalEnv = (typeof process !== "undefined" ? process.env : (globalThis as any)) || {};
  return {
    apiKey: env.RESEND_API_KEY || globalEnv.RESEND_API_KEY,
    from: env.RESEND_FROM || globalEnv.RESEND_FROM,
  };
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const isDev = import.meta.env?.DEV || (typeof process !== "undefined" && process.env?.NODE_ENV !== "production");

  if (isDev) {
    const lines = text.split("\n");
    const headerBorder = "╔" + "═".repeat(78);
    const divider = "╠" + "═".repeat(78);
    const footerBorder = "╚" + "═".repeat(78);

    console.log(`
${headerBorder}
║ 📧  [PROP-EASE MAIL DISPATCHER]
${divider}
║ To:      ${to}
║ Subject: ${subject}
║ Date:    ${new Date().toLocaleString()}
${divider}
║`);
    
    for (const line of lines) {
      console.log(`║  ${line}`);
    }

    console.log(`║
${footerBorder}
`);
  } else {
    // Production Resend API integration
    try {
      const config = await getResendConfig();
      if (!config.apiKey) {
        console.error(`[PROD ERROR] RESEND_API_KEY not configured. Mocking dispatch to: ${to} | Subject: "${subject}"`);
        console.log(`[PROD MOCK TEXT] ${text}`);
        return;
      }

      const fromEmail = config.from || "onboarding@resend.dev";

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `PropEase <${fromEmail}>`,
          to: [to],
          subject: subject,
          html: html,
          text: text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[PROD ERROR] Resend dispatch failed for ${to}: ${response.status} ${errText}`);
      } else {
        console.log(`[PROD] Email successfully sent to ${to} via Resend.`);
      }
    } catch (err) {
      console.error(`[PROD ERROR] Failed to dispatch email to ${to} via Resend:`, err);
    }
  }
}

