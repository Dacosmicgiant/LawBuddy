import { Colors } from '../constants/Colors'

// Footer Component
const Footer = ({ scrollToSection }) => (
  <footer className={`${Colors.background.neutral[900]} ${Colors.text.white} py-12`}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center mb-4">
            <span className={`text-2xl font-bold ${Colors.text.secondary[500]}`}>⚖️ LawBuddy</span>
          </div>
          <p className={`${Colors.text.gray[400]} mb-4 max-w-md`}>
            Your trusted AI-powered legal assistant for traffic and motor vehicle law questions. 
            Professional legal guidance available 24/7.
          </p>
          <p className={`${Colors.text.gray[500]} text-sm`}>
            © 2025 LawBuddy Professional Legal Services. All rights reserved.
          </p>
        </div>

        <div>
          <h4 className={`font-semibold mb-4 ${Colors.text.secondary[500]}`}>Quick Links</h4>
          <ul className={`space-y-2 ${Colors.text.gray[400]}`}>
            <li><button onClick={() => scrollToSection('hero')} className={`${Colors.hover.text.white} transition-colors`}>Home</button></li>
            <li><button onClick={() => scrollToSection('about')} className={`${Colors.hover.text.white} transition-colors`}>About</button></li>
            <li><button onClick={() => scrollToSection('features')} className={`${Colors.hover.text.white} transition-colors`}>Features</button></li>
            <li><a href="#" className={`${Colors.hover.text.white} transition-colors`}>Privacy Policy</a></li>
          </ul>
        </div>

        <div>
          <h4 className={`font-semibold mb-4 ${Colors.text.secondary[500]}`}>Legal Resources</h4>
          <ul className={`space-y-2 ${Colors.text.gray[400]}`}>
            <li><a href="#" className={`${Colors.hover.text.white} transition-colors`}>Terms of Service</a></li>
            <li><a href="#" className={`${Colors.hover.text.white} transition-colors`}>Legal Disclaimer</a></li>
            <li><a href="#" className={`${Colors.hover.text.white} transition-colors`}>Attorney Resources</a></li>
            <li><a href="#" className={`${Colors.hover.text.white} transition-colors`}>Professional Support</a></li>
          </ul>
        </div>
      </div>

      <div className={`border-t ${Colors.border.neutral[800]} mt-8 pt-8 text-center ${Colors.text.gray[400]}`}>
        <p className="text-sm">
          <strong className={`${Colors.text.secondary[500]}`}>Legal Disclaimer:</strong> LawBuddy provides general legal information and educational content. 
          This service should not be considered as professional legal advice. For specific legal matters requiring representation, 
          please consult with a qualified attorney licensed in your jurisdiction.
        </p>
      </div>
    </div>
  </footer>
)

export default Footer