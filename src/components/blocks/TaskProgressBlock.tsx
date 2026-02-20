import type { TaskProgressSegment } from '../../types/chat'
import './TaskProgressBlock.css'

interface TaskProgressBlockProps {
  block: TaskProgressSegment
}

function clampProgress(
  totalSteps: number,
  completedSteps: number,
): {
  completed: number
  total: number
} {
  const total = Math.max(1, totalSteps)
  const completed = Math.max(0, Math.min(completedSteps, total))

  return {
    completed,
    total,
  }
}

function progressPercent(totalSteps: number, completedSteps: number): number {
  const { completed, total } = clampProgress(totalSteps, completedSteps)
  return Math.round((completed / total) * 100)
}

function stepIcon(status: TaskProgressSegment['steps'][number]['status']): string {
  if (status === 'complete') {
    return '\u2713'
  }

  if (status === 'active') {
    return '\u25CF'
  }

  return '\u25CB'
}

/**
 * Renders task-level progress updates in the conversation stream.
 */
export function TaskProgressBlock({ block }: TaskProgressBlockProps): JSX.Element {
  const { completed, total } = clampProgress(block.totalSteps, block.completedSteps)
  const percent = progressPercent(block.totalSteps, block.completedSteps)

  return (
    <section
      aria-label={`Task progress: ${block.taskName}`}
      className="cei-task-progress"
      role="group"
    >
      <header className="cei-task-progress-header">
        <div>
          <p className="cei-task-progress-name">{block.taskName}</p>
          <p className="cei-task-progress-current">{block.currentStep}</p>
        </div>
        <p
          className="cei-task-progress-count"
          aria-label={`${completed.toString()} of ${total.toString()} steps complete`}
        >
          {completed.toString()}/{total.toString()}
        </p>
      </header>

      <div
        aria-label={`${block.taskName} completion`}
        aria-valuemax={total}
        aria-valuemin={0}
        aria-valuenow={completed}
        className="cei-task-progress-bar"
        role="progressbar"
      >
        <span className="cei-task-progress-bar-fill" style={{ width: `${percent.toString()}%` }} />
      </div>

      <ol className="cei-task-progress-steps">
        {block.steps.map((step, index) => {
          return (
            <li className="cei-task-progress-step" key={`${step.name}-${index.toString()}`}>
              <span
                aria-hidden="true"
                className={`cei-task-progress-step-icon cei-task-progress-step-${step.status}`}
              >
                {stepIcon(step.status)}
              </span>
              <span className="cei-task-progress-step-name">{step.name}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
