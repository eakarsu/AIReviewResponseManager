import React from 'react';

const FormField = ({ label, error, children }) => (
  <div className="form-group">
    {label && <label>{label}</label>}
    <div style={error ? { position: 'relative' } : undefined}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && error) {
          return React.cloneElement(child, {
            style: {
              ...child.props.style,
              borderColor: '#ef4444',
              boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)'
            }
          });
        }
        return child;
      })}
    </div>
    {error && (
      <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block' }}>
        {error}
      </span>
    )}
  </div>
);

export default FormField;
