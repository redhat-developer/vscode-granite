import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

describe('App Component', () => {
  it('renders the main title', () => {
    render(<App />);
    const titleElement = screen.getByText(/Setup IBM Granite Code as your code assistant with Continue/i);
    expect(titleElement).toBeInTheDocument();
  });

  it('sends a message to vscode when the Setup Granite button is clicked', () => {
    // Mock the vscode object
    const postMessageMock = jest.fn();
    (window as any).vscode = { postMessage: postMessageMock };

    render(<App />);
    const setupButton = screen.getByText(/Setup Granite Code/i);
    fireEvent.click(setupButton);

    expect(postMessageMock).toHaveBeenCalledWith({
      command: 'setupGranite',
      data: expect.any(Object),
    });
  });
});

