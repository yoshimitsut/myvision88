import React from "react";

type FruitOptionRadioProps = {
  value: string; // valor atual, ex: "有り" ou "無し"
  onChange: (value: string) => void; // função chamada ao clicar
  name?: string; // opcional, útil quando há múltiplos grupos
  label?: string; // opcional — título como "*フルーツ盛り"
  required?: boolean;
  className?: string;
};

const FruitOptionRadio: React.FC<FruitOptionRadioProps> = ({
  value,
  onChange,
  name = "fruit-option",
  label = "フルーツ盛り",
  required = false,
  className = "",
}) => {
  console.log('FruitOptionRadio - valor atual:', value); 
  return (
    <div className={`input-group-radio ${className}`}>
      <label>
        {required && "*"}
        {label}
      </label>
      <div className="pill-edit-group">
        <label className={`pill-edit ${value === "無し" ? "active" : ""}`}>
          <input
          className="radio-input-fruit"
            type="radio"
            name={name}
            value="無し"
            checked={value === "無し"}
            onChange={() => onChange("無し")}
          />
          <span>通常盛り</span>
          <span>+0円</span>
        </label>
        <label className={`pill-edit ${value === "有り" ? "active" : ""}`}>
          <input
          className="radio-input-fruit"
            type="radio"
            name={name}
            value="有り"
            checked={value === "有り"}
            onChange={() => onChange("有り")}
          />
          <span>フルーツ増し</span>
          <span>＋648円</span>
        </label>
      </div>
    </div>
  );
};

export default FruitOptionRadio;
