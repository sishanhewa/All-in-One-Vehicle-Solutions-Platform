const Brevo = require('@getbrevo/brevo');

const sendInspectionReportEmail = async (toEmail, userName, pdfBuffer, reportNumber) => {
  console.log('[EMAIL] Attempting to send via Brevo API to:', toEmail);

  let apiInstance = new Brevo.TransactionalEmailsApi();
  let apiKey = apiInstance.authentications['apiKey'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  let sendSmtpEmail = new Brevo.SendSmtpEmail();

  sendSmtpEmail.subject = `Your Vehicle Inspection Report (#${reportNumber || 'N/A'}) is Ready!`;
  sendSmtpEmail.htmlContent = `
    <html>
      <body>
        <h3>Hello ${userName},</h3>
        <p>Your vehicle inspection has been completed successfully.</p>
        <p>We have attached the detailed PDF report of the inspection for your records.</p>
        <p>Thank you for choosing our service!</p>
        <br/>
        <p>Best Regards,</p>
        <p><strong>Vehicle Management System Team</strong></p>
      </body>
    </html>
  `;
  
  // Sender must be the email address you verified in Brevo
  sendSmtpEmail.sender = { 
    name: "Vehicle Management System", 
    email: process.env.EMAIL_USER || "lankacv.stmp@gmail.com" 
  };
  
  sendSmtpEmail.to = [{ email: toEmail, name: userName }];
  
  // Attachments in Brevo API are base64 encoded strings
  sendSmtpEmail.attachment = [
    {
      name: `Inspection_${reportNumber || 'Report'}.pdf`,
      content: pdfBuffer.toString('base64')
    }
  ];

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('[EMAIL] Brevo Success! Message ID:', data.body.messageId);
    return data;
  } catch (error) {
    console.error('[EMAIL] Brevo API Error:', error.response ? error.response.body : error.message);
    throw new Error(error.response ? error.response.body.message : error.message);
  }
};

module.exports = {
  sendInspectionReportEmail,
};
