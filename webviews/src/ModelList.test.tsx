import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModelList, { ModelOption } from './ModelList';
import { ModelStatus } from '../../src/commons/statuses';

describe('ModelList Component', () => {
  const modelOptions: ModelOption[] = [
    { label: 'Model A', value: 'model-a', info: '1 GB' },
    { label: 'Model B', value: 'model-b', info: '2 GB' },
  ];

  it('renders correctly with available model', () => {
    const onChangeMock = jest.fn();
    render(
      <ModelList
        className="test-class"
        label="Chat model"
        value="model-a"
        onChange={onChangeMock}
        status={ModelStatus.installed}
        options={modelOptions}
      />
    );

    expect(screen.getByText('Chat model:')).toBeInTheDocument();
    expect(screen.getByText(/Model A/)).toBeInTheDocument();
  });

  it('triggers onChange when a different model is selected', async () => {
    const onChangeMock = jest.fn();
    const { container } = render(
      <ModelList
        className="test-class"
        label="Chat model"
        value="model-a"
        onChange={onChangeMock}
        status={ModelStatus.missing}
        options={modelOptions}
      />
    );

    // Find and click the Select container to open the dropdown
    const selectContainer = container.querySelector('.test-class .css-qjwlhn-control');
    fireEvent.mouseDown(selectContainer!);

    // Use a more flexible text matcher for Model B
    const option = screen.getByText((content, element) => {
      return element?.textContent === 'Model B';
    });
    fireEvent.click(option);

    expect(onChangeMock).toHaveBeenCalledWith(modelOptions[1]);
  });

  it('shows status message when model is missing', () => {
    render(
      <ModelList
        className="test-class"
        label="Chat model"
        value="model-a"
        onChange={() => {}}
        status={ModelStatus.missing}
        options={modelOptions}
      />
    );

    expect(screen.getByText('(will be pulled automatically)')).toBeInTheDocument();
  });

  it('displays provided info for model options', () => {
    render(
      <ModelList
        className="test-class"
        label="Chat model"
        value="model-a"
        onChange={() => {}}
        status={ModelStatus.installed}
        options={modelOptions}
      />
    );

    expect(screen.getByText('1 GB')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    const { container } = render(
      <ModelList
        className="test-class"
        label="Chat model"
        value="model-a"
        onChange={() => {}}
        status={ModelStatus.installed}
        options={modelOptions}
        disabled={true}
      />
    );

    // Check for the disabled attribute on the container div
    const selectContainer = container.querySelector('.test-class .css-1nsxtct-control');
    expect(selectContainer).toHaveAttribute('aria-disabled', 'true');
  });
});