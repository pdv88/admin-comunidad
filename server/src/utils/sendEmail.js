const { Resend } = require('resend');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Register Handlebars helpers
handlebars.registerHelper('eq', function (a, b) {
    return a === b;
});

// Initialize Resend with API Key
const resend = new Resend(process.env.RESEND_API_KEY);

const emailQueue = [];
let isProcessing = false;
const RATE_LIMIT_DELAY = 600; // ms (approx 1.6 emails/sec, safe under 2/sec)

const processQueue = async () => {
    if (isProcessing || emailQueue.length === 0) return;

    isProcessing = true;
    while (emailQueue.length > 0) {
        const { req, resolve, reject } = emailQueue.shift();
        try {
            await performSend(req, resolve, reject);
        } catch (error) {
            console.error("Queue processing error:", error);
        }
        // Wait before next email
        await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
    isProcessing = false;
};

const performSend = async ({ email, subject, templateName, context, from }, resolve, reject) => {
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
            // Log failure to DB
            await logEmailFailure(email, subject, data.error.message, from, context.community_id);
            reject(new Error(data.error.message));
        } else {
            console.log(`✅ Email sent via API to ${email} (ID: ${data.data?.id})`);
            resolve(data);
        }

    } catch (error) {
        console.error("Error sending email via API:", error);
        // Log failure to DB
        await logEmailFailure(context.email || email, subject, error.message, from, context.community_id);
        reject(new Error('Email sending failed'));
    }
};

const sendEmail = async (emailRequest) => {
    return new Promise((resolve, reject) => {
        emailQueue.push({ req: emailRequest, resolve, reject });
        processQueue();
    });
};

// Helper to log failures
const supabaseAdmin = require('../config/supabaseAdmin'); // Ensure this path is correct relative to this file
async function logEmailFailure(recipient, subject, errorMessage, sender, communityId) {
    try {
        // Attempt to extract community name from sender (e.g. "Community Name <info@...>")
        // Ideally we should pass community_id to sendEmail context, but for now we try best effort or null
        // If we strictly need community_id, we should update calls to sendEmail to include it.
        // For now, let's log it globally or try to find community?
        // Actually, without community_id, alerts won't show in the multi-tenant dashboard easily.
        // BUT, `sendEmail` is generic.
        // Best approach: Parse context.community_id if available, or modify sendEmail signature.
        // Let's assume we can't easily change all call sites right now.
        // We'll log to a 'system' alert without community_id if missing? 
        // OR: Update performSend to accept community_id in context.

        // Wait, 'performSend' has 'context'. Most templates have 'community_name'.
        // We can try to fetch community by name if needed, but that's risky.
        // Let's modify the calls in maintenance.controller? No, too many.

        // Let's look at performSend signature again.
        // It receives `req` object.

        // We will insert with null community_id if not found, but RLS might hide it. 
        // Wait, migration says "references communities". So it MUST be valid or null.
        // If null, it's a global system alert.

        // Quick Fix: Allow null community_id in table (done in migration, no 'not null').

        if (!communityId) {
            console.warn("Skipping alert log: No community_id provided for email failure.");
            // We could try to infer it, but safer to skip or log null if allowed.
            // Migration allowed null, so we can insert null.
        }

        await supabaseAdmin.from('system_alerts').insert({
            community_id: communityId || null,
            type: 'email_failure',
            title: 'Failed to send email',
            message: `Failed to send "${subject}" to ${recipient}. Error: ${errorMessage}`,
            metadata: { recipient, subject, error: errorMessage, sender }
            // community_id: ??? -> We need this for the frontend to query it by community.
        });
    } catch (err) {
        console.error("Failed to log email failure:", err);
    }
}

module.exports = sendEmail;
