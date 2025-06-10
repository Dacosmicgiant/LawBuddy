import { Colors, getTextColors } from '../../constants/Colors'

const FormattedAIResponse = ({ content }) => {
  // Parse and format the AI response content
  const formatContent = (text) => {
    // Pre-process the text to handle various markdown patterns
    let processedText = text
    
    // Handle quadruple asterisks first (****text****)
    processedText = processedText.replace(/\*{4}(.*?)\*{4}/g, '<strong class="font-bold text-amber-700">$1</strong>')
    
    // Handle triple asterisks (***text***)
    processedText = processedText.replace(/\*{3}(.*?)\*{3}/g, '<strong class="font-bold text-amber-700">$1</strong>')
    
    // Handle double asterisks (**text**)
    processedText = processedText.replace(/\*{2}(.*?)\*{2}/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    
    // Handle single asterisks for italic (*text*)
    processedText = processedText.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>')
    
    // Split content into sections and paragraphs
    const sections = processedText.split('\n\n').filter(section => section.trim())
    
    return sections.map((section, index) => {
      const trimmed = section.trim()
      
      // Handle different types of content
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
    // Clean up any remaining asterisks and extract the title
    const cleanText = text.replace(/<\/?strong[^>]*>/g, '').replace(/[*:]+/g, '').trim()
    
    // Determine icon based on content
    let icon = '📋'
    if (cleanText.toLowerCase().includes('legal') || cleanText.toLowerCase().includes('basis')) {
      icon = '⚖️'
    } else if (cleanText.toLowerCase().includes('police') || cleanText.toLowerCase().includes('stopped')) {
      icon = '🚓'
    } else if (cleanText.toLowerCase().includes('documents') || cleanText.toLowerCase().includes('papers')) {
      icon = '📄'
    } else if (cleanText.toLowerCase().includes('fine') || cleanText.toLowerCase().includes('penalty')) {
      icon = '💰'
    } else if (cleanText.toLowerCase().includes('what happens') || cleanText.toLowerCase().includes('consequences')) {
      icon = '⚠️'
    } else if (cleanText.toLowerCase().includes('what should') || cleanText.toLowerCase().includes('procedure')) {
      icon = '📋'
    }
    
    return (
      <div key={index} className={`mt-6 first:mt-0 p-4 ${Colors.background.secondary[50]} rounded-lg border-l-4 ${Colors.border.secondary[500]}`}>
        <h3 className={`font-bold ${getTextColors('heading')} text-lg flex items-center gap-2 mb-3`}>
          <span>{icon}</span>
          <span dangerouslySetInnerHTML={{ __html: cleanText }}></span>
        </h3>
      </div>
    )
  }

  const renderBulletList = (text, index) => {
    // Split by bullet points and clean up
    const lines = text.split(/\n?\s*[*•]\s+/).filter(line => line.trim())
    
    // The first item might be a header if it doesn't start with a bullet
    let headerText = ''
    let listItems = lines
    
    if (!text.trim().startsWith('*') && !text.trim().startsWith('•')) {
      headerText = lines[0]
      listItems = lines.slice(1)
    }
    
    return (
      <div key={index} className="mt-4">
        {headerText && (
          <div className="mb-3">
            <div dangerouslySetInnerHTML={{ __html: processInlineFormatting(headerText) }} />
          </div>
        )}
        <div className="space-y-3">
          {listItems.map((item, itemIndex) => {
            const cleanItem = item.trim()
            if (!cleanItem) return null
            
            return (
              <div key={itemIndex} className={`flex items-start gap-3 p-3 ${Colors.background.neutral[50]} rounded-lg`}>
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
    
    // Handle remaining asterisks
    processed = processed.replace(/\*{4}(.*?)\*{4}/g, '<strong class="font-bold text-amber-700">$1</strong>')
    processed = processed.replace(/\*{3}(.*?)\*{3}/g, '<strong class="font-bold text-amber-700">$1</strong>')
    processed = processed.replace(/\*{2}(.*?)\*{2}/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    processed = processed.replace(/\*([^*\n]+)\*/g, '<em class="italic text-gray-700">$1</em>')
    
    // Handle monetary amounts
    processed = processed.replace(/(₹[\d,]+)/g, '<span class="font-bold text-green-600 bg-green-50 px-2 py-1 rounded">$1</span>')
    
    // Handle section references
    processed = processed.replace(/(Section \d+)/g, '<span class="font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">$1</span>')
    
    return processed
  }

  const renderNumberedList = (text, index) => {
    const lines = text.split('\n').filter(line => line.trim())
    
    return (
      <div key={index} className="mt-4">
        <ol className="space-y-3">
          {lines.map((line, lineIndex) => {
            const match = line.match(/^(\d+)\.\s*(.*)/)
            if (match) {
              const [, number, content] = match
              return (
                <li key={lineIndex} className={`flex items-start gap-3 p-3 ${Colors.background.neutral[50]} rounded-lg`}>
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
              // Handle continuation lines
              return (
                <div key={lineIndex} className={`ml-9 ${getTextColors('body')} text-sm leading-relaxed`}>
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
      <div key={index} className={`mt-6 p-4 ${Colors.background.neutral[100]} border ${Colors.border.neutral[300]} rounded-lg`}>
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
    // Check if it's a greeting or introduction
    if (text.toLowerCase().includes('namaste') || text.toLowerCase().includes('lawbuddy here')) {
      const processedText = processInlineFormatting(text)
      return (
        <div key={index} className={`p-4 ${Colors.background.gradient.navyToGold} rounded-lg mb-4`}>
          <div 
            className={`${getTextColors('heading')} font-medium flex items-center gap-2`}
            dangerouslySetInnerHTML={{ __html: `<span>⚖️</span> ${processedText}` }}
          />
        </div>
      )
    }
    
    // Process for any formatting within regular paragraphs
    const processedText = processInlineFormatting(text)
    
    return (
      <div key={index} className="mt-4">
        <div 
          className={`${getTextColors('body')} leading-relaxed`}
          dangerouslySetInnerHTML={{ __html: processedText }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {formatContent(content)}
      
      {/* Legal Footer */}
      <div className={`mt-6 pt-4 border-t ${Colors.border.neutral[200]} flex items-center gap-2 text-xs ${getTextColors('muted')}`}>
        <span>⚖️</span>
        <span>LawBuddy AI • Based on Motor Vehicles Act, 1988 & amendments</span>
      </div>
    </div>
  )
}

export default FormattedAIResponse