import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const FlowButton = forwardRef(function FlowButton(
  { to, href, type = 'button', className = '', children, ...rest },
  ref
) {
  const cls = `fb ${className}`.trim();
  const inner = (
    <>
      <ArrowRight className="fb-arrow fb-arrow-l" aria-hidden="true" strokeWidth={2.75} />
      <span className="fb-label">{children}</span>
      <span className="fb-circle" aria-hidden="true" />
      <ArrowRight className="fb-arrow fb-arrow-r" aria-hidden="true" strokeWidth={2.75} />
    </>
  );
  if (to) {
    return (
      <Link to={to} ref={ref} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} ref={ref} className={cls} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} ref={ref} className={cls} {...rest}>
      {inner}
    </button>
  );
});

export default FlowButton;