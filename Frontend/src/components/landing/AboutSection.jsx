import { Colors, getTextColors } from '../../constants/Colors'

// Feature Item Component
const FeatureItem = ({ icon, title, description }) => (
  <div className="flex items-start">
    <div className="flex-shrink-0">
      <div className={`w-8 h-8 ${Colors.background.secondary[100]} rounded-full flex items-center justify-center`}>
        {icon}
      </div>
    </div>
    <div className="ml-4">
      <h4 className={`text-lg font-semibold ${getTextColors('heading')} mb-2`}>{title}</h4>
      <p className={`${getTextColors('body')}`}>{description}</p>
    </div>
  </div>
)

// About Section Component
const AboutSection = () => {
  const checkIcon = (
    <svg className={`w-5 h-5 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )

  return (
    <section id="about" className={`py-20 ${Colors.background.white}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold ${getTextColors('heading')} mb-4`}>About LawBuddy</h2>
          <p className={`text-xl ${getTextColors('body')} max-w-3xl mx-auto`}>
            We've created an intelligent legal assistant that specializes in traffic and motor vehicle laws, 
            providing professional-grade legal guidance accessible to everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className={`text-2xl font-bold ${getTextColors('heading')} mb-6`}>Why Choose LawBuddy?</h3>
            <div className="space-y-6">
              <FeatureItem 
                icon={checkIcon}
                title="Professional Legal Guidance"
                description="Get immediate answers to your legal questions without waiting for appointments or expensive consultations."
              />
              <FeatureItem 
                icon={checkIcon}
                title="Comprehensive Legal Database"
                description="From traffic violations to DUI laws, we cover all aspects of motor vehicle and traffic regulations."
              />
              <FeatureItem 
                icon={checkIcon}
                title="Current Legal Information"
                description="Our AI is trained on the latest legal statutes and regulations, ensuring accurate and up-to-date guidance."
              />
            </div>
          </div>

          <div className={`${Colors.background.gradient.darkNavy} rounded-lg p-8`}>
            <div className="text-center">
              <div className={`w-24 h-24 ${Colors.background.secondary[600]} rounded-full flex items-center justify-center mx-auto mb-6`}>
                <svg className={`w-12 h-12 ${Colors.text.white}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className={`text-2xl font-bold ${Colors.text.white} mb-4`}>Professional Legal Expertise</h4>
              <p className={`${Colors.text.cream}`}>
                LawBuddy combines advanced AI technology with comprehensive legal knowledge to provide 
                you with reliable, professional-grade answers about traffic and motor vehicle laws.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSection