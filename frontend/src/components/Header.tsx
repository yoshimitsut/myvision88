// components/Header.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { HeaderConfig, HeaderButton } from '../types/header';

type HeaderProps = HeaderConfig;

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showSearch = false, 
  searchValue = '', 
  onSearchChange,
  searchPlaceholder = '検索...',
  buttons = [],
  customContent 
}) => {
  const navigate = useNavigate();

  const handleButtonClick = (button: HeaderButton): void => {
    if (button.onClick) {
      button.onClick();
    } else if (button.path) {
      navigate(button.path);
    }
  };

  const renderButton = (button: HeaderButton, index: number): React.ReactNode => {
    // Se o botão tem um componente customizado
    if (button.component) {
      return <div key={index}>{button.component}</div>;
    }
    
    // Botão padrão
    return (
      <button
        key={index}
        onClick={() => handleButtonClick(button)}
        className={`list-btn ${button.className || ''}`}
        disabled={button.disabled}
        title={button.alt}
        type="button"
      >
        {button.icon && (
          <img src={button.icon} alt={button.alt || ''} width={20} height={20} />
        )}
        {button.text && <span>{button.text}</span>}
      </button>
    );
  };

  return (
    <header className="header">
      <div className="header-content">
        {title && <h1 className="header-title">{title}</h1>}
        
        <div className="list-order-actions">
          {showSearch && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={onSearchChange}
              className='list-order-input'
            />
          )}

          <div className='btn-actions'>
            {buttons.map((button, index) => renderButton(button, index))}
          </div>
        </div>

        {customContent && customContent}
      </div>
    </header>
  );
};

export default Header;