import React from 'react';
import './Select.css'; // We'll create this CSS file next

const Select = ({ label, options, ...props }) => {
  return (
    <div className="select-container">
      {label && <label className="select-label">{label}</label>}
      <select className="select-element" {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
