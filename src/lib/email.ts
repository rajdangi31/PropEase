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
 * Retrieves the Brevo configuration dynamically from Cloudflare bindings or fallbacks.
 */
async function getBrevoConfig(): Promise<{
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
}> {
  if (import.meta.env?.DEV) {
    try {
      const { getPlatformProxy } = await import("wrangler");
      const { env } = await getPlatformProxy();
      return {
        apiKey: env.BREVO_API_KEY as string | undefined,
        fromEmail: env.BREVO_SENDER_EMAIL as string | undefined,
        fromName: env.BREVO_SENDER_NAME as string | undefined,
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
    apiKey: env.BREVO_API_KEY || globalEnv.BREVO_API_KEY,
    fromEmail: env.BREVO_SENDER_EMAIL || globalEnv.BREVO_SENDER_EMAIL,
    fromName: env.BREVO_SENDER_NAME || globalEnv.BREVO_SENDER_NAME,
  };
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
  const brevoConfig = await getBrevoConfig();
  const resendConfig = await getResendConfig();

  if (brevoConfig.apiKey) {
    try {
      const fromEmail = brevoConfig.fromEmail || "no-reply@propease.com";
      const fromName = brevoConfig.fromName || "PropEase";

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoConfig.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail,
          },
          to: [
            {
              email: to,
            },
          ],
          subject: subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(
          `[BREVO ERROR] Brevo dispatch failed for ${to}: ${response.status} ${errText}`,
        );
      } else {
        console.log(`[BREVO] Email successfully sent to ${to} via Brevo.`);
      }
    } catch (err) {
      console.error(`[BREVO ERROR] Failed to dispatch email to ${to} via Brevo:`, err);
    }
  } else if (resendConfig.apiKey) {
    try {
      const config = await getResendConfig();
      const fromEmail = config.from || "onboarding@resend.dev";

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendConfig.apiKey}`,
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
        console.error(
          `[RESEND ERROR] Resend dispatch failed for ${to}: ${response.status} ${errText}`,
        );
      } else {
        console.log(`[RESEND] Email successfully sent to ${to} via Resend.`);
      }
    } catch (err) {
      console.error(`[RESEND ERROR] Failed to dispatch email to ${to} via Resend:`, err);
    }
  } else {
    // Local dev mock printer
    const lines = text.split("\n");
    const headerBorder = "╔" + "═".repeat(78);
    const divider = "╠" + "═".repeat(78);
    const footerBorder = "╚" + "═".repeat(78);

    console.log(`
${headerBorder}
║ 📧  [PROP-EASE MAIL DISPATCHER (MOCK)]
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
  }
}
