import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { Cake } from "../types/types";
import "./CakeInformationsSize.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function CakeInformations() {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/cake`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.cakes || [];
        setCakes(list);

        const initial = searchParams.get("cake");

        if (initial) {
          const idx = list.findIndex(
            (c: Cake) => c.name.toLowerCase() === initial.toLowerCase()
          );
          if (idx >= 0) setCurrentIndex(idx);
        }
      });
  }, []);

  const selectedCake = cakes[currentIndex];

  const nextCake = () => {
    setCurrentIndex((prev) => (prev + 1) % cakes.length);
  };

  const handleReserve = () => {
    if (!selectedCake) return;
    navigate(`/order?cake=${encodeURIComponent(selectedCake.name)}`);
  };

  if (!selectedCake) return <div className="cake-screen" />;

  return (
    <div className="cake-screen">

      {/* ========== BOLO ATUAL (DESTAQUE) ========== */}
      <div className="featured-cake">
        <img
          src={`${API_URL}/image/${selectedCake.image}`}
          alt={selectedCake.name}
        />

        <div className="featured-info">
          <h2>{selectedCake.name}</h2>
          <p>{selectedCake.description}</p>

          <table className="cake-inf-table">
            <tbody>
              {selectedCake.sizes?.map((s, i) => (
                <tr key={i}>
                  <td>{s.size}</td>
                  <td>
                    ¥{s.price.toLocaleString("ja-JP")}{" "}
                    <span className="zeikin">税込</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={handleReserve} className="reserve-btn">
            予約
          </button>
        </div>

        {/* seta para próximo */}
        <button className="next-btn" onClick={nextCake}>
          ➤
        </button>
      </div>

      {/* ========== LISTA COMPLETA DE BOLOS ========== */}
      <h3 className="all-title">すべてのケーキ</h3>

      <div className="cake-list">
  {cakes.map((cake, index) => (
    <div
      key={cake.id}
      className="cake-card"
      onClick={() => setCurrentIndex(index)}  // <<< trocar o bolo principal
    >
      <img src={`${API_URL}/image/${cake.image}`} alt={cake.name} />
      <h4>{cake.name}</h4>
      <p>{cake.description}</p>

      <table className="cake-inf-table small-table">
        <tbody>
          {cake.sizes?.map((s, i) => (
            <tr key={i}>
              <td>{s.size}</td>
              <td>
                ¥{s.price.toLocaleString("ja-JP")}
                <span className="zeikin">税込</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ))}
</div>


    </div>
  );
}
