const https = require('https');

/**
 * Sends an inspection report PDF via Brevo API using direct HTTPS request.
 * This is more reliable than the SDK on cloud platforms.
 */
const sendInspectionReportEmail = async (toEmail, userName, pdfBuffer, reportNumber) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[EMAIL] BREVO_API_KEY is missing!');
    throw new Error('Email API Key missing');
  }

  console.log(`[EMAIL] Sending to ${toEmail} using Brevo Key: ${apiKey.substring(0, 10)}...`);

  const postData = JSON.stringify({
    sender: { 
      name: "Vehicle Management System", 
      email: process.env.EMAIL_USER || "lankacv.stmp@gmail.com" 
    },
    to: [{ email: toEmail, name: userName }],
    subject: `Your Vehicle Inspection Report (#${reportNumber || 'N/A'}) is Ready!`,
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #e67e22;">Inspection Report Ready</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your vehicle inspection has been completed successfully.</p>
            <p>We have attached the detailed PDF report of the inspection for your records.</p>
            <p>Thank you for choosing our service!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">Best Regards,<br/><strong>Vehicle Management System Team</strong></p>
          </div>
        </body>
      </html>
    `,
    attachment: [
      {
        name: `Inspection_${reportNumber || 'Report'}.pdf`,
        content: pdfBuffer.toString('base64')
      }
    ]
  });

  const options = {
    hostname: 'api.brevo.com',
    port: 443,
    path: '/v3/smtp/email',
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[EMAIL] Brevo Success:', responseBody);
          resolve(JSON.parse(responseBody));
        } else {
          console.error('[EMAIL] Brevo HTTP Error:', res.statusCode, responseBody);
          reject(new Error(`Brevo Error ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('[EMAIL] Request Error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

module.exports = {
  sendInspectionReportEmail,
};
