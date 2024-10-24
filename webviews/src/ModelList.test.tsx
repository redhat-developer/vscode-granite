import { render, screen, fireEvent } from '@testing-library/react';
import ModelList, { ModelOption } from './ModelList';
import '@testing-library/jest-dom';
import React from 'react';

describe('ModelList Component', () => {
  const modelOptions: ModelOption[] = [
    { label: 'Model A', value: 'model-a', info: '1 GB' },
    { label: 'Model B', value: 'model-b', info: '2 GB' },
  ];

  it('renders model options correctly', () => {
    render(
      <ModelList
        className="test-class"
        label="Chat model"
        value="model-a"
        onChange={() => { }}
        status={true}
        options={modelOptions}
      />
    );

    expect(screen.getByText('Chat model:')).toBeInTheDocument();
    expect(screen.getByText('Model A')).toBeInTheDocument();
    expect(screen.getByText('1 GB')).toBeInTheDocument();
  });

  it('triggers onChange when a different model is selected', () => {
    const onChangeMock = jest.fn();
    render(
      <ModelList
        className="test-class"
        label="Chat model"
        value="model-a"
        onChange={onChangeMock}
        status={true}
        options={modelOptions}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'model-b' } });
    expect(onChangeMock).toHaveBeenCalled();
  });
});