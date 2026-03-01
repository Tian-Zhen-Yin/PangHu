/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 品牌主色 - 猫咪橙
        primary: {
          DEFAULT: '#F6B26B',
          hover: '#F3A14E',
          press: '#E5903A',
          light: '#FFCC9A',
          soft: '#FFF4E5',
          bg: '#FFE8CC',
        },
        // 辅助色 - 点缀粉
        secondary: {
          DEFAULT: '#F8C8DC',
          light: '#FFD6E8',
          dark: '#E8B0CC',
          soft: '#FFF0F6',
        },
        // 强调色 - 健康绿
        accent: {
          DEFAULT: '#9ED5B8',
          light: '#B8E5CD',
          dark: '#7BC99F',
          soft: '#EAF7F0',
        },
        // 背景色 - 奶油风
        bg: {
          page: '#FAF8F5',
          DEFAULT: '#FAF8F5',
          alt: '#F5F2ED',
          muted: '#EFECE7',
          soft: '#F7F3EE',
          card: '#FFFFFF',
        },
        // 文字色
        text: {
          main: '#5A4A42',
          secondary: '#9B8C7C',
          sub: '#9A8E88',
          light: '#BFB5B0',
          muted: '#DAD4D0',
        },
        // 边框色
        border: {
          light: '#F0ECE6',
          DEFAULT: '#EBE7E3',
          normal: '#E6DFD7',
        },
        // 状态色
        success: {
          DEFAULT: '#9ED5B8',
          soft: '#EAF7F0',
          light: '#B8E5CD',
        },
        warning: {
          DEFAULT: '#F9C97C',
          light: '#FFCC9A',
        },
        error: {
          DEFAULT: '#F28B82',
          light: '#FFD6E8',
        },
      },
      borderRadius: {
        xs: '8px',
        sm: '16px',
        md: '20px',
        lg: '24px',
        xl: '28px',
        '2xl': '32px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '40px',
        '4xl': '56px',
      },
      boxShadow: {
        xs: '0 2px 6px rgba(90, 74, 66, 0.04)',
        sm: '0 4px 12px rgba(90, 74, 66, 0.06)',
        md: '0 8px 24px rgba(90, 74, 66, 0.08)',
        lg: '0 16px 48px rgba(246, 178, 107, 0.15)',
        'warm-xs': '0 2px 6px rgba(246, 178, 107, 0.08)',
        'warm-sm': '0 4px 12px rgba(246, 178, 107, 0.12)',
        'warm-md': '0 8px 24px rgba(246, 178, 107, 0.15)',
        'warm-lg': '0 16px 48px rgba(246, 178, 107, 0.2)',
      },
      fontFamily: {
        base: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'PingFang SC', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },
    },
  },
  plugins: [],
}

