// Frontend/src/components/chat/StreamingResponse.jsx
import { useState, useEffect, useRef } from 'react'
import { Colors, getTextColors } from '../../constants/Colors'

const StreamingResponse = ({ content, onComplete, isStreaming = true }) => {
  const [showCursor, setShowCursor] = useState(true)
  const containerRef = useRef(null)
  const contentEndRef = useRef(null)

  useEffect(() => {
    // Auto-scroll to keep up with streaming content
    if (contentEndRef.current && isStreaming) {
      contentEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [content, isStreaming])

  useEffect(() => {
    // Manage cursor visibility
    if (!isStreaming) {
      setShowCursor(false)
      onComplete && onComplete()
    } else {
      setShowCursor(true)
    }
  }, [isStreaming, onComplete])

  const formatContent = (text) => {
    if (!text) return []
    
    // Pre-process the text to handle various markdown patterns
    let processedText = text
    
    // Handle bold formatting
    processedText = processedText.replace(/\*{4}(.*?)\*{4}/g, '<strong class="font-bold text-amber-700 bg-amber-50 px-1 rounded">$1</strong>')
    processedText = processedText.replace(/\*{3}(.*?)\*{3}/g, '<strong class="font-bold text-amber-700">$1</strong>')
    processedText = processedText.replace(/\*{2}(.*?)\*{2}/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    
    // Handle italic formatting
    processedText = processedText.replace(/\*([^*\n]+)\*/g, '<em class="italic text-gray-700">$1</em>')
    
    // Split content into sections and paragraphs for better rendering
    const sections = processedText.split('\n\n').filter(section => section.trim())
    
    return sections.map((section, index) => {
      const trimmed = section.trim()
      
      // Determine content type and render accordingly
      if (trimmed.includes('<strong>') && (trimmed.includes('?') || trimmed.includes(':'))) {
        return renderSectionHeader(trimmed, index)
      } else if (trimmed.includes('* ') || trimmed.includes('•')) {
        return renderBulletList(trimmed, index)
      } else if (trimmed.match(/^\d+\./m)) {
        return renderNumberedList(trimmed, index)
      } else if (trimmed.toLowerCase().includes('disclaimer') || trimmed.toLowerCase().includes('important notes')) {
        return renderDisclaimer(trimmed, index)
      } else {
        return renderRegularParagraph(trimmed, index)
      }
    })
  }

  const renderSectionHeader = (text, index) => {
    const cleanText = text.replace(/<\/?strong[^>]*>/g, '').replace(/[*:]+/g, '').trim()
    
    let icon = '📋'
    const lowerText = cleanText.toLowerCase()
    if (lowerText.includes('legal') || lowerText.includes('basis')) {
      icon = '⚖️'
    } else if (lowerText.includes('police') || lowerText.includes('stopped')) {
      icon = '🚓'
    } else if (lowerText.includes('documents') || lowerText.includes('papers')) {
      icon = '📄'
    } else if (lowerText.includes('fine') || lowerText.includes('penalty')) {
      icon = '💰'
    } else if (lowerText.includes('what happens') || lowerText.includes('consequences')) {
      icon = '⚠️'
    } else if (lowerText.includes('procedure') || lowerText.includes('steps')) {
      icon = '📝'
    } else if (lowerText.includes('required') || lowerText.includes('documents')) {
      icon = '📋'
    }
    
    return (
      <div key={`header-${index}`} className={`mt-6 first:mt-0 p-4 ${Colors.background.secondary[50]} rounded-lg border-l-4 ${Colors.border.secondary[500]} animate-slideInLeft`}>
        <h3 className={`font-bold ${getTextColors('heading')} text-lg flex items-center gap-2 mb-3`}>
          <span className="text-xl">{icon}</span>
          <span dangerouslySetInnerHTML={{ __html: processInlineFormatting(cleanText) }}></span>
        </h3>
      </div>
    )
  }

  const renderBulletList = (text, index) => {
    const lines = text.split(/\n?\s*[*•]\s+/).filter(line => line.trim())
    
    let headerText = ''
    let listItems = lines
    
    if (!text.trim().startsWith('*') && !text.trim().startsWith('•')) {
      headerText = lines[0]
      listItems = lines.slice(1)
    }
    
    return (
      <div key={`bullets-${index}`} className="mt-4 animate-fadeInUp">
        {headerText && (
          <div className="mb-3">
            <div 
              className={`${getTextColors('heading')} font-medium`}
              dangerouslySetInnerHTML={{ __html: processInlineFormatting(headerText) }} 
            />
          </div>
        )}
        <div className="space-y-3">
          {listItems.map((item, itemIndex) => {
            const cleanItem = item.trim()
            if (!cleanItem) return null
            
            return (
              <div 
                key={`bullet-${itemIndex}`} 
                className={`flex items-start gap-3 p-3 ${Colors.background.neutral[50]} rounded-lg hover:bg-gray-100 transition-colors animate-slideInLeft`}
                style={{ animationDelay: `${itemIndex * 0.1}s` }}
              >
                <span className={`flex-shrink-0 w-2 h-2 ${Colors.background.secondary[600]} rounded-full mt-2`}></span>
                <div 
                  className={`${getTextColors('body')} leading-relaxed`}
                  dangerouslySetInnerHTML={{ __html: processInlineFormatting(cleanItem) }}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const processInlineFormatting = (text) => {
    let processed = text
    
    // Handle remaining formatting
    processed = processed.replace(/\*{4}(.*?)\*{4}/g, '<strong class="font-bold text-amber-700 bg-amber-50 px-1 rounded">$1</strong>')
    processed = processed.replace(/\*{3}(.*?)\*{3}/g, '<strong class="font-bold text-amber-700">$1</strong>')
    processed = processed.replace(/\*{2}(.*?)\*{2}/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    processed = processed.replace(/\*([^*\n]+)\*/g, '<em class="italic text-gray-700">$1</em>')
    
    // Handle monetary amounts
    processed = processed.replace(/(₹[\d,]+)/g, '<span class="font-bold text-green-600 bg-green-50 px-2 py-1 rounded shadow-sm">$1</span>')
    
    // Handle section references
    processed = processed.replace(/(Section \d+[A-Z]*)/g, '<span class="font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm border border-blue-200">$1</span>')
    
    // Handle legal terms
    processed = processed.replace(/\b(Motor Vehicles Act|Traffic Police|RTO|License|Registration|Insurance)\b/g, '<span class="font-medium text-purple-600 bg-purple-50 px-1 rounded">$1</span>')
    
    return processed
  }

  const renderNumberedList = (text, index) => {
    const lines = text.split('\n').filter(line => line.trim())
    
    return (
      <div key={`numbered-${index}`} className="mt-4 animate-fadeInUp">
        <ol className="space-y-3">
          {lines.map((line, lineIndex) => {
            const match = line.match(/^(\d+)\.\s*(.*)/)
            if (match) {
              const [, number, content] = match
              return (
                <li 
                  key={`number-${lineIndex}`} 
                  className={`flex items-start gap-3 p-3 ${Colors.background.neutral[50]} rounded-lg hover:bg-gray-100 transition-colors animate-slideInLeft`}
                  style={{ animationDelay: `${lineIndex * 0.1}s` }}
                >
                  <span className={`flex-shrink-0 w-6 h-6 ${Colors.background.primary[600]} ${Colors.text.white} rounded-full flex items-center justify-center text-xs font-bold`}>
                    {number}
                  </span>
                  <div 
                    className={`${getTextColors('body')} font-medium leading-relaxed`}
                    dangerouslySetInnerHTML={{ __html: processInlineFormatting(content) }}
                  />
                </li>
              )
            } else if (line.trim() && !line.match(/^\d+\./)) {
              return (
                <div key={`continuation-${lineIndex}`} className={`ml-9 ${getTextColors('body')} text-sm leading-relaxed pl-3`}>
                  <div dangerouslySetInnerHTML={{ __html: processInlineFormatting(line.trim()) }} />
                </div>
              )
            }
            return null
          })}
        </ol>
      </div>
    )
  }

  const renderDisclaimer = (text, index) => {
    const cleanText = processInlineFormatting(text)
    
    return (
      <div key={`disclaimer-${index}`} className={`mt-6 p-4 ${Colors.background.neutral[100]} border-l-4 border-orange-400 rounded-lg animate-fadeInScale`}>
        <div className="flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div 
              className={`${getTextColors('muted')} text-sm font-medium leading-relaxed`}
              dangerouslySetInnerHTML={{ __html: cleanText }}
            />
          </div>
        </div>
      </div>
    )
  }

  const renderRegularParagraph = (text, index) => {
    // Special handling for greeting
    if (text.toLowerCase().includes('namaste') || text.toLowerCase().includes('lawbuddy here')) {
      const processedText = processInlineFormatting(text)
      return (
        <div key={`greeting-${index}`} className={`p-4 ${Colors.background.gradient.navyToGold} rounded-lg mb-4 animate-fadeInScale border border-amber-200`}>
          <div 
            className={`${getTextColors('heading')} font-medium flex items-center gap-2`}
            dangerouslySetInnerHTML={{ __html: `<span class="text-xl">⚖️</span> ${processedText}` }}
          />
        </div>
      )
    }
    
    const processedText = processInlineFormatting(text)
    
    return (
      <div key={`paragraph-${index}`} className="mt-4 animate-fadeInUp">
        <div 
          className={`${getTextColors('body')} leading-relaxed`}
          dangerouslySetInnerHTML={{ __html: processedText }}
        />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="space-y-2 relative">
      {/* Real-time content rendering */}
      {formatContent(content)}
      
      {/* Typing cursor - shows during active streaming */}
      {isStreaming && showCursor && content && (
        <span className={`inline-block w-2 h-5 ${Colors.background.primary[600]} ml-1 align-text-bottom animate-blink`} />
      )}
      
      {/* Content end marker for auto-scrolling */}
      <div ref={contentEndRef} />
      
      {/* Legal Footer - only show when streaming is complete */}
      {!isStreaming && content && (
        <div className={`mt-6 pt-4 border-t ${Colors.border.neutral[200]} flex items-center gap-2 text-xs ${getTextColors('muted')} animate-fadeInUp`}>
          <span>⚖️</span>
          <span>LawBuddy AI • Based on Motor Vehicles Act, 1988 & amendments</span>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-15px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
        }

        .animate-fadeInScale {
          animation: fadeInScale 0.4s ease-out forwards;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.4s ease-out forwards;
        }

        .animate-blink {
          animation: blink 1s infinite;
        }

        /* Smooth hover effects */
        .hover\\:bg-gray-100:hover {
          background-color: #f3f4f6;
          transition: background-color 0.2s ease;
        }

        /* Enhanced visual hierarchy */
        strong {
          position: relative;
        }

        /* Responsive design */
        @media (max-width: 640px) {
          .space-y-3 > * + * {
            margin-top: 0.5rem;
          }
          
          .p-4 {
            padding: 0.75rem;
          }
          
          .gap-3 {
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  )
}

export default StreamingResponse