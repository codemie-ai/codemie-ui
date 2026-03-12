/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />
/// <reference types="vite-plugin-svgr/client" />

// extend primereact multiselect types
import 'primereact/multiselect'

declare module 'primereact/multiselect' {
  export interface MultiSelectContext {
    disabled: boolean
    focused: boolean
    focusedIndex: number
    index: number
    selected: boolean
  }
}
