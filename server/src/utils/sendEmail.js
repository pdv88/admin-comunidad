const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verify connection configuration on startup
transporter.verify(function (error, success) {
    if (error) {
        console.error('❌ SMTP Connection Error:', error);
    } else {
        console.log('✅ SMTP Connection Established');
    }
});

const sendEmail = async ({ email, subject, templateName, context }) => {
    try {
        // Read template
        const templatePath = path.join(__dirname, `../../email_templates/${templateName}`);
        const source = fs.readFileSync(templatePath, 'utf8');

        // Compile template
        const template = handlebars.compile(source);
        const html = template(context);

        // Send email
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: subject,
            html: html,
        });

        // Preview only available when sending through an Ethereal account
        if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('ethereal')) {
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }

        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error('Email sending failed');
    }
};

module.exports = sendEmail;
