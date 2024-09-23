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
    label: string;
    value: string | null;
    onChange: (option: ModelOption | null) => void;
    status: boolean;
    options: ModelOption[];
    progress?: ProgressData;
    disabled?: boolean;
}

const ModelList: React.FC<ModelListProps> = ({ label, value, onChange, status, options, progress, disabled }) => {
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
            <div style={
                {
                display: 'flex',
                width: '250px',
                justifyContent: 'space-between',
            }}>
                <span>{modelOption.label}</span>
                <span style={{ color }}>{modelOption.info}</span>
            </div>
        );
    };

    return (
        <div className="form-group">
            <div style={{ display: 'inline-flex', verticalAlign: 'middle', alignItems: 'center' }}>
                {status ? <FcCheckmark /> : <FcCancel />}
                <label htmlFor={label} style={{ minWidth: '200px', display: 'flex', alignItems: 'center' }}>{label}:</label>
                <Select
                    id={label}
                    value={options.find(option => option.value === value)}
                    onChange={(newValue) => onChange(newValue as ModelOption)}
                    options={options}
                    isDisabled={disabled}
                    styles={customStyles}
                    formatOptionLabel={formatOptionLabel}
                />
                {!status && <label style={{ display: 'flex', alignItems: 'center' }}> (will be pulled automatically)</label>}
            </div>

            <div className='progress-container' style={{ width: "90%" }}>
                {!status && progress && (
                    <div id='progress' style={{ width: "100%" }}>
                        <ProgressBar id={value!} data={progress} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelList;