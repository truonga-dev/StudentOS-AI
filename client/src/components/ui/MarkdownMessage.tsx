import React, { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

interface MarkdownMessageProps {
  content: string
}

export const MarkdownMessage = memo(({ content }: MarkdownMessageProps) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words
        prose-p:leading-relaxed prose-p:my-2
        prose-pre:p-0 prose-pre:m-0 prose-pre:bg-transparent
        prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:bg-surface-100 dark:prose-code:bg-surface-800 prose-code:before:content-none prose-code:after:content-none
        prose-ul:my-2 prose-li:my-0.5
        prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4
        prose-a:text-primary-500 hover:prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline
      ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
      components={{
        p({ children, ...props }: any) {
          return (
            <p {...props}>
              {React.Children.map(children, child => {
                if (typeof child === 'string') {
                  const parts = child.split(/(@[A-ZÀ-ỹa-z0-9_][A-ZÀ-ỹa-z0-9_#\-\s]{0,30}(?=\s|$|[.,!?;]))/g)
                  return parts.map((part, i) => {
                    if (part.startsWith('@')) {
                      return (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold text-xs inline-block mx-0.5">
                          {part}
                        </span>
                      )
                    }
                    return part
                  })
                }
                return child
              })}
            </p>
          )
        },
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '')
          const language = match ? match[1] : ''
          const isInline = inline || !language

          if (isInline) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          }

          return (
            <CodeBlock language={language} value={String(children).replace(/\n$/, '')} />
          )
        }
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})

const CodeBlock = ({ language, value }: { language: string, value: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative my-4 rounded-xl overflow-hidden bg-[#1d1f21] border border-surface-200 dark:border-surface-700 shadow-sm group">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <span className="text-xs font-medium text-surface-300 uppercase tracking-wider">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-surface-300 hover:text-white transition-colors text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-success-400" />
              <span className="text-success-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 text-[13px] leading-relaxed custom-scrollbar overflow-x-auto">
        <SyntaxHighlighter
          style={atomDark}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: 0,
            background: 'transparent',
            fontSize: 'inherit',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'var(--font-mono)',
            }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
