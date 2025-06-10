// Footer Component
const Footer = ({ scrollToSection }) => (
  <footer className="bg-gray-900 text-white py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center mb-4">
            <span className="text-2xl font-bold">⚖️ LawBuddy</span>
          </div>
          <p className="text-gray-400 mb-4 max-w-md">
            Your trusted AI-powered assistant for traffic and motor vehicle law questions. 
            Get instant, accurate legal guidance 24/7.
          </p>
          <p className="text-gray-500 text-sm">
            © 2025 LawBuddy. All rights reserved.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-gray-400">
            <li><button onClick={() => scrollToSection('hero')} className="hover:text-white transition-colors">Home</button></li>
            <li><button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors">About</button></li>
            <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Legal</h4>
          <ul className="space-y-2 text-gray-400">
            <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Disclaimer</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
        <p className="text-sm">
          <strong>Disclaimer:</strong> LawBuddy provides general legal information and should not be considered as legal advice. 
          For specific legal matters, please consult with a qualified attorney.
        </p>
      </div>
    </div>
  </footer>
)

export default Footer