import { useEffect, useState } from "react";
import type { Newsletter } from "../types/types";
import "./NewsletterManagement.css";

import { formatDateJP } from "../utils/formatDateJP";

const API_URL = import.meta.env.VITE_API_URL;

export default function NewsletterPage() {
  const [list, setList] = useState<Newsletter[]>([]);
  const [form, setForm] = useState<Newsletter>({
    title: "",
    content: "",
    source: "site",
    link: "",
    updated_at: ""
  });

  const fetchNewsletters = async (): Promise<Newsletter[]> => {
    try {
      const token = localStorage.getItem('store_token');
      const res = await fetch(`${API_URL}/api/newsletters`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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

  const submit = async () => {
    const method = form.id ? "PUT" : "POST";
    const url = form.id
      ? `${API_URL}/api/newsletters/${form.id}`
      : `${API_URL}/api/newsletters`;

    const token = localStorage.getItem('store_token');
    await fetch(url, {
      method,
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(form),
    });

    setForm({ title: "", content: "", source: "site", link: "", updated_at: ""});

    const data = await fetchNewsletters();
    setList(data);
  };

  const remove = async (id?: number) => {
    if (!id) return;

    const token = localStorage.getItem('store_token');
    await fetch(`${API_URL}/api/newsletters/${id}`, {
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await fetchNewsletters();
    setList(data);
  };

  const edit = (item: Newsletter) => setForm(item);

  const normalizeLink = (link: string) => {
    if (link.startsWith("http://") || link.startsWith("https://")){
      return link;
    }
    return `https://${link}`
  }

  return (
    <div className="newsletter-container"
    style={
        { 
          maxWidth: '800px',
          margin: '40px auto',
          padding: '24px'
        }}
    >
      <h2>ニュースレター管理</h2>

      <div className="newsletter-form">
        <input
          placeholder="タイトル"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        {/* <textarea
          placeholder="内容"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        /> */}

        <select
          value={form.source}
          onChange={(e) =>
            setForm({ ...form, source: e.target.value as "site" | "instagram" })
          }
        >
          <option value="site">サイト</option>
          <option value="instagram">インスタグラム</option>
        </select>

        <input
          placeholder="リンク（任意）"
          value={form.link || ""}
          onChange={(e) => setForm({ ...form, link: e.target.value })}
        />

        <button onClick={submit}>
          {form.id ? "更新" : "登録"}
        </button>
      </div>

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
                    className="newsletter-title"
                  >
                    {item.title}
                  </a> 
                ) : (
                  item.title
                )}
              </div>
            </div>

            <div className="newsletter-actions">
              <button className="edit" onClick={() => edit(item)}>
                編集
              </button>
              <button className="delete" onClick={() => remove(item.id)}>
                削除
              </button>
            </div>

            </div>
        ))}
      </div>
    </div>
  );
}
