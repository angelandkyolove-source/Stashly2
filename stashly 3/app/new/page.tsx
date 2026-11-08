import Header from "@/components/Header";
import NewPostForm from "@/components/NewPostForm";
import { getT } from "@/lib/i18n";

export default async function New() {
  const { t } = await getT();
  return (
    <>
      <Header />
      <main className="main narrow">
        <h1 className="page-title">{t.newTitle}</h1>
        <NewPostForm
          t={{
            image: t.image, chooseImage: t.chooseImage, text: t.text, textPh: t.textPh,
            tags: t.tags, tagsPh: t.tagsPh, submit: t.submit, posting: t.posting,
            errNoImage: t.errNoImage, errTooBig: t.errTooBig, errGeneric: t.errGeneric,
          }}
        />
      </main>
    </>
  );
}
