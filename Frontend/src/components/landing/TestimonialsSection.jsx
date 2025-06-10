import { Colors, getTextColors } from '../../constants/Colors'

// Star Rating Component
const StarRating = () => (
  <div className={`flex ${Colors.utility.accent.stars}`}>
    {[...Array(5)].map((_, i) => (
      <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
)

// Testimonial Card Component
const TestimonialCard = ({ quote, name, location, title }) => (
  <div className={`${Colors.background.neutral[100]} rounded-lg p-8 border-l-4 ${Colors.border.secondary[500]} ${Colors.utility.shadow}`}>
    <div className="flex items-center mb-4">
      <StarRating />
    </div>
    <p className={`${getTextColors('body')} mb-4 italic`}>"{quote}"</p>
    <div className={`font-semibold ${getTextColors('heading')}`}>{name}</div>
    <div className={`${getTextColors('muted')} text-sm`}>{title}</div>
    <div className={`${Colors.text.secondary[600]} text-sm font-medium`}>{location}</div>
  </div>
)

// Testimonials Section Component
const TestimonialsSection = () => {
  const testimonials = [
    {
      quote: "LawBuddy provided clear, professional guidance on my speeding ticket case. The legal explanations were thorough and I felt confident representing myself in court.",
      name: "Sarah Martinez",
      title: "Small Business Owner",
      location: "California"
    },
    {
      quote: "As a first-time DUI offender, I was overwhelmed. LawBuddy helped me understand my rights and the legal process, saving me thousands in legal fees.",
      name: "Michael Chen",
      title: "Engineer",
      location: "Texas"
    },
    {
      quote: "The 24/7 availability is invaluable. When I got pulled over late at night, LawBuddy was there to help me understand my legal options immediately.",
      name: "Jennifer Williams",
      title: "Healthcare Professional",
      location: "Florida"
    }
  ]

  return (
    <section className={`py-20 ${Colors.background.white}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold ${getTextColors('heading')} mb-4`}>Client Testimonials</h2>
          <p className={`text-xl ${getTextColors('body')} max-w-3xl mx-auto`}>
            Real feedback from clients who've used LawBuddy to navigate their legal challenges successfully.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard 
              key={index}
              quote={testimonial.quote}
              name={testimonial.name}
              title={testimonial.title}
              location={testimonial.location}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default TestimonialsSection