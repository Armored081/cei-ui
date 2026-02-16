import './format-picker.css'

interface FormatPickerProps {
  formats: Array<{
    format: 'pdf' | 'docx' | 'pptx' | 'csv'
    description: string
  }>
  selected?: string
  onSelect: (format: string) => void
}

function formatIcon(format: string): string {
  if (format === 'pdf') return '📄'
  if (format === 'docx') return '📝'
  if (format === 'pptx') return '📑'
  if (format === 'csv') return '📊'
  return '📄'
}

export function FormatPicker({ formats, selected, onSelect }: FormatPickerProps): JSX.Element {
  return (
    <div className="cei-doc-format-picker">
      {formats.map(({ format, description }) => {
        const isSelected = selected === format
        const optionClass = isSelected
          ? 'cei-doc-format-option cei-doc-format-option--selected'
          : 'cei-doc-format-option'

        return (
          <button
            key={format}
            type="button"
            className={optionClass}
            onClick={(): void => onSelect(format)}
          >
            <span className="cei-doc-format-option-icon">{formatIcon(format)}</span>
            <div className="cei-doc-format-option-details">
              <span
                className={`cei-doc-format-option-label cei-doc-format-option-label--${format}`}
              >
                {format.toUpperCase()}
              </span>
              <span className="cei-doc-format-option-desc">{description}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
