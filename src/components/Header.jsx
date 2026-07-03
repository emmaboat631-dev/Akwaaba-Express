import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Header = ({ title, subtitle, onBack, right, back = true }) => {
  const navigate = useNavigate();
  return (
    <div className="header">
      <div className="flex items-center gap-3">
        {back && (
          <button className="icon-btn" aria-label="Go back" onClick={onBack || (() => navigate(-1))}>
            <ArrowLeft size={20} />
          </button>
        )}
        {title && (
          <div>
            <h2>{title}</h2>
            {subtitle && <div className="t-sm muted">{subtitle}</div>}
          </div>
        )}
      </div>
      {right}
    </div>
  );
};

export default Header;
