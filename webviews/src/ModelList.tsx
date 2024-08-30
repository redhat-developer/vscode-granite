import React from 'react';

interface ModelListProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    status: string;
    options: string[];
}

const ModelList: React.FC<ModelListProps> = ({ label, value, onChange, status, options }) => {
    return (
        <div className="form-group">
            <label htmlFor={label}>{label}:</label>
            <select
                id={label}
                value={value}
                onChange={onChange}
            >
                {options.map((option, index) => (
                    <option key={index} value={option}>{option}</option>
                ))}
            </select>
            <label>({status})</label>
        </div>
    );
};

export default ModelList;