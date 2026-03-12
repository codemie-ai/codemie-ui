// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

const FILE_EXTENSIONS = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'cs',
  php: 'php',
  ruby: 'rb',
  go: 'go',
  rust: 'rs',
  swift: 'swift',
  kotlin: 'kt',
  scala: 'scala',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yml',
  markdown: 'md',
  sql: 'sql',
  bash: 'sh',
  shell: 'sh',
  powershell: 'ps1',
  dockerfile: 'dockerfile',
  vue: 'vue',
  jsx: 'jsx',
  tsx: 'tsx',
  r: 'r',
  matlab: 'm',
  perl: 'pl',
  lua: 'lua',
  dart: 'dart',
  elixir: 'ex',
  erlang: 'erl',
  haskell: 'hs',
  clojure: 'clj',
  groovy: 'groovy',
  vb: 'vb',
  fsharp: 'fs',
  ocaml: 'ml',
  racket: 'rkt',
  scheme: 'scm',
  lisp: 'lisp',
  elm: 'elm',
  nim: 'nim',
  crystal: 'cr',
  julia: 'jl',
  d: 'd',
  zig: 'zig',
  assembly: 'asm',
  fortran: 'f90',
  cobol: 'cob',
  pascal: 'pas',
  ada: 'ada',
  vhdl: 'vhd',
  verilog: 'v',
  prolog: 'pl',
  makefile: 'makefile',
  cmake: 'cmake',
  gradle: 'gradle',
  maven: 'xml',
  toml: 'toml',
  ini: 'ini',
  conf: 'conf',
  properties: 'properties',
  env: 'env',
  gitignore: 'gitignore',
  htaccess: 'htaccess',
  apache: 'conf',
  nginx: 'conf',
  tex: 'tex',
  latex: 'tex',
  bibtex: 'bib',
  graphql: 'graphql',
  solidity: 'sol',
  vyper: 'vy',
  move: 'move',
  cairo: 'cairo',
  stylus: 'styl',
  pug: 'pug',
  jade: 'jade',
  haml: 'haml',
  slim: 'slim',
  twig: 'twig',
  smarty: 'tpl',
  mustache: 'mustache',
  handlebars: 'hbs',
  liquid: 'liquid',
  erb: 'erb',
  asp: 'asp',
  jsp: 'jsp',
  razor: 'cshtml',
  blade: 'blade.php',
  laravel: 'blade.php',
  django: 'html',
  jinja: 'html',
  mako: 'html',
  velocity: 'vm',
  freemarker: 'ftl',
  txt: 'txt',
  mermaid: 'mermaid',
} as const

export type FileExtension = (typeof FILE_EXTENSIONS)[keyof typeof FILE_EXTENSIONS]

export const getFileExtension = (language: FileExtension): FileExtension => {
  return FILE_EXTENSIONS[language?.toLowerCase()] ?? 'txt'
}

export const downloadCodeAsFile = (code: string, language: FileExtension, filename = 'code') => {
  const extension = getFileExtension(language)
  const fileName = `${filename}.${extension}`

  const blob = new Blob([code], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return fileName
}
