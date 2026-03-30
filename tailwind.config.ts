import { generateThemes } from './src/utils/themeHelpers'

const c = {
  'full-transparent': '#FFFFFF00',
  black: {
    DEFAULT: '#000000',
    a0: '#00000000',
    a10: '#0000001A',
    a20: '#00000033',
    a30: '#0000004D',
    a40: '#00000066',
    a50: '#00000080',
    a60: '#00000099',
    a70: '#000000B3',
    a80: '#000000CC',
    a90: '#000000E6',
    a100: '#000000',
  },
  blue: {
    '25': '#F1F8FF',
    '50': '#D5E7FC',
    '100': '#B2D7FF',
    '150': '#8DABDF',
    '200': '#06B6D4',
    '300': '#2297F6',
    '400': '#007AFF',
    '500': '#4E32FF',
    '550': '#0C4DAF',
    '600': '#003A69',
    '800': '#002442',
    a0: '#2297F600',
    a10: '#2297F61A',
    a15: '#2297F626',
    a20: '#2297F633',
    a30: '#2297F64D',
    a40: '#2297F666',
    a70: '#2297F6B3',
  },
  brand: {
    a: '#91C75B',
    a1: '#993EC7',
    a3: '#C923F2',
    a99: '#672D92',
    b: '#5BB3C7',
    b1: '#5677C8',
    b3: '#3974F6',
    b4: '#4E32FF',
    'bg-1': '#9E00FF',
    'bg-2': '#EC56FF',
    q1: '#20222E',
    q2: '#262941',
  },
  green: {
    '25': '#FAFBFC',
    '40': '#DFFAFF',
    '50': '#E6F7E6',
    '100': '#CFF2CF',
    '150': '#A1DFA2',
    '400': '#22F625',
    '500': '#259F4C',
    '600': '#005866',
    '700': '#003942',
    '800': '#1E4B2D',
    '850': '#243428',
    '900': '#1B271F',
    '1000': '#212624',
    a0: '#259F4C00',
    a10: '#259F4C1A',
    a30: '#259F4C4D',
  },
  neutral: {
    '0': '#FFFFFF',
    '5': '#F9F9F9',
    '10': '#FAFAFC',
    '25': '#FBFBFB',
    '50': '#F2F0EF',
    '75': '#EEEEEE',
    '90': '#E5E5E5',
    '100': '#DDDDDD',
    '200': '#CCCCCC',
    '300': '#BBBBBB',
    '400': '#AAAAAA',
    '450': '#A0A0A0',
    '475': '#999999',
    '500': '#909090',
    '525': '#888888',
    '575': '#7A7A7C',
    '600': '#707070',
    '650': '#666666',
    '675': '#47484A',
    '675-a70': '#47484AB3',
    '700': '#4C4C4C',
    '710': '#444444',
    '725': '#333436',
    '750': '#2E3033',
    '775': '#333333',
    '775-a40': '#33333366',
    '800': '#2E2E2E',
    '825': '#2A2B2D',
    '850': '#232323',
    '875': '#212224',
    '900': '#1C1C1C',
    '925': '#1A1A1A',
    '950': '#151515',
    '1000': '#000000',
  },
  purple: {
    'accent-1': '#9E00FF',
    'accent-2': '#EC56FF',
    'accent-3': '#200E32',
    'accent-4': '#C5A9FA',
    'accent-5': '#AC94D9',
    'accent-6': '#2C2131',
    'accent-7': '#AC60D5',
    '0': '#F3E8FF',
    '300': '#C5A9FA',
    '350': '#C084FC',
    '400': '#8B5CF6',
    '450': '#A78BFA',
    '550': '#AC60D5',
    '700': '#F3E8FF',
    '850': '#2D1B3D',
    '900': '#2C2131',
  },
  red: {
    '25': '#FAF8F8',
    '50': '#F0E2E3',
    '75': '#FFE5E7',
    '100': '#FFDBE0',
    '150': '#FFB2B8',
    '300': '#F0524F',
    '400': '#FF4242',
    '450': '#FE3B4C',
    '500': '#F9303C',
    '650': '#D92F40',
    '675': '#6E282D',
    '750': '#3D2A29',
    '900': '#2F201F',
    '1000': '#262121',
    a0: '#F0524F00',
    a30: '#F0524F4D',
  },
  white: {
    DEFAULT: '#FFFFFF',
    a0: '#FFFFFF00',
    a6: '#FFFFFF0F',
    a10: '#FFFFFF1A',
    a20: '#FFFFFF33',
    a30: '#FFFFFF4D',
    a40: '#FFFFFF66',
    a50: '#FFFFFF80',
    a60: '#FFFFFF99',
    a70: '#FFFFFFB3',
    a80: '#FFFFFFCC',
    a90: '#FFFFFFE6',
    a100: '#FFFFFF',
  },
  yellow: {
    '50': '#FAF2E7',
    '200': '#FFE299',
    '500': '#F5A534',
    '600': '#663B00',
    '800': '#492B00',
    'yellow-text': '#F5A534',
    a0: '#F5A53400',
    a30: '#F5A5344D',
  },
  avatar: {
    '0': '#AA47BC',
    '1': '#7A1FA2',
    '2': '#6B8592',
    '3': '#465A65',
    '4': '#EC407A',
    '5': '#C2175B',
    '6': '#5C6BC0',
    '7': '#0288D1',
    '8': '#00579C',
    '9': '#0098A6',
    '10': '#00887A',
    '11': '#004C3F',
    '12': '#689F39',
    '13': '#33691E',
    '14': '#8C6E63',
    '15': '#5D4038',
    '16': '#7E57C2',
    '17': '#512DA7',
    '18': '#EF6C00',
    '19': '#F5511E',
    '20': '#AA3410',
  },
} as const

