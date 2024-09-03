import React from 'react';
import { FcCancel, FcCheckmark } from "react-icons/fc";

interface ModelListProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    status: boolean;
    options: string[];
    progress: number;
}

const ModelList: React.FC<ModelListProps> = ({ label, value, onChange, status, options, progress }) => {
//TODO disable component when installation is in progress
    return (
        <div className="form-group">
            <div>
            {status ? <FcCheckmark /> : <FcCancel />}
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
            {!status && <label> (will be pulled automatically)</label>}
            </div>

            {!status && progress > -1 && (
                <div id='progress'>
                    <progress max="100" value={progress} />
                </div>
            )}

        </div>

    );
};

export default ModelList;