export default function Logo({ name }: { name: string }) {
  return (
    <>
      <svg className="logo-heart" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path
          d="M12 21c-6.6-4.5-9.5-7.9-9.5-11.6C2.5 6.4 4.8 4.2 7.6 4.2c1.8 0 3.4.9 4.4 2.4 1-1.5 2.6-2.4 4.4-2.4 2.8 0 5.1 2.2 5.1 5.2 0 3.7-2.9 7.1-9.5 11.6z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <ellipse cx="7.3" cy="8.6" rx="1.7" ry="1.1" transform="rotate(-35 7.3 8.6)" fill="#fff" opacity=".55" />
      </svg>
      <span className="logo-text">{name}</span>
    </>
  );
}
