const res = await fetch("https://yc-oss.github.io/api/tags/open-source.json");
const companies = await res.json();

const readme = await Deno.readTextFile("README.md");
let text = `<!--start generated readme-->\n`;
text += `| Logo | Company | Batch | API |\n| --------------- | ------------ | ------------ | ------------ |\n`;
for (const company of companies)
  text += `| <img alt="" src="${company.small_logo_thumb_url}" width="32" height="32"> | ${company.name} | ${company.batch} | [API](${company.api}) |\n`;
text += `<!--end generated readme-->\n`;

const newReadme = readme.replace(
  /<!--start generated readme-->[\s\S]*<!--end generated readme-->/g,
  text
);
await Deno.writeTextFile("README.md", newReadme);

export {};
