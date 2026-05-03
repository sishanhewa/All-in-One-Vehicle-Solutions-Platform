const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendInspectionReportEmail = async (toEmail, userName, pdfBuffer, reportNumber) => {
  console.log('[EMAIL] Attempting to send via Resend API to:', toEmail);

  try {
    const { data, error } = await resend.emails.send({
      // IMPORTANT: Resend free tier (onboarding domain) ONLY sends from onboarding@resend.dev
      from: 'Vehicle Management System <onboarding@resend.dev>',
      to: toEmail,
      subject: `Your Vehicle Inspection Report (#${reportNumber || 'N/A'}) is Ready!`,
      html: `
        <h3>Hello ${userName},</h3>
        <p>Your vehicle inspection has been completed successfully.</p>
        <p>We have attached the detailed PDF report of the inspection for your records.</p>
        <p>Thank you for choosing our service!</p>
        <br/>
        <p>Best Regards,</p>
        <p><strong>Vehicle Management System Team</strong></p>
      `,
      attachments: [
        {
          filename: `Inspection_${reportNumber || 'Report'}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('[EMAIL] Resend API Error:', error.message);
      throw new Error(error.message);
    }

    console.log('[EMAIL] Resend Success! Message ID:', data.id);
    return data;
  } catch (error) {
    console.error('[EMAIL] Exception in Resend block:', error.message);
    // We throw so the controller's manual button can show the error
    throw error;
  }
};

module.exports = {
  sendInspectionReportEmail,
};
