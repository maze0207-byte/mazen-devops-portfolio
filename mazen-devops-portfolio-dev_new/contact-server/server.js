const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Resend } = require('resend');

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Initialize Resend client
const resend = new Resend(RESEND_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiConfigured: !!RESEND_API_KEY,
  });
});

// Send message endpoint
app.post('/send', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate inputs
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'All fields are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email address',
      });
    }

    // Validate API key
    if (!RESEND_API_KEY) {
      console.error('[Contact Server] Missing RESEND_API_KEY environment variable');
      return res.status(500).json({
        error: 'Email service is not configured',
      });
    }

    // Send email via Resend
    const response = await resend.emails.send({
      from: 'noreply@resend.dev',
      to: 'mazenahmed0205@gmail.com',
      replyTo: email,
      subject: `New Message from ${name} - Portfolio Contact Form`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 8px;">
          <h2 style="color: #06b6d4; margin-bottom: 20px;">New Contact Form Submission</h2>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 15px;">
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #18181b;">From:</strong>
              <span style="display: block; color: #71717a; margin-top: 5px; font-size: 14px;">${name}</span>
            </p>
            
            <p style="margin: 15px 0 10px 0;">
              <strong style="color: #18181b;">Email:</strong>
              <span style="display: block; color: #71717a; margin-top: 5px; font-size: 14px;"><a href="mailto:${email}" style="color: #06b6d4; text-decoration: none;">${email}</a></span>
            </p>
            
            <p style="margin: 15px 0 10px 0;">
              <strong style="color: #18181b;">Message:</strong>
              <span style="display: block; color: #71717a; margin-top: 5px; font-size: 14px; white-space: pre-wrap; line-height: 1.6;">${message}</span>
            </p>
          </div>
          
          <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            This message was sent from your portfolio's contact form.
          </p>
        </div>
      `,
      text: `New Message from ${name}\n\nEmail: ${email}\n\nMessage:\n${message}`,
    });

    // Check for Resend errors
    if (response.error) {
      console.error('[Contact Server] Resend API error:', response.error);
      return res.status(500).json({
        error: 'Failed to send email. Please try again later.',
      });
    }

    console.log('[Contact Server] Email sent successfully:', {
      messageId: response.data?.id,
      from: email,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Message sent successfully',
      messageId: response.data?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Contact Server] Error sending email:', error);
    res.status(500).json({
      error: 'Failed to send message. Please try again later.',
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Contact Server] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Contact Server] Running on http://localhost:${PORT}`);
  console.log(`[Contact Server] Health check: GET http://localhost:${PORT}/health`);
  console.log(`[Contact Server] Send endpoint: POST http://localhost:${PORT}/send`);
  console.log(`[Contact Server] Resend API configured: ${!!RESEND_API_KEY}`);
});
