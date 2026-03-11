interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
}

export default function StepIndicator({
  steps,
  currentStep,
  completedSteps,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center">
      {steps.map((label, i) => {
        const isCompleted = completedSteps.includes(i);
        const isActive = i === currentStep;
        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-300
                  ${
                    isCompleted
                      ? 'bg-primary text-white'
                      : isActive
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-gray-100 text-gray-400'
                  }
                `}
              >
                {isCompleted ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium whitespace-nowrap
                  ${isActive || isCompleted ? 'text-gray-900' : 'text-gray-400'}
                `}
              >
                {label}
              </span>
            </div>

            {!isLast && (
              <div
                className={`
                  w-24 h-0.5 mx-3 mb-6 transition-colors duration-300
                  ${isCompleted ? 'bg-primary' : 'bg-gray-200'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
