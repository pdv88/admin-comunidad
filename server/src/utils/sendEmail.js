const { Resend } = require('resend');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Initialize Resend with API Key
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ email, subject, templateName, context, from }) => {
    try {
        // Read template
        const templatePath = path.join(__dirname, `../../email_templates/${templateName}`);
        const source = fs.readFileSync(templatePath, 'utf8');

        // Compile template
        const template = handlebars.compile(source);
        const html = template(context);

        // Send email using Resend API (HTTP)
        const data = await resend.emails.send({
            from: from || process.env.EMAIL_FROM || 'Admin Comunidad <onboarding@resend.dev>',
            to: email,
            subject: subject,
            html: html,
        });

        if (data.error) {
            console.error("Resend API Error:", data.error);
            throw new Error(data.error.message);
        }

        console.log(`✅ Email sent via API to ${email} (ID: ${data.data?.id})`);
        return data;

    } catch (error) {
        console.error("Error sending email via API:", error);
        throw new Error('Email sending failed');
    }
};

module.exports = sendEmail;
