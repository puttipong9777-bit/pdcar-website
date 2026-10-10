import type { ArticleContent, ArticleSource } from "@/lib/article-approval/types";

export function ArticleBody({ content, sources }: { content: ArticleContent; sources: ArticleSource[] }) {
  return <>
    {content.sections.map((section, index) => <section key={index}>
      <h2>{section.heading}</h2>
      {section.paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
    </section>)}
    <section className="pd-article-sources"><h2>แหล่งข้อมูลประกอบ</h2><ul>
      {sources.filter((source) => source.url.startsWith("https://www.nhtsa.gov/")).map((source) =>
        <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}
    </ul></section>
  </>;
}
