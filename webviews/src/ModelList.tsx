import React from 'react';
import Select from 'react-select';
import { FcCancel, FcCheckmark } from "react-icons/fc";
import { ProgressData } from '../../src/commons/progressData';
import ProgressBar from './ProgressBar';

export interface ModelOption {
    label: string;
    value: string;
    info: string;
}

interface ModelListProps {
    className: string;
    label: string;
    value: string | null;
    onChange: (option: ModelOption | null) => void;
    status: boolean;
    options: ModelOption[];
    progress?: ProgressData;
    disabled?: boolean;
}

const ModelList: React.FC<ModelListProps> = ({ className, label, value, onChange, status, options, progress, disabled }) => {
    const selectHeight = '16px';
    
    const customStyles = {
        container: (base: any) => ({
            ...base,
        }),
        control: (base: any) => ({
            ...base,
            minHeight: selectHeight,
        }),
        dropdownIndicator: (base: any) => ({
            ...base,
            paddingTop: 0,
            paddingBottom: 0,
        }),
        menuList: (base: any) => ({
            ...base,
            fontSize: '12px',
        }),
        option: (base: any, state: { isSelected: boolean; isFocused: boolean }) => ({
            ...base,
            backgroundColor: state.isSelected
                ? 'var(--vscode-list-activeSelectionBackground)'
                : state.isFocused
                    ? 'var(--vscode-list-hoverBackground)'
                    : 'var(--vscode-dropdown-background)',
            color: state.isSelected
                ? 'var(--vscode-list-activeSelectionForeground)'
                : 'var(--vscode-dropdown-foreground)',
            ':active': {
                backgroundColor: 'var(--vscode-list-activeSelectionBackground)',
                color: 'var(--vscode-list-activeSelectionForeground)',
            },
        }),
        menu: (base: any) => ({
            ...base,
            backgroundColor: 'var(--vscode-dropdown-background)',
        }),
    };

    const formatOptionLabel = (modelOption: ModelOption, { context }: { context: 'menu' | 'value' }) => {
        const isSelected = value === modelOption.value;
        const color = isSelected && context === 'menu' ? 'var(--vscode-quickInputList-focusForeground)' : 'var(--vscode-input-placeholderForeground)';
        return (
            context === 'menu' ? 
            <div style={
                {
                display: 'flex',
                width: '250px',
                justifyContent: 'space-between',
            }}>
                <span>{modelOption.label}</span>
                <span className='model-option--info' style={{ color }}>{modelOption.info}</span>
            </div>
            : 
            <div style={
                {
                display: 'flex',
                width: '250px',
                justifyContent: 'space-between',
            }}>
                <span>{modelOption.label}</span>
                {/* <span className='model-option--info' style={{ color }}>{modelOption.info}</span> */}
            </div>
        );
    };

    return (
        <div className="form-group">
            <div className='model-list--outer-wrapper'>
                <label className='model-list--label' htmlFor={label}>
                    {status ? <FcCheckmark /> : <FcCancel />} 
                    <span>{label}:</span>
                </label>
                <div className={className + `--wrapper`}>
                    <Select
                        id={label}
                        value={options.find(option => option.value === value)}
                        onChange={(newValue) => onChange(newValue as ModelOption)}
                        options={options}
                        isDisabled={disabled}
                        styles={customStyles}
                        formatOptionLabel={formatOptionLabel}
                    />
                    {!status && <span className='info-label'> (will be pulled automatically)</span>}
                </div>
            </div>

            <div className='progress-container'>
                {!status && progress && (
                    <div id='progress' style={{ width: "100%", marginTop: "8px" }}>
                        <ProgressBar id={value!} data={progress} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelList;
