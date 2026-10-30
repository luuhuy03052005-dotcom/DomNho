'use client';

import React from 'react';

interface DogCatLineArtProps {
  className?: string;
}

export default function DogCatLineArt({ className = '' }: DogCatLineArtProps) {
  return (
    <div className={`select-none pointer-events-none ${className}`}>
      <svg
        width="150"
        height="100"
        viewBox="0 0 150 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[96px]"
        aria-hidden="true"
      >
        <path
          d="M32 50 C26 40, 24 30, 32 24 C40 18, 48 24, 50 34"
          stroke="#D8724D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M50 28 C56 22, 68 22, 74 28 C78 32, 78 40, 74 46 C70 52, 60 54, 52 50"
          stroke="#D8724D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M72 34 C80 30, 84 38, 80 46 C76 52, 72 50, 70 48"
          stroke="#D8724D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M58 35 C60 37, 62 37, 64 35"
          stroke="#D8724D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M59 42 C61 44, 63 44, 65 42"
          stroke="#D8724D"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M48 50 C44 60, 42 75, 46 88 C50 90, 64 90, 68 88 C70 76, 72 65, 74 54"
          stroke="#D8724D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M42 84 C34 78, 30 70, 32 64 C34 60, 38 60, 42 66"
          stroke="#D8724D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M86 52 C82 46, 80 42, 84 38 C88 34, 92 40, 94 44 C96 40, 102 36, 106 40 C110 44, 108 50, 104 54 C100 58, 92 58, 88 54"
          stroke="#D8724D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M90 48 C91 49, 93 49, 94 48"
          stroke="#D8724D"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M98 48 C99 49, 101 49, 102 48"
          stroke="#D8724D"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M96 52 C96 53, 96 54, 96 54"
          stroke="#D8724D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M84 56 C80 66, 80 78, 82 88 C85 90, 98 90, 102 88 C104 78, 104 68, 102 58"
          stroke="#D8724D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M102 84 C110 82, 114 74, 112 68 C110 64, 106 66, 104 72"
          stroke="#D8724D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M92 24 C89 20, 84 21, 84 25 C84 29, 90 32, 92 34 C94 32, 100 29, 100 25 C100 21, 95 20, 92 24 Z"
          fill="#FFF0E5"
          stroke="#D8724D"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M20 90 C22 84, 25 80, 27 78 M24 90 C27 82, 31 84, 30 76"
          stroke="#0E513B"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M115 90 C117 84, 120 80, 122 78 M119 90 C122 82, 126 84, 125 76"
          stroke="#0E513B"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

