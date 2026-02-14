import { useMemo, createElement } from 'react'
import type { ContentBlock as BlockType } from './types'

interface ContentBlockProps {
  block: BlockType
  fontSize: number
}

export default function ContentBlock({ block, fontSize }: ContentBlockProps) {
  const style = useMemo(() => ({ fontSize: `${fontSize}em` }), [fontSize])

  switch (block.type) {
    case 'heading': {
      const level = Math.min(Math.max(block.level ?? 1, 1), 6)
      const tag = `h${level}` as keyof JSX.IntrinsicElements
      return createElement(tag, {
        className: `block-heading block-heading-${level}`,
        style,
      }, block.text ?? '')
    }

    case 'paragraph': {
      const paraText = block.text ?? ''
      const segments = paraText.split(/\n\n/)
      return (
        <>
          {segments.map((segment, i) => (
            <p key={i} className="block-paragraph" style={style}>
              <FormattedText text={segment} />
            </p>
          ))}
        </>
      )
    }

    case 'verse': {
      const verseText = block.text ?? ''
      const segments = verseText.split(/\n\n/)
      return (
        <>
          {segments.map((segment, i) => (
            <p key={i} className="block-verse" style={style}>
              <VerseText text={segment} />
            </p>
          ))}
        </>
      )
    }

    case 'instruction':
      return (
        <div className="block-instruction" style={style}>
          <FormattedText text={block.text ?? ''} />
        </div>
      )

    case 'doxology':
      return (
        <div className="block-doxology" style={style}>
          {block.text}
        </div>
      )

    case 'doxology_block':
      return (
        <div className="block-doxology-wrap">
          {block.children?.map((child, i) => (
            <ContentBlock key={i} block={child} fontSize={fontSize} />
          ))}
        </div>
      )

    case 'image':
      return (
        <div className="block-image">
          <img src={block.src} alt="" loading="lazy" />
        </div>
      )

    case 'figure':
      return (
        <figure className="block-figure">
          <img src={block.src} alt={block.caption ?? ''} loading="lazy" />
          {block.caption && <figcaption className="block-figure-caption">{block.caption}</figcaption>}
        </figure>
      )

    case 'separator':
      // Rendered as part of SeparatorHero in the chapter renderer
      return null

    case 'blank':
      return null

    default:
      return null
  }
}

/** Render a separator page as a hero card.
 * Takes the full chapter blocks and renders title + image + description nicely.
 * Additional instruction blocks (e.g. hour intro texts) are rendered below. */
export function SeparatorHero({ blocks, fontSize }: { blocks: BlockType[]; fontSize: number }) {
  const title = blocks.find(b => b.type === 'heading')?.text ?? ''
  const image = blocks.find(b => b.type === 'image')
  const desc = blocks.find(b => b.type === 'paragraph')
  const extras = blocks.filter(b => b.type === 'instruction')
  const descText = desc?.text ?? ''
  const firstPara = descText.includes('\n\n') ? descText.split(/\n\n/)[0]! : descText

  return (
    <div className="block-separator-hero" style={{ fontSize: `${fontSize}em` }}>
      <div className="sep-title">{title}</div>
      <div className="sep-ornament">· · ·</div>
      {image && (
        <div className="sep-image">
          <img src={image.src} alt="" loading="lazy" />
        </div>
      )}
      {desc && (
        <p className="sep-desc">
          <FormattedText text={firstPara} />
        </p>
      )}
      {extras.map((para, i) => (
        <p key={i} className="sep-instruction">
          <FormattedText text={para.text ?? ''} />
        </p>
      ))}
    </div>
  )
}

/** Parse inline formatting: _italic_, **bold** */
function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[\s\S]*?\*\*|_[\s\S]*?_)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-strong">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
          return <em key={i} className="text-em">{part.slice(1, -1)}</em>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

/** Parse verse numbers ⟨N⟩ into styled spans */
function VerseText({ text }: { text: string }) {
  const parts = text.split(/(⟨\d+⟩)/g)
  return (
    <>
      {parts.map((part, i) => {
        const numMatch = part.match(/^⟨(\d+)⟩$/)
        if (numMatch) {
          return <sup key={i} className="verse-num">{numMatch[1]}</sup>
        }
        return <FormattedText key={i} text={part} />
      })}
    </>
  )
}
