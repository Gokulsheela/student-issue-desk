import { useState, useEffect } from 'react';

const subtitles = [
  "Submit issues easily and track responses in real time.",
  "Get the support you need, when you need it.",
  "Real-time chat with dedicated admin support.",
];

const TypewriterSubtitle = () => {
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);
  const [showAllSubtitles, setShowAllSubtitles] = useState(false);

  // Cursor blink effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  // Main typewriter effect
  useEffect(() => {
    if (showAllSubtitles) {
      // Show all subtitles for 3 seconds
      const timer = setTimeout(() => {
        setShowAllSubtitles(false);
        setCurrentSubtitleIndex(0);
        setDisplayedText('');
        setIsTyping(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    const currentText = subtitles[currentSubtitleIndex];

    if (isTyping) {
      // Typing forward
      if (displayedText.length < currentText.length) {
        const timer = setTimeout(() => {
          setDisplayedText(currentText.slice(0, displayedText.length + 1));
        }, 50);
        return () => clearTimeout(timer);
      } else {
        // Finished typing, pause before erasing
        const timer = setTimeout(() => {
          setIsTyping(false);
        }, 1500);
        return () => clearTimeout(timer);
      }
    } else {
      // Erasing
      if (displayedText.length > 0) {
        const timer = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1));
        }, 30);
        return () => clearTimeout(timer);
      } else {
        // Finished erasing, move to next subtitle
        const nextIndex = currentSubtitleIndex + 1;
        if (nextIndex >= subtitles.length) {
          // Completed all subtitles, show them all together
          setShowAllSubtitles(true);
        } else {
          setCurrentSubtitleIndex(nextIndex);
          setIsTyping(true);
        }
      }
    }
  }, [displayedText, isTyping, currentSubtitleIndex, showAllSubtitles]);

  if (showAllSubtitles) {
    return (
      <div className="space-y-3 min-h-[120px]">
        {subtitles.map((subtitle, index) => (
          <p
            key={index}
            className="text-xl lg:text-2xl text-muted-foreground leading-relaxed animate-fade-in"
            style={{
              animationDelay: `${index * 0.2}s`,
              animationFillMode: 'both',
            }}
          >
            {subtitle}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-[120px] flex items-start">
      <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed font-mono">
        {displayedText}
        <span
          className={`inline-block w-0.5 h-6 lg:h-8 bg-primary ml-1 align-middle ${
            showCursor ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-100`}
        />
      </p>
    </div>
  );
};

export default TypewriterSubtitle;
