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

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const isDev = process.env.NODE_ENV !== "production";

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
    // Production integration placeholder (e.g. Resend, SMTP)
    console.log(`[PROD] Dispatching email to: ${to} | Subject: "${subject}"`);
  }
}
