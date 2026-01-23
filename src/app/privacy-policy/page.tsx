import React from 'react';

export default function PrivacyPolicy() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12 text-zinc-900 dark:text-zinc-100">
            <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">Last updated: {new Date().toLocaleDateString()}</p>

            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                    <p className="text-base leading-relaxed">
                        Welcome to NumeroSense. We respect your privacy and are committed to protecting your personal data.
                        This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and website.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
                    <p className="mb-2">We collect the following types of information to provide our numerology services:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Personal Identification:</strong> Name and Phone number for account creation and authentication.</li>
                        <li><strong>Birth Details:</strong> Date of Birth is strictly required to calculate your numerology charts (Psychic number, Destiny number, Dashas).</li>
                        <li><strong>Gender:</strong> Optional, used for personalized interpretations.</li>
                        <li><strong>Usage Data:</strong> Chat history and interactions with our AI astrologer.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>To calculate and generate accurate numerology reports (Mahadasha, Antardasha, etc.).</li>
                        <li>To provide personalized AI chat responses regarding your life path and queries.</li>
                        <li>To manage your account and authentication via SMS OTP.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">4. Data Sharing and Third Parties</h2>
                    <p className="mb-2">We do not sell your personal data. We share data only with essential service providers:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Supabase:</strong> For secure database hosting and data storage.</li>
                        <li><strong>Fast2SMS:</strong> To send OTPs for phone number verification.</li>
                        <li><strong>OpenRouter (AI Providers):</strong> Anonymized context from your chart may be sent to generate AI responses.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
                    <p className="text-base leading-relaxed">
                        We implement appropriate security measures to protect your personal data.
                        Your account is protected by JWT-based authentication, and sensitive communications are encrypted.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">6. User Rights</h2>
                    <p className="text-base leading-relaxed">
                        You have the right to request access to or deletion of your personal data.
                        You can delete your account and all associated data directly within the app settings or by contacting us.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">7. Contact Us</h2>
                    <p className="text-base leading-relaxed">
                        If you have questions about this Privacy Policy, please contact us at support@numerosense.in.
                    </p>
                </section>
            </div>
        </div>
    );
}
