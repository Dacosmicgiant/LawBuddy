// Color constants for LawBuddy application - Legal/Justice themed colors
// This file centralizes all color definitions for easy maintenance and consistency

export const Colors = {
  // Primary brand colors - Navy Blue (Justice, Authority, Trust)
  primary: {
    50: 'bg-slate-50',
    100: 'bg-slate-100',
    600: 'bg-slate-800', // Deep Navy
    700: 'bg-slate-900', // Darker Navy
    800: 'bg-slate-900',
  },

  // Secondary colors - Gold (Justice, Wisdom, Prestige)
  secondary: {
    50: 'bg-amber-50',
    100: 'bg-amber-100',
    400: 'bg-amber-400',
    500: 'bg-amber-500',
    600: 'bg-amber-600',
  },

  // Text colors
  text: {
    primary: {
      50: 'text-slate-50',
      100: 'text-slate-100',
      200: 'text-slate-200',
      600: 'text-slate-800',
      700: 'text-slate-900',
    },
    secondary: {
      400: 'text-amber-400',
      500: 'text-amber-500',
      600: 'text-amber-600',
      700: 'text-amber-700',
    },
    gray: {
      400: 'text-gray-400',
      500: 'text-gray-500',
      600: 'text-gray-600',
      700: 'text-gray-700',
      800: 'text-gray-800',
      900: 'text-gray-900',
    },
    white: 'text-white',
    cream: 'text-stone-100',
  },

  // Background colors
  background: {
    primary: {
      50: 'bg-slate-50',
      100: 'bg-slate-100',
      600: 'bg-slate-800',
      700: 'bg-slate-900',
      800: 'bg-slate-900',
    },
    secondary: {
      50: 'bg-amber-50',
      100: 'bg-amber-100',
      500: 'bg-amber-500',
      600: 'bg-amber-600',
    },
    neutral: {
      50: 'bg-stone-50',
      100: 'bg-stone-100',
      800: 'bg-stone-800',
      900: 'bg-stone-900',
    },
    white: 'bg-white',
    cream: 'bg-stone-50',
    gradient: {
      navyToGold: 'bg-gradient-to-br from-slate-50 to-amber-50',
      darkNavy: 'bg-gradient-to-br from-slate-800 to-slate-900',
    },
  },

  // Border colors
  border: {
    primary: {
      600: 'border-slate-800',
      700: 'border-slate-900',
    },
    secondary: {
      500: 'border-amber-500',
      600: 'border-amber-600',
    },
    neutral: {
      200: 'border-stone-200',
      300: 'border-stone-300',
      800: 'border-stone-800',
    },
  },

  // Hover states
  hover: {
    primary: {
      600: 'hover:bg-slate-800',
      700: 'hover:bg-slate-900',
    },
    secondary: {
      500: 'hover:bg-amber-500',
      600: 'hover:bg-amber-600',
    },
    text: {
      primary: 'hover:text-slate-800',
      secondary: 'hover:text-amber-600',
      white: 'hover:text-white',
    },
    background: {
      primary: 'hover:bg-slate-200',
      secondary: 'hover:bg-amber-200',
      neutral: 'hover:bg-stone-100',
    },
  },

  // Utility colors for special elements
  utility: {
    shadow: 'shadow-lg',
    shadowXl: 'shadow-xl',
    ring: 'ring-amber-500',
    accent: {
      gold: 'text-amber-500',
      stars: 'text-amber-400',
    },
  },
};

// Helper functions to get color combinations
export const getButtonColors = (variant = 'primary') => {
  switch (variant) {
    case 'primary':
      return `${Colors.background.primary[600]} ${Colors.text.white} ${Colors.hover.primary[700]}`;
    case 'secondary':
      return `${Colors.border.secondary[600]} border-2 ${Colors.text.secondary[600]} ${Colors.hover.secondary[600]} ${Colors.hover.text.white}`;
    case 'gold':
      return `${Colors.background.secondary[600]} ${Colors.text.white} ${Colors.hover.secondary[500]}`;
    case 'outline':
      return `${Colors.border.primary[600]} border-2 ${Colors.text.primary[600]} ${Colors.hover.primary[600]} ${Colors.hover.text.white}`;
    case 'white':
      return `${Colors.background.white} ${Colors.text.primary[600]} ${Colors.hover.background.neutral}`;
    default:
      return `${Colors.background.primary[600]} ${Colors.text.white} ${Colors.hover.primary[700]}`;
  }
};

export const getCardColors = () => {
  return `${Colors.background.white} ${Colors.utility.shadow}`;
};

export const getTextColors = (variant = 'body') => {
  switch (variant) {
    case 'heading':
      return Colors.text.gray[900];
    case 'body':
      return Colors.text.gray[600];
    case 'muted':
      return Colors.text.gray[500];
    case 'primary':
      return Colors.text.primary[600];
    case 'secondary':
      return Colors.text.secondary[600];
    case 'accent':
      return Colors.text.secondary[500];
    default:
      return Colors.text.gray[600];
  }
};