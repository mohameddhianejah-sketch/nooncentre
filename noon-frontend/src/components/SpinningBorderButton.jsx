import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

function spinnableSurface(children) {
  return (
    <>
      <span className="sbb-beam" aria-hidden="true" />
      <span className="sbb-fill" aria-hidden="true" />
      <span className="sbb-inner">
        <span className="sbb-children">{children}</span>
        <svg
          className="sbb-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </span>
    </>
  );
}

export const SpinningBorderButton = forwardRef(function SpinningBorderButton(
  { children, className, ...props },
  ref
) {
  return (
    <button ref={ref} className={`sbb${className ? ` ${className}` : ''}`} {...props}>
      {spinnableSurface(children)}
    </button>
  );
});

export const SpinningBorderLink = forwardRef(function SpinningBorderLink(
  { children, className, to, href, ...props },
  ref
) {
  const cls = `sbb${className ? ` ${className}` : ''}`;
  const surface = spinnableSurface(children);
  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} {...props}>
        {surface}
      </Link>
    );
  }
  return (
    <a ref={ref} href={href} className={cls} {...props}>
      {surface}
    </a>
  );
});