import { Response } from 'express';
import { Resend } from 'resend';
import { AuthRequest } from '../middleware/authMiddleware';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = 'DMS – 22 On Sloane <noreply@22onsloane.co>';

export interface EmailRecipient {
  email: string;
  name?: string;
}

// POST /api/share/:id/email
export const emailShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  const { recipients, pin, folderName, accessUrl, expiresAt, message } = req.body as {
    recipients: EmailRecipient[];
    pin: string;
    folderName: string;
    accessUrl: string;
    expiresAt?: string | null;
    message?: string;
  };

  if (!recipients?.length || !pin || !accessUrl || !folderName) {
    res.status(400).json({ error: 'recipients, pin, folderName and accessUrl are required' });
    return;
  }

  const validEmails = recipients.filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
  if (!validEmails.length) {
    res.status(400).json({ error: 'No valid email addresses provided' });
    return;
  }

  const expiryLine = expiresAt
    ? `<p style="color:#6b7280;font-size:13px;margin:0">⏰ Expires: <strong>${new Date(expiresAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</strong></p>`
    : '';

  const customNote = message?.trim()
    ? `<div style="background:#fff7ed;border-left:4px solid #E85D04;padding:12px 16px;border-radius:4px;margin:20px 0">
         <p style="margin:0;color:#9a3412;font-size:14px">${message.trim()}</p>
       </div>`
    : '';

  const buildHtml = (recipientName: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(160deg,#E85D04 0%,#C44D02 100%);padding:32px 40px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px">
              📄 Document Access
            </h1>
            <p style="margin:8px 0 0;color:#fde8d4;font-size:14px">22 On Sloane – Document Management</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <p style="margin:0 0 16px;color:#374151;font-size:15px">
              Hi${recipientName ? ` <strong>${recipientName}</strong>` : ''},
            </p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px">
              You've been granted access to the folder <strong style="color:#E85D04">"${folderName}"</strong>.
              Use the PIN below or click the access link to view the documents.
            </p>

            ${customNote}

            <!-- PIN box -->
            <div style="background:#fff7ed;border:2px solid #E85D04;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
              <p style="margin:0 0 8px;color:#9a3412;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Your Access PIN</p>
              <p style="margin:0;font-size:48px;font-weight:900;letter-spacing:12px;color:#E85D04;font-family:monospace">${pin}</p>
            </div>

            ${expiryLine}

            <!-- CTA -->
            <div style="text-align:center;margin:28px 0">
              <a href="${accessUrl}"
                style="background:#E85D04;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;display:inline-block">
                Open Document Folder →
              </a>
            </div>

            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center">
              Or copy this link: <a href="${accessUrl}" style="color:#E85D04">${accessUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center">
            <p style="margin:0;color:#9ca3af;font-size:12px">
              © ${new Date().getFullYear()} 22 On Sloane · This email was sent by the DMS platform.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Build batch of emails — one per recipient
  const batch = validEmails.map((r) => ({
    from: FROM,
    to: [r.email],
    subject: `📄 Access to "${folderName}" – PIN: ${pin}`,
    html: buildHtml(r.name ?? ''),
  }));

  try {
    const { data, error } = await resend.batch.send(batch);

    if (error) {
      console.error('Resend batch error:', error);
      res.status(500).json({ error: 'Failed to send emails', detail: error });
      return;
    }

    res.json({
      sent: validEmails.length,
      ids: data,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Email send error:', msg);
    res.status(500).json({ error: msg });
  }
};
