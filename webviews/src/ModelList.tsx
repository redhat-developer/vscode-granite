import React from 'react';
import { FcCancel, FcCheckmark } from "react-icons/fc";
import { ProgressData } from '../../src/commons/progressData';
import ProgressBar from './ProgressBar';

interface ModelListProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    status: boolean;
    options: string[];
    progress?: ProgressData;
    disabled?: boolean;
}

const ModelList: React.FC<ModelListProps> = ({ label, value, onChange, status, options, progress, disabled }) => {
    return (
        <div className="form-group">
            <div>
                {status ? <FcCheckmark /> : <FcCancel />}
                <label htmlFor={label}>{label}:</label>
                <select
                    id={label}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                >
                    {options.map((option, index) => (
                        <option key={index} value={option}>{option}</option>
                    ))}
                </select>
                {!status && <label> (will be pulled automatically)</label>}
            </div>

            {!status && progress && (
                <div id='progress' style={{ width: "90%" }}>
                    <ProgressBar id={value} data={progress} />
                </div>
            )}

        </div>

    );
};

export default ModelList;