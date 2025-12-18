import React from 'react';

const AnimatedBackground = () => {
  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70rem] h-[70rem] bg-violet-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob-1 dark:bg-violet-900/40 dark:mix-blend-lighten"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[65rem] h-[65rem] bg-blue-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob-2 dark:bg-blue-900/40 dark:mix-blend-lighten"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[75rem] h-[75rem] bg-pink-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob-3 dark:bg-pink-900/40 dark:mix-blend-lighten"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[65rem] h-[65rem] bg-indigo-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob-2 dark:bg-indigo-900/40 dark:mix-blend-lighten"></div>
      </div>

      <style>{`
        @keyframes move-1 {
            0% { transform: translate(0vw, 0vh) scale(1); }
            25% { transform: translate(50vw, 10vh) scale(1.2); }
            50% { transform: translate(20vw, 50vh) scale(0.9); }
            75% { transform: translate(80vw, 20vh) scale(1.1); }
            100% { transform: translate(0vw, 0vh) scale(1); }
        }
        @keyframes move-2 {
            0% { transform: translate(0vw, 0vh) scale(1); }
            33% { transform: translate(-40vw, 40vh) scale(1.3); }
            66% { transform: translate(-10vw, 80vh) scale(0.8); }
            100% { transform: translate(0vw, 0vh) scale(1); }
        }
        @keyframes move-3 {
            0% { transform: translate(0vw, 0vh) scale(1); }
            33% { transform: translate(30vw, -40vh) scale(0.8); }
            66% { transform: translate(-20vw, -20vh) scale(1.2); }
            100% { transform: translate(0vw, 0vh) scale(1); }
        }

        .animate-blob-1 {
          animation: move-1 25s infinite alternate linear;
          will-change: transform;
        }
        .animate-blob-2 {
          animation: move-2 30s infinite alternate linear;
          will-change: transform;
        }
        .animate-blob-3 {
          animation: move-3 28s infinite alternate linear;
          will-change: transform;
        }
      `}</style>
    </>
  );
};

export default AnimatedBackground;
