import { Colors, getButtonColors, getTextColors } from '../../constants/Colors'

// Contact Info Item Component
const ContactInfoItem = ({ icon, title, info }) => (
  <div className="flex items-center">
    <div className={`w-10 h-10 ${Colors.background.secondary[100]} rounded-full flex items-center justify-center mr-4`}>
      {icon}
    </div>
    <div>
      <div className={`font-semibold ${getTextColors('heading')}`}>{title}</div>
      <div className={`${getTextColors('body')}`}>{info}</div>
    </div>
  </div>
)

// Social Link Component
const SocialLink = ({ href, icon }) => (
  <a href={href} className={`w-10 h-10 ${Colors.background.secondary[100]} rounded-full flex items-center justify-center ${Colors.hover.background.secondary} transition-colors`}>
    {icon}
  </a>
)

// Contact Section Component
const ContactSection = () => (
  <section id="contact" className={`py-20 ${Colors.background.primary[600]}`}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className={`text-3xl md:text-4xl font-bold ${Colors.text.white} mb-4`}>Start Your Legal Consultation</h2>
        <p className={`text-xl ${Colors.text.primary[100]} max-w-3xl mx-auto`}>
          Ready to get professional legal guidance for your traffic law questions? Begin your consultation with LawBuddy today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className={`${Colors.background.white} rounded-lg p-8 ${Colors.utility.shadowXl}`}>
            <h3 className={`text-2xl font-bold ${getTextColors('heading')} mb-6`}>Professional Legal Support</h3>
            
            <div className="space-y-6">
              <ContactInfoItem 
                icon={
                  <svg className={`w-5 h-5 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                }
                title="Legal Consultation"
                info="legal@lawbuddy.com"
              />
              
              <ContactInfoItem 
                icon={
                  <svg className={`w-5 h-5 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                }
                title="Legal Hotline"
                info="1-800-LAW-BUDDY"
              />
              
              <ContactInfoItem 
                icon={
                  <svg className={`w-5 h-5 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                }
                title="Professional Availability"
                info="24/7 Legal AI Assistant"
              />
            </div>

            <div className={`mt-8 pt-6 border-t ${Colors.border.neutral[200]}`}>
              <h4 className={`font-semibold ${getTextColors('heading')} mb-3`}>Connect With Us</h4>
              <div className="flex space-x-4">
                <SocialLink 
                  href="#"
                  icon={
                    <svg className={`w-5 h-5 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                  }
                />
                <SocialLink 
                  href="#"
                  icon={
                    <svg className={`w-5 h-5 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                    </svg>
                  }
                />
                <SocialLink 
                  href="#"
                  icon={
                    <svg className={`w-5 h-5 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h3 className={`text-3xl font-bold ${Colors.text.white} mb-6`}>Ready for Professional Legal Guidance?</h3>
          <p className={`${Colors.text.primary[100]} mb-8 text-lg`}>
            Join thousands of clients who trust LawBuddy for their legal questions. 
            Start your professional consultation today and get the expert guidance you need.
          </p>
          <button className={`${getButtonColors('gold')} px-12 py-4 rounded-lg text-xl font-bold transform hover:scale-105 transition-all duration-200 ${Colors.utility.shadow}`}>
            Begin Legal Consultation
          </button>
          <p className={`${Colors.text.primary[200]} mt-4 text-sm`}>
            Professional service • Confidential • Instant legal guidance
          </p>
        </div>
      </div>
    </div>
  </section>
)

export default ContactSection