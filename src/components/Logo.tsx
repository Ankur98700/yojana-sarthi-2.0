export function YojanaSarthiLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Clean civic document & pathway emblem (original non-government mark) */}
      <rect x="2" y="2" width="32" height="32" rx="8" fill="#123B65" />
      <path
        d="M11 10.5C11 9.67157 11.6716 9 12.5 9H23.5C24.3284 9 25 9.67157 25 10.5V13.5H11V10.5Z"
        fill="#F39C35"
      />
      <path
        d="M11 15.5H25V20.5C25 23.8137 22.3137 26.5 19 26.5H17C13.6863 26.5 11 23.8137 11 20.5V15.5Z"
        fill="#FFFFFF"
      />
      <path
        d="M15 20.5L17.3 22.8L21.5 18.2"
        stroke="#138A55"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
