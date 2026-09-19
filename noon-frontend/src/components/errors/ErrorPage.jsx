import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { buildError, actionLabel } from './errorConfig';
import './ErrorPage.css';

const ROOT_PATH = '/';

/**
 * Reusable global error page.
 *
 * Not hard-coded to any status: pass an HTTP code (or nothing) and the
 * matching title / description / actions are picked from `errorConfig`.
 * The visual design is always the same — only the content changes.
 *
 * @example
 *   <ErrorPage code="404" />                       // 404 + Back to Home
 *   <ErrorPage code="500" onRetry={reload} />      // 500 + Try Again / Home
 *   <ErrorPage code="ERROR" onRetry={reset} />     // generic unexpected error
 */
export default function ErrorPage({
  code,
  title,
  description,
  actions,
  onRetry,
}) {
  const { lang } = useLang();
  const cfg = buildError(code, lang, { title, description, actions });

  const signInTo = '/admin/login';

  return (
    <main className="error-page">
      <div className="error-illustration" aria-hidden="true">
        <span className="ring ring-1" />
        <span className="ring ring-2" />
        <span className="ring ring-3" />
        <span className="arch" />
        <span className="orbit orbit-a" />
        <span className="orbit orbit-b" />
      </div>

      <div className="error-content">
        <p className="error-brand">NOON CENTER</p>
        <div className="error-code">{cfg.code}</div>
        <h1 className="error-title">{cfg.title}</h1>
        <p className="error-desc">{cfg.description}</p>

        <div className="error-actions">
          {cfg.actions.map((kind) => {
            if (kind === 'retry') {
              return (
                <button
                  key={kind}
                  type="button"
                  className="btn btn-solid error-action"
                  onClick={onRetry}
                >
                  {actionLabel('retry', lang)}
                </button>
              );
            }
            const to = kind === 'signin' ? signInTo : ROOT_PATH;
            const cls = kind === 'home'
              ? 'btn btn-ghost error-action'
              : 'btn btn-solid error-action';
            return (
              <Link key={kind} to={to} className={cls}>
                {actionLabel(kind, lang)}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}