type ExtractTokens<T> = T extends string ? T : T extends object ? ExtractTokens<T[keyof T]> : never
type ValidToken = ExtractTokens<typeof c>
type ThemeConfig = {
  [key: string]: ValidToken | [ValidToken, ValidToken] | ThemeConfig
}

const themeTokens: ThemeConfig = {
  surface: {
    elevated: [c['neutral']['800'], c['neutral']['0']],
    interactive: {
      active: [c['neutral']['925'], c['blue']['50']],
      hover: [c['neutral']['875'], c['blue']['50']],
    },
    base: {
      none: [c['full-transparent'], c['full-transparent']],
      primary: [c['neutral']['925'], c['neutral']['5']],
      secondary: [c['neutral']['875'], c['neutral']['0']],
      tertiary: [c['neutral']['750'], c['neutral']['25']],
      quateary: [c['neutral']['725'], c['blue']['100']],
      float: [c['neutral']['850'], c['neutral']['50']],
      navigation: [c['neutral']['1000'], c['neutral']['25']],
      content: [c['neutral']['925'], c['neutral']['0']],
      chat: [c['neutral']['900'], c['neutral']['0']],
      sidebar: [c['neutral']['950'], c['neutral']['25']],
      dropzone: [c['neutral']['775'], c['neutral']['50']],
      'dropzone-hover': [c['neutral']['710'], c['blue']['50']],
    },
    specific: {
      'node-note-bg': [c['yellow']['200'], c['yellow']['200']],
      card: [c['neutral']['950'], c['neutral']['0']],
      cta: {
        button: [c['brand']['q1'], c['blue']['50']],
        'button-hover': [c['brand']['q2'], c['blue']['100']],
      },
      'pagination-active': [c['neutral']['875'], c['blue']['50']],
      'primary-button': [c['brand']['q1'], c['blue']['50']],
      'primary-button-hover': [c['brand']['q2'], c['blue']['100']],
      'secondary-button-hover': [c['neutral']['725'], c['blue']['25']],
      button: {
        secondary: {
          DEFAULT: [c['neutral']['875'], c['blue']['50']],
          'hover-from': [c['brand']['a99'], c['blue']['100']],
          'hover-to': [c['brand']['b1'], c['blue']['100']],
        },
        tertiary: {
          from: [c['brand']['a99'], c['brand']['b3']],
          to: [c['brand']['b1'], c['brand']['a3']],
        },
        service: {
          hover: [c['neutral']['825'], c['neutral']['25']],
        },
      },
      diff: {
        'linenumber-remove': [c['red']['750'], c['red']['100']],
        'linebg-remove': [c['red']['900'], c['red']['75']],
        'highlight-remove': [c['red']['675'], c['red']['150']],
        'emptyline-remove': [c['red']['1000'], c['red']['25']],
        'linenumber-add': [c['green']['850'], c['green']['100']],
        'linebg-add': [c['green']['900'], c['green']['50']],
        'highlight-add': [c['green']['800'], c['green']['150']],
        'emptyline-add': [c['green']['1000'], c['green']['25']],
      },
      charts: {
        blue: c['blue']['300'],
        purple: [c['purple']['350'], c['purple']['400']],
        cyan: c['blue']['200'],
        red: c['red']['450'],
        yellow: c['yellow']['500'],
        green: c['green']['500'],
        tooltip: {
          background: c['neutral']['900'],
          body: c['neutral']['100'],
        },
        bar: {
          background: c['blue']['200'],
          grid: c['white']['a10'],
        },
      },
      'dropdown-hover': [c['neutral']['725'], c['blue']['50']],
      switcher: {
        active: {
          from: [c['brand']['a99'], c['blue']['400']],
          to: [c['brand']['b1'], c['blue']['400']],
        },
        passive: {
          from: [c['neutral']['300'], c['white']['a100']],
          to: [c['neutral']['650'], c['white']['a100']],
        },
      },
      circle: {
        active: [c['white']['a100'], c['white']['a100']],
        passive: [c['white']['a100'], c['neutral']['400']],
      },
      table: {
        header: [c['neutral']['725'], c['neutral']['25']],
      },
      input: {
        prefix: [c['neutral']['725'], c['neutral']['75']],
        accent: [c['purple']['accent-6'], c['purple']['accent-4']],
      },
      category: {
        secondary: [c['neutral']['925'], c['blue']['50']],
      },
      'toggle-button-hover': [c['neutral']['725'], c['full-transparent']],
    },
  },
  border: {
    accent: [c['neutral']['0'], c['blue']['400']],
    primary: [c['neutral']['725'], c['neutral']['200']],
    secondary: [c['neutral']['675'], c['neutral']['300']],
    tertiary: [c['neutral']['300'], c['blue']['400']],
    quaternary: [c['neutral']['725'], c['blue']['400']],
    subtle: [c['neutral']['700'], c['neutral']['475']],
    structural: [c['neutral']['725'], c['neutral']['90']],
    focus: [c['neutral']['0'], c['neutral']['1000']],
    error: [c['red']['500'], c['red']['500']],
    'error-hover': [c['red']['500'], c['red']['500']],
    specific: {
      dropzone: [c['neutral']['525'], c['neutral']['400']],
      'icon-outline': [c['neutral']['725'], c['blue']['50']],
      sidebar: [c['neutral']['90'], c['black']['a10']],
      'panel-outline': [c['neutral']['725'], c['neutral']['90']],
      'assistant-avatar': [c['neutral']['300'], c['blue']['50']],
      'primary-button-from': [c['brand']['a1'], c['blue']['400']],
      'primary-button-to': [c['brand']['b1'], c['blue']['400']],
      'accent-chat': [c['purple']['300'], c['blue']['150']],
      'input-prefix': [c['full-transparent'], c['neutral']['775']],
      chat: {
        'gradient-from': [c['neutral']['450'], c['neutral']['100']],
        'gradient-to': [c['neutral']['925'], c['neutral']['75']],
      },
      button: {
        tertiary: [c['neutral']['0'], c['full-transparent']],
        secondary: [c['neutral']['725'], c['full-transparent']],
        'secondary-hover': [c['full-transparent'], c['blue']['400']],
        service: [c['full-transparent'], c['neutral']['200']],
      },
      'cta-button': {
        from: [c['brand']['a1'], c['blue']['400']],
        to: [c['brand']['b1'], c['blue']['400']],
      },
      switcher: {
        passive: [c['white']['a20'], c['neutral']['200']],
        active: [c['white']['a20'], c['full-transparent']],
      },
      interactive: {
        outline: [c['neutral']['675'], c['neutral']['200']],
      },
      node: {
        border: [c['neutral']['525'], c['neutral']['525']],
        'border-focus': [c['neutral']['525'], c['blue']['400']],
        'border-iter': [c['neutral']['200'], c['neutral']['950']],
        'border-iter-focus': [c['blue']['150'], c['blue']['400']],
        edge: [c['blue']['150'], c['blue']['400']],
        'edge-selected': [c['neutral']['200'], c['neutral']['950']],
      },
      charts: {
        bar: {
          border: c['white']['a50'],
        },
      },
    },
  },
  text: {
    primary: [c['neutral']['0'], c['neutral']['775']],
    inverse: [c['neutral']['0'], c['neutral']['0']],
    accent: {
      DEFAULT: [c['neutral']['50'], c['blue']['400']],
      hover: [c['neutral']['50'], c['blue']['550']],
      status: [c['purple']['accent-4'], c['blue']['400']],
      'status-hover': [c['purple']['accent-5'], c['blue']['500']],
    },
    secondary: [c['neutral']['50'], c['neutral']['775']],
    tertiary: [c['neutral']['200'], c['neutral']['775']],
    quaternary: [c['neutral']['300'], c['neutral']['650']],
    heading: [c['neutral']['300'], c['blue']['400']],
    info: [c['neutral']['300'], c['neutral']['700']],
    error: [c['red']['500'], c['red']['500']],
    'error-hover': [c['red']['650'], c['red']['650']],
    specific: {
      'navigation-label': [c['neutral']['200'], c['neutral']['0']],
      'node-note-text': c['neutral']['775'],
      input: {
        prefix: [c['neutral']['725'], c['neutral']['75']],
        accent: [c['purple']['accent-7'], c['purple']['accent-6']],
        placeholder: [c['neutral']['200'], c['neutral']['475']],
      },
      'cta-button': {
        default: [c['brand']['q1'], c['blue']['50']],
        hover: [c['brand']['q2'], c['blue']['100']],
      },
      charts: {
        tooltip: {
          title: c['white']['a100'],
        },
      },
    },
  },
  icon: {
    primary: {
      DEFAULT: [c['neutral']['0'], c['neutral']['675']],
      a70: [c['white']['a70'], c['neutral']['675-a70']],
    },
    inverse: {
      DEFAULT: [c['neutral']['0'], c['neutral']['0']],
      a70: [c['white']['a70'], c['white']['a70']],
    },
    accent: {
      DEFAULT: [c['neutral']['0'], c['blue']['400']],
      hover: [c['neutral']['0'], c['blue']['550']],
      a70: [c['white']['a70'], c['blue']['a70']],
      a40: [c['white']['a40'], c['blue']['a40']],
    },
    secondary: [c['neutral']['200'], c['neutral']['775']],
    tertiary: [c['neutral']['475'], c['neutral']['600']],
    specific: {
      radio: [c['neutral']['300'], c['neutral']['775']],
    },
    error: {
      DEFAULT: [c['red']['500'], c['red']['500']],
      hover: [c['red']['650'], c['red']['650']],
    },
  },
  'in-progress': {
    primary: [c['blue']['300'], c['blue']['300']],
    secondary: [c['blue']['600'], c['blue']['300']],
    tertiary: [c['blue']['800'], c['blue']['50']],
  },
  'not-started': {
    primary: [c['neutral']['450'], c['neutral']['450']],
    secondary: [c['neutral']['700'], c['neutral']['450']],
    tertiary: [c['neutral']['775'], c['neutral']['75']],
  },
  interrupted: {
    primary: [c['blue']['200'], c['blue']['200']],
    secondary: [c['green']['600'], c['blue']['200']],
    tertiary: [c['green']['700'], '#DFFAFF'],
  },
  success: {
    primary: [c['green']['500'], c['green']['500']],
    secondary: [c['green']['1000'], '#E6F7E6'],
  },
  failed: {
    primary: [c['red']['300'], c['red']['450']],
    secondary: [c['red']['450'], c['red']['450']],
    tertiary: [c['red']['1000'], c['red']['50']],
  },
  aborted: {
    primary: [c['yellow']['500'], c['yellow']['500']],
    secondary: [c['yellow']['600'], c['yellow']['500']],
    tertiary: [c['yellow']['800'], '#FAF2E7'],
  },
  advanced: {
    primary: [c['purple']['700'], c['purple']['450']],
    secondary: [c['purple']['350'], c['purple']['400']],
    tertiary: [c['purple']['850'], c['purple']['0']],
  },
  avatar: {
    '0': c['avatar']['0'],
    '1': c['avatar']['1'],
    '2': c['avatar']['2'],
    '3': c['avatar']['3'],
    '4': c['avatar']['4'],
    '5': c['avatar']['5'],
    '6': c['avatar']['6'],
    '7': c['avatar']['7'],
    '8': c['avatar']['8'],
    '9': c['avatar']['9'],
    '10': c['avatar']['10'],
    '11': c['avatar']['11'],
    '12': c['avatar']['12'],
    '13': c['avatar']['13'],
    '14': c['avatar']['14'],
    '15': c['avatar']['15'],
    '16': c['avatar']['16'],
    '17': c['avatar']['17'],
    '18': c['avatar']['18'],
    '19': c['avatar']['19'],
    '20': c['avatar']['20'],
  },
}

const themes = generateThemes(themeTokens)

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: ['variant', '.nottused * &'],
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite linear',
      },
      zIndex: {
        60: '60',
      },
      fontFamily: {
        geist: ['Geist', 'Arial', 'Helvetica', 'sans-serif'],
        'geist-mono': ['GeistMono', 'monospace'],
      },
      fontSize: {
        'xs-1': '.625rem',
        'sm-1': '.813rem',
        h1: ['32px', { lineHeight: '32px' }],
        h2: ['24px', { lineHeight: '24px' }],
        h3: ['16px', { lineHeight: '21px' }],
        h4: ['14px', { lineHeight: '18px' }],
        h5: ['12px', { lineHeight: '16px' }],
      },
      fontWeight: {
        'text-2xl': '600',
      },
      borderWidth: {
        1: '1px',
      },
      transitionProperty: {
        width: 'width',
      },
      boxShadow: {
        sidebar: '-1px 0 0 0 rgba(255,255,255,0.1)',
      },
      spacing: {
        'sidebar-collapsed': '380px', // 72px + 309ox
        'sidebar-expanded': '505px', // 196px + 309px
        'workflow-exec-sidebar': '308px',
        navbar: '72px',
        'navbar-expanded': '196px',
        sidebar: '308px',
      },
      maxWidth: {
        'chat-content': '64rem',
      },
      height: {
        card: '158px',
        'layout-header': '56px',
      },
      minHeight: {
        'layout-header': '56px',
      },
      screens: {
        'card-grid-2': '1300px',
        'card-grid-3': '1600px',
        'view-details-bp': '1200px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
    function ({ addBase }: { addBase: (params: object) => void }) {
      addBase({
        ':root': {
          '--switch-container-width': '32px',
          '--switch-size': 'calc(var(--switch-container-width) / 2)',
        },
        '.bg-button-primary-bg': {
          background:
            'linear-gradient(rgb(var(--colors-surface-specific-primary-button)), rgb(var(--colors-surface-specific-primary-button))) padding-box, linear-gradient(90deg, rgb(var(--colors-border-specific-cta-button-from)), rgb(var(--colors-border-specific-primary-button-to))) border-box',
          border: '1px solid transparent',
        },
        '.bg-button-primary-bg-hover': {
          background:
            'linear-gradient(rgb(var(--colors-surface-specific-primary-button-hover)), rgb(var(--colors-surface-specific-primary-button-hover))) padding-box, linear-gradient(90deg, rgb(var(--colors-border-specific-cta-button-from)), rgb(var(--colors-border-specific-primary-button-to))) border-box',
        },
        '.help-launcher-button': {
          background:
            'linear-gradient(rgb(var(--colors-surface-base-tertiary)), rgb(var(--colors-surface-base-tertiary))) padding-box, linear-gradient(92deg, rgb(var(--colors-surface-specific-button-tertiary-from)) 1.81%, rgb(var(--colors-surface-specific-button-tertiary-to)) 102.6%) border-box',
          border: '1.5px solid transparent',
          color: 'rgb(var(--colors-icon-primary))',
        },
        '.help-launcher-button:hover, .help-launcher-button:active, .help-launcher-button-active': {
          background:
            'linear-gradient(92deg, rgb(var(--colors-surface-specific-button-tertiary-from)) 1.81%, rgb(var(--colors-surface-specific-button-tertiary-to)) 102.6%)',
          border: '0',
          color: 'rgb(var(--colors-icon-inverse))',
        },
      })
    },
    require('tailwindcss-themer')({
      defaultTheme: {
        extend: {
          colors: {
            ...c,
            ...themes.dark,
          },
          backgroundImage: {
            gradient1:
              'linear-gradient(92deg, rgba(131, 87, 137, 0.30) 1.81%, rgba(87, 69, 119, 0.30) 102.6%)',
            gradient2: 'linear-gradient(152deg, #0078C2 8.13%, #0047FF 59.98%, #8453D2 91.87%)',
            gradient3: 'linear-gradient(152deg, #0078C2 8.13%, #0047FF 59.98%, #8453D2 91.87%)',
            gradient4: 'linear-gradient(90deg, #A950DC 0%, #5B2B76 100%)',
            'gradient-switch-off': 'linear-gradient(to right, #BBB, #666)',
            'gradient-switch-on': 'linear-gradient(to right, #672C92, #547CCC)',
            'magical-button': 'linear-gradient(90deg, #672D92 0%, #5677C8 100%);',
            'purple-radial':
              'radial-gradient(271.77% 163.1% at 50% -10.71%, #200E32 0%, #9E00FF 75.14%, #EC56FF 100%)',
            'purple-radial-hover': 'linear-gradient(90deg, #672D92 0%, #5677C8 100%);',
            'sidebar-gradient': 'linear-gradient(#00000033)',
            'menu-gradient': 'linear-gradient(#000000, #00000066)',
            'action-accent-btn': 'linear-gradient(#212224)',
            'action-accent-hover': 'var(--backgroundImage-purple-radial-hover)',
          },
          backdropBlur: {
            menu: '40px',
          },
          boxShadow: {
            block: '',
          },
          opacity: {
            'card-tag': '.3',
            'switch-border': '.3',
          },
        },
      },
      themes: [
        {
          name: 'codemieDark',
          extend: {},
        },
        {
          name: 'codemieLight',
          extend: {
            colors: {
              ...themes.light,
            },
            backgroundImage: {
              gradient1:
                'linear-gradient(92deg, rgba(103, 44, 146, 0.20) 1.81%, rgba(84, 124, 204, 0.20) 102.6%)',
              gradient2: 'linear-gradient(152deg, #0078C2 8.13%, #0047FF 59.98%, #8453D2 91.87%)',
              gradient3: 'linear-gradient(152deg, #0078C2 8.13%, #0047FF 59.98%, #8453D2 91.87%)',
              gradient4: 'linear-gradient(90deg, #A950DC 0%, #5B2B76 100%)',
              'gradient-switch-off': 'linear-gradient(to right, #fff, #fff)',
              'gradient-switch-on': 'linear-gradient(to right, #007AFF, #007AFF)',
              'purple-radial': 'radial-gradient(#007AFF)',
              'magical-button': 'linear-gradient(90deg, #3676f7 0%, #cc22f2 100%);',
              'sidebar-gradient': 'linear-gradient(#F8F8F8AA)',
              'purple-radial-hover': 'linear-gradient(#d9ebff)',
              'menu-gradient': 'linear-gradient()',
              'action-accent-btn': 'linear-gradient(rgba(0, 122, 255, 0.15))',
              'action-accent-hover': 'linear-gradient(rgba(0, 122, 255, 0.3))',
            },
            backdropBlur: {
              menu: '0',
            },
            boxShadow: {
              block: '0 1px 4px rgba(0, 0, 0, 0.06)',
              thought: '0 2px 4px 0 rgba(0, 0, 0, 0.06)',
              chatprompt: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
            },
            opacity: {
              'card-tag': '1',
              'switch-border': '1',
            },
          },
        },
      ],
    }),
  ],
}
