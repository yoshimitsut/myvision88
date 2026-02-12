import { useEffect, useState } from "react";
import type { Newsletter } from "../types/types";
import "./NewsletterManagement.css";

import { formatDateJP } from "../utils/formatDateJP";

const API_URL = import.meta.env.VITE_API_URL;

export default function NewsletterPage() {
  const [list, setList] = useState<Newsletter[]>([]);

  const fetchNewsletters = async (): Promise<Newsletter[]> => {
    try {
      const res = await fetch(`${API_URL}/api/newsletters`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("ネットワークエラー", err);
      return [];
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const data = await fetchNewsletters();
      if (mounted) setList(data);
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const normalizeLink = (link: string) => {
    if (link.startsWith("http://") || link.startsWith("https://")){
      return link;
    }
    return `https://${link}`
  }

  return (
    <div className="newsletter-container">

      <div className="newsletter-list">
        {list.map((item) => (
          <div className="newsletter-item" key={item.id}>
            
            <div className="newsletter-edit">
              <div className="newsletter-date">
                <span>{formatDateJP(item.updated_at)}</span>
              </div>
            
              <div className="newsletter-content">
                <span className="newsletter-source">
                  {item.source === "instagram" ? (
                    <img
                      src="https://framerusercontent.com/images/EPZRIYNlQSQIhx8T0YRVIpXZM.png"
                      alt="Instagram"
                      className="instagram-icon"
                    />
                  ) : (
                    <strong>HP</strong>
                  )}
                </span>
                {item.link ? (
                  <a
                    href={normalizeLink(item.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="newsletter-tetle"
                  >
                    {item.title}
                  </a> 
                ) : (
                  item.title
                )}
              </div>
            </div>


            </div>
        ))}
      </div>
    </div>
  );
}
