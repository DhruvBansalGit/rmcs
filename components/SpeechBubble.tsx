interface SpeechBubbleProps {
  message: string;
  show: boolean;
}

export default function SpeechBubble({ message, show }: SpeechBubbleProps) {
  if (!show) return null;

  return (
    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
      <div className="relative bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
        <p className="text-sm font-semibold">{message}</p>
        {/* Triangle pointer */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-amber-500"></div>
      </div>
    </div>
  );
}
