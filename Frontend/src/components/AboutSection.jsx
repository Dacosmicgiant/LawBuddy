// Feature Item Component
const FeatureItem = ({ icon, title, description }) => (
  <div className="flex items-start">
    <div className="flex-shrink-0">
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        {icon}
      </div>
    </div>
    <div className="ml-4">
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  </div>
)

// About Section Component
const AboutSection = () => {
  const checkIcon = (
    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">About LawBuddy</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We've created an intelligent legal assistant that specializes in traffic and motor vehicle laws, 
            making legal information accessible to everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Why Choose LawBuddy?</h3>
            <div className="space-y-6">
              <FeatureItem 
                icon={checkIcon}
                title="Instant Legal Guidance"
                description="Get immediate answers to your traffic law questions without waiting for appointments or consultations."
              />
              <FeatureItem 
                icon={checkIcon}
                title="Comprehensive Coverage"
                description="From speeding tickets to DUI laws, we cover all aspects of traffic and motor vehicle regulations."
              />
              <FeatureItem 
                icon={checkIcon}
                title="Updated Legal Database"
                description="Our AI is trained on the latest traffic laws and regulations, ensuring accurate and current information."
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">Legal Expertise at Your Fingertips</h4>
              <p className="text-gray-600">
                LawBuddy combines advanced AI technology with comprehensive legal knowledge to provide 
                you with reliable, easy-to-understand answers about traffic and motor vehicle laws.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSection