import Link from "next/link";
import { cookies } from "next/headers";
import { getCollections, pidOf } from "@/lib/store";
import { getT } from "@/lib/i18n";
import LangSwitch from "./LangSwitch";
import Logo from "./Logo";

export default async function Header({ q = "" }: { q?: string }) {
  const { locale, t } = await getT();
  const uid = (await cookies()).get("uid")?.value;
  const me = uid ? pidOf(uid) : null;
  const colCount = uid ? (await getCollections(uid, t.defaultName)).length : 0;
  return (
    <header className="header">
      <div className="header-in">
        <Link href="/" className="logo">
          <Logo name={t.appName} />
        </Link>
        <form action="/" className="search" role="search">
          <input name="q" defaultValue={q} placeholder={t.search} aria-label={t.search} />
        </form>
        <nav className="nav">
          <Link href="/">{t.feed}</Link>
          <Link href="/saved">
            {t.saved}
            {colCount > 0 && <span className="nav-count">{colCount}</span>}
          </Link>
          {me && <Link href={`/u/${me}`}>{t.profile}</Link>}
          <LangSwitch current={locale} label={t.language} />
          <Link href="/new" className="btn btn-primary">
            + {t.post}
          </Link>
        </nav>
      </div>
    </header>
  );
}
