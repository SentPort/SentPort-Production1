import { X } from 'lucide-react';

interface WhyChooseHuTubeModalProps {
  onClose: () => void;
}

export default function WhyChooseHuTubeModal({ onClose }: WhyChooseHuTubeModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Why Choose HuTube?</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Our Philosophy</h3>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-gray-800 leading-relaxed font-medium mb-2">
                Let's be clear: We're not against advertising or algorithms.
              </p>
              <p className="text-gray-700 leading-relaxed">
                We're against how they're commonly misused. The problem isn't the tools themselves, it's when platforms
                prioritize revenue over user wellbeing. Advertising and algorithms can serve users when designed responsibly,
                but too often they're weaponized purely for profit at the expense of mental health, privacy, and autonomy.
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              HuTube is built with users first, revenue second. We believe video platforms should primarily serve creators
              and viewers, not exploit them for maximum profit. Every feature is designed to respect your time, attention,
              and wellbeing.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Unlike mainstream platforms optimized for maximum "engagement" (time spent watching ads), HuTube is
              optimized for genuine value, creative expression, and meaningful connection.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Our commitment:</strong> If we introduce advertising in the future, it will always be secondary to
              your experience. We will never sacrifice high-quality content or user wellbeing for revenue. That's a promise.
            </p>
          </section>

          <section className="bg-red-50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-red-900 mb-4">How Tools Get Misused</h3>
            <p className="text-gray-700 leading-relaxed mb-4 italic">
              When platforms prioritize profit over people, here's what happens:
            </p>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-red-800 mb-2">Infinite Scroll & Endless Feeds</h4>
                <p className="text-gray-700 leading-relaxed">
                  Engineered for compulsive viewing patterns. Designed to make you watch "just one more video"
                  for hours on end, maximizing ad impressions rather than your satisfaction or wellbeing.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-red-800 mb-2">The Rabbit Hole Phenomenon</h4>
                <p className="text-gray-700 leading-relaxed">
                  Algorithms optimized purely for engagement push increasingly extreme or sensational content.
                  Users often end up watching content they never intended to see, sometimes harmful or misleading material.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-red-800 mb-2">Mental Health Impact</h4>
                <p className="text-gray-700 leading-relaxed">
                  Research links heavy platform use to increased anxiety, depression, and loneliness.
                  Studies show users of profit-first platforms report 3x higher rates of mental health issues
                  compared to those who control their own content consumption.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-red-800 mb-2">Addiction by Design</h4>
                <p className="text-gray-700 leading-relaxed">
                  Features deliberately designed to maximize time spent, not value delivered. Platform engineers
                  use the same psychological techniques as casinos to keep you scrolling and watching.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-red-800 mb-2">Algorithmic Opacity</h4>
                <p className="text-gray-700 leading-relaxed">
                  Algorithm details kept deliberately secret from users and creators. On mainstream platforms,
                  roughly 70% of content consumed is driven by opaque recommendations, not user choice.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-green-50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-green-900 mb-4">The HuTube Difference</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-green-800 mb-2">You Choose What You Watch</h4>
                <p className="text-gray-700 leading-relaxed">
                  No algorithmic feed pushing content at you. Browse categories, search for what interests you,
                  and subscribe to creators you trust. Every video you watch is your conscious choice.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-green-800 mb-2">Chronological, Not Algorithmic</h4>
                <p className="text-gray-700 leading-relaxed">
                  Your subscriptions feed shows the latest videos from creators you follow, in the order they were posted.
                  No hidden manipulation, no content suppression, no "shadowbanning."
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-green-800 mb-2">Transparent Discovery</h4>
                <p className="text-gray-700 leading-relaxed">
                  When we suggest videos, it's based on simple, transparent rules: what's popular in your chosen topics,
                  what's trending platform-wide, or what's new from channels similar to ones you subscribe to.
                  No secret algorithmic manipulation.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-green-800 mb-2">Respectful Monetization</h4>
                <p className="text-gray-700 leading-relaxed">
                  Creators can earn through direct support from viewers who value their work. Any future monetization
                  features will prioritize creator sustainability and user experience over maximum revenue extraction.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-green-800 mb-2">Your Data, Your Control</h4>
                <p className="text-gray-700 leading-relaxed">
                  We don't sell your viewing data. We don't build psychological profiles to manipulate you.
                  Your watch history is private and used only to help you find videos you've seen before.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-green-800 mb-2">Natural Stopping Points</h4>
                <p className="text-gray-700 leading-relaxed">
                  Videos end and stop by default. We offer an autoplay feature, but it's your choice whether to use it.
                  Unlike other platforms that bury autoplay settings deep in menus or make you actively opt out with countdown timers,
                  our autoplay toggle is right on the front page of your settings where you can easily find and control it.
                  You decide how you want to watch, not us.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Built for the Long Term</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              HuTube is part of the SentPort ecosystem, built on the principle that technology should serve human
              flourishing, not extract maximum value from human attention.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We're building a sustainable platform where creators can thrive by making great content, and viewers
              can enjoy videos without sacrificing their mental health, privacy, or autonomy.
            </p>
          </section>

          <section className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Ready to Join?</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Create your HuTube channel and start sharing your videos with an audience that chose to be here.
              Or simply subscribe to creators who inspire you and watch on your own terms.
            </p>
            <p className="text-gray-700 leading-relaxed font-medium">
              Welcome to video sharing that respects your humanity.
            </p>
          </section>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
