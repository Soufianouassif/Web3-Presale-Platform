import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
}

export default function SEOHead({ title, description, path = "/", noindex = false }: SEOProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = href;
    };

    const baseUrl = "https://pepewife.io";
    const fullUrl = `${baseUrl}${path}`;

    setMeta("description", description);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow");
    setLink("canonical", fullUrl);

    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", fullUrl, true);

    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
  }, [title, description, path, noindex]);

  return null;
}
