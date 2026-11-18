import { useEffect } from 'react';
import Markdown, { type Components } from 'react-markdown';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { cn } from '@/common/utils';
import {
  detectDocLang,
  DOC_LANGS,
  type DocLang,
  getLegalDocPath,
  LEGAL_DOCS,
  type LegalDocId,
  parseDocLang,
} from '@/docs';

import s from './LegalDocPage.module.scss';

const BRAND = 'SweetMe';

const LANG_LABEL: Record<DocLang, string> = { ru: 'RU', en: 'EN' };
const BACK_LABEL: Record<DocLang, string> = { ru: 'Назад', en: 'Back' };

const markdownComponents: Components = {
  a: ({ href = '', children }) => {
    // Links between the legal pages stay inside the SPA.
    if (href.startsWith('/')) {
      return <Link to={href}>{children}</Link>;
    }

    const isExternal = /^https?:\/\//.test(href);

    return (
      <a
        href={href}
        {...(isExternal
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      >
        {children}
      </a>
    );
  },
};

type LegalDocPageProps = {
  docId: LegalDocId;
};

export function LegalDocPage({ docId }: LegalDocPageProps) {
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang = parseDocLang(langParam);

  if (!lang) {
    return <Navigate to={getLegalDocPath(docId, detectDocLang())} replace />;
  }

  return <LegalDocView docId={docId} lang={lang} />;
}

function LegalDocView({ docId, lang }: { docId: LegalDocId; lang: DocLang }) {
  const location = useLocation();
  const navigate = useNavigate();
  const doc = LEGAL_DOCS[docId][lang];
  // React Router marks the entry the app was opened on with key "default",
  // so anything else means there is an in-app page to go back to.
  const canGoBack = location.key !== 'default';
  const otherDocs = (Object.keys(LEGAL_DOCS) as LegalDocId[]).filter(
    (id) => id !== docId,
  );

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;

    document.title = `${doc.title} — ${BRAND}`;
    document.documentElement.lang = lang;

    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
    };
  }, [doc.title, lang]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [docId, lang]);

  return (
    <div className={s.page}>
      <header className={s.header}>
        {canGoBack ? (
          <button
            type="button"
            className={s.backButton}
            onClick={() => navigate(-1)}
            aria-label={BACK_LABEL[lang]}
          >
            <span className="material-symbols-outlined">
              arrow_back_ios_new
            </span>
          </button>
        ) : (
          <div className={s.wordmark} aria-label={BRAND}>
            <span className={s.wordmarkPrimary}>Sweet</span>
            <span className={s.wordmarkSecondary}>Me</span>
          </div>
        )}

        <nav className={s.langSwitch} aria-label="Language">
          {DOC_LANGS.map((item) => (
            <Link
              key={item}
              to={getLegalDocPath(docId, item)}
              replace
              hrefLang={item}
              aria-current={item === lang ? 'page' : undefined}
              className={cn(s.langOption, [item === lang && s.langActive])}
            >
              {LANG_LABEL[item]}
            </Link>
          ))}
        </nav>
      </header>

      <main className={s.content}>
        <article className={s.doc}>
          <Markdown components={markdownComponents}>{doc.body}</Markdown>
        </article>

        <footer className={s.footer}>
          {otherDocs.map((id) => (
            <Link
              key={id}
              to={getLegalDocPath(id, lang)}
              className={s.footerLink}
            >
              {LEGAL_DOCS[id][lang].title}
            </Link>
          ))}
          <span className={s.copyright}>
            © {new Date().getFullYear()} {BRAND}
          </span>
        </footer>
      </main>
    </div>
  );
}
