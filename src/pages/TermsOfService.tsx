import Header from '../components/Header';
import Footer from '../components/Footer';

export default function TermsOfService() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-sm text-gray-500 mb-8">Last Updated: March 21, 2026</p>

            <div className="prose prose-lg max-w-none space-y-8">
              <section>
                <p className="text-gray-700 leading-relaxed">
                  Welcome to SentPort. By creating an account and using our services, you agree to be bound by these Terms of Service. Please read them carefully.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-lg mr-3">Required</span>
                  1. You Must Be 18 Years or Older
                </h2>
                <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-lg">
                  <p className="text-gray-800 font-semibold mb-3">
                    SentPort is only available to individuals who are at least 18 years of age.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>If you are under 18, you are prohibited from creating an account or using our services</li>
                    <li>Providing false age information will result in immediate account termination</li>
                    <li>SentPort reserves the right to verify your age at any time</li>
                    <li>You may only create one account per person</li>
                    <li>You must be a real human being (no bots or automated accounts)</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Account Registration</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  When you create an account with SentPort:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>You must verify your email address to activate your account</li>
                  <li>You are responsible for maintaining the security of your password</li>
                  <li>You are responsible for all activity that occurs under your account</li>
                  <li>You must not share your account credentials with anyone</li>
                  <li>You must notify us immediately of any unauthorized access to your account</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-lg mr-3">Important</span>
                  3. Community Jury Review System
                </h2>
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg mb-4">
                  <p className="text-gray-800 font-bold mb-3 text-lg">
                    Your content may be reviewed by volunteer community jurors if it is reported.
                  </p>
                  <p className="text-gray-800 font-semibold mb-4">
                    Privacy settings DO NOT prevent jury review of reported content.
                  </p>
                  <div className="space-y-3 text-gray-700">
                    <p>
                      <strong>How the Jury System Works:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>When content is reported for violating community standards, it may be sent to a jury for review</li>
                      <li>Jurors are randomly selected verified SentPort users who volunteer to participate</li>
                      <li>Jurors can see the reported content, surrounding context, and the platform it was posted on</li>
                      <li>Jurors make decisions about whether content violates our policies</li>
                      <li>Jury participation is voluntary and jurors must maintain confidentiality</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
                  <p className="text-gray-800 font-semibold mb-2">
                    Even if your content is set to private, it can still be reviewed by jurors if reported.
                  </p>
                  <p className="text-gray-700">
                    This system is essential for maintaining community safety and fair moderation. By using SentPort, you acknowledge and accept that reported content may be reviewed by volunteer jurors regardless of your privacy settings.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Privacy Settings and Limitations</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  <strong>What Privacy Settings Control:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Who can see your content during normal browsing</li>
                  <li>Who can interact with your posts and profile</li>
                  <li>Who can send you messages or friend requests</li>
                  <li>Visibility of your profile information to other users</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mb-3">
                  <strong>What Privacy Settings DO NOT Control:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Review of reported content by community jurors</li>
                  <li>Access by SentPort moderators and administrators for safety and compliance</li>
                  <li>Legal obligations to provide information to law enforcement</li>
                  <li>Detection and prevention of violations of our Terms of Service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Platform Usage</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  SentPort provides access to multiple social platforms:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li><strong>HuBook</strong> - Social networking and photo sharing</li>
                  <li><strong>HuTube</strong> - Video sharing and streaming</li>
                  <li><strong>Hinsta</strong> - Photo and story sharing</li>
                  <li><strong>Switter</strong> - Microblogging and real-time updates</li>
                  <li><strong>Heddit</strong> - Community discussions and forums</li>
                  <li><strong>HuBlog</strong> - Long-form writing and blogging</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  By using these platforms, you agree to use them responsibly and in accordance with these Terms of Service and all applicable laws.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Content Ownership and Rights</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  <strong>You Retain Ownership:</strong> You retain all ownership rights to content you post on SentPort.
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  <strong>License to SentPort:</strong> By posting content, you grant SentPort a worldwide, non-exclusive, royalty-free license to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Display your content on our platforms</li>
                  <li>Distribute your content to other users based on your privacy settings</li>
                  <li>Make your content available for moderation and review purposes</li>
                  <li>Create backups and archive content for operational purposes</li>
                  <li>Show your public content in search results and discovery feeds</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Prohibited Content and Conduct</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  You agree not to post content or engage in conduct that:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Harasses, threatens, or bullies other users</li>
                  <li>Promotes hate speech, violence, or discrimination</li>
                  <li>Contains illegal content or promotes illegal activities</li>
                  <li>Infringes on intellectual property rights</li>
                  <li>Contains spam, scams, or misleading information</li>
                  <li>Involves sexual exploitation or abuse of minors (zero tolerance policy)</li>
                  <li>Impersonates others or misrepresents your identity</li>
                  <li>Attempts to hack, disrupt, or abuse our systems</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Moderation and Enforcement</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  SentPort reserves the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Remove content that violates these Terms of Service</li>
                  <li>Suspend or terminate accounts for violations</li>
                  <li>Report illegal activity to law enforcement</li>
                  <li>Use automated tools and community juries to moderate content</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  If your content is removed or your account is suspended, you may have the opportunity to appeal the decision through our appeals process.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Account Termination</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  <strong>Your Right to Terminate:</strong> You may delete your account at any time through your account settings.
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  <strong>SentPort's Right to Terminate:</strong> We may suspend or terminate your account if:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>You violate these Terms of Service</li>
                  <li>You provide false information during registration</li>
                  <li>Your account is inactive for an extended period</li>
                  <li>We are required to do so by law</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  Upon termination, we may retain certain information as required by law or for legitimate business purposes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Disclaimers and Limitations of Liability</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  SentPort is provided "as is" without warranties of any kind. We do not guarantee:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Uninterrupted or error-free service</li>
                  <li>Complete accuracy of content posted by users</li>
                  <li>Security from unauthorized access or data breaches</li>
                  <li>That all harmful content will be detected and removed</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  To the maximum extent permitted by law, SentPort is not liable for any indirect, incidental, or consequential damages arising from your use of our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to Terms</h2>
                <p className="text-gray-700 leading-relaxed">
                  We may update these Terms of Service from time to time. If we make material changes, we will notify you by email or through a prominent notice on our platform. Your continued use of SentPort after changes take effect constitutes acceptance of the new terms. If you do not agree to the updated terms, you must stop using our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Information</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  If you have questions about these Terms of Service, please contact us at:
                </p>
                <p className="text-gray-700 font-medium">
                  Email: legal@sentport.com
                </p>
                <p className="text-gray-700 font-medium">
                  Support: support@sentport.com
                </p>
              </section>

              <section className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-gray-600 text-sm">
                  By creating a SentPort account, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
