const SibApiV3Sdk = require('sib-api-v3-sdk');

const sendInspectionReportEmail = async (toEmail, userName, pdfBuffer, reportNumber) => {
  // Check if API key is present
  if (!process.env.BREVO_API_KEY) {
    console.error('[EMAIL] BREVO_API_KEY is missing from environment variables!');
    throw new Error('Email service configuration error: API Key missing');
  }

  console.log('[EMAIL] Attempting to send via Brevo SDK to:', toEmail);

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  
  // Set the API Key directly on the client
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = `Your Vehicle Inspection Report (#${reportNumber || 'N/A'}) is Ready!`;
  sendSmtpEmail.htmlContent = `
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
  `;
  
  // Sender must be verified in your Brevo account
  sendSmtpEmail.sender = { 
    name: "Vehicle Management System", 
    email: process.env.EMAIL_USER || "lankacv.stmp@gmail.com" 
  };
  
  sendSmtpEmail.to = [{ email: toEmail, name: userName }];
  
  // Attachments
  sendSmtpEmail.attachment = [
    {
      name: `Inspection_${reportNumber || 'Report'}.pdf`,
      content: pdfBuffer.toString('base64')
    }
  ];

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('[EMAIL] Brevo Success! Message ID:', data.messageId);
    return data;
  } catch (error) {
    // Detailed error logging for debugging
    const errorMsg = error.response ? error.response.text : error.message;
    console.error('[EMAIL] Brevo SDK Error Details:', errorMsg);
    throw new Error(`Email failed: ${errorMsg}`);
  }
};

module.exports = {
  sendInspectionReportEmail,
};
