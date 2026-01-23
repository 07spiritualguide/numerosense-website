import React from 'react';

export default function TermsOfService() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12 text-zinc-900 dark:text-zinc-100">
            <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">Last updated: {new Date().toLocaleDateString()}</p>

            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-3">1. Agreement to Terms</h2>
                    <p className="text-base leading-relaxed">
                        By accessing or using NumeroSense, you agree to be bound by these Terms of Service.
                        If you do not agree, strictly do not access or use our services.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                    <p className="text-base leading-relaxed">
                        NumeroSense provides numerology calculations and AI-assisted astrological guidance.
                        <strong>The services are for entertainment and informational purposes only.</strong>
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">3. Disclaimer of Warranties</h2>
                    <p className="text-base leading-relaxed">
                        The insights, predictions, and guidance provided by NumeroSense and its AI features are based on numerological beliefs and systems.
                        They should not be considered as professional advice (medical, legal, financial, or psychological).
                        You should not rely on this information as a substitute for professional counsel. We do not guarantee the accuracy of any prediction.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">4. User Accounts</h2>
                    <p className="text-base leading-relaxed">
                        You are responsible for maintaining the confidentiality of your account credentials (phone number and password).
                        You agree to provide accurate and current information (Date of Birth) for correct calculations.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">5. Termination</h2>
                    <p className="text-base leading-relaxed">
                        We reserve the right to suspend or terminate your account at our sole discretion, without notice,
                        for conduct that we believe violates these Terms or is harmful to other users of us.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">6. Limitation of Liability</h2>
                    <p className="text-base leading-relaxed">
                        To the fullest extent permitted by law, NumeroSense shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
                        including but not limited to reliance on information obtained through the service.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">7. Changes to Terms</h2>
                    <p className="text-base leading-relaxed">
                        We may modify these Terms at any time. Your continued use of the service constitutes agreement to the updated Terms.
                    </p>
                </section>
            </div>
        </div>
    );
}
