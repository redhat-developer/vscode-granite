import { render, act } from '@testing-library/react';
import ProgressBar from './ProgressBar';
import { ProgressData } from '../../src/commons/progressData';
import '@testing-library/jest-dom';

describe('ProgressBar Component', () => {
  let dateNowSpy: jest.SpyInstance;
  let currentTime = 1635724800000;

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    jest.useFakeTimers();
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    jest.useRealTimers();
    currentTime = 1635724800000;
  });

  const progressData: ProgressData = {
    key: 'model-a',
    status: 'Downloading',
    completed: 500 * 1024 * 1024, // 500 MB
    total: 1000 * 1024 * 1024,    // 1 GB
    increment: 100 * 1024 * 1024, // 100 MB increment
  };

  const advanceTimerAndUpdateTime = async () => {
    await act(async () => {
      // Advance timers
      jest.advanceTimersByTime(1000);
      // Update mocked time
      currentTime += 1000;
      dateNowSpy.mockImplementation(() => currentTime);
    });
  };

  it('displays the correct progress information', async () => {
    const { container, rerender } = render(<ProgressBar data={{ ...progressData }} id="model-a" />);

    // Create a previous state for speed calculation
    await advanceTimerAndUpdateTime();
    rerender(<ProgressBar data={{ 
      ...progressData,
      completed: 400 * 1024 * 1024 // Set a previous value for speed calculation
    }} id="model-a" />);

    await advanceTimerAndUpdateTime();
    rerender(<ProgressBar data={progressData} id="model-a" />);

    // Now verify the content
    const label = container.querySelector('.progress-status');
    expect(label?.textContent).toContain('Downloading');

    const infoDiv = container.querySelector('div[style*="text-align: right"]');
    expect(infoDiv?.textContent).toContain('500.00 MB');
  });

  it('shows progress updates', async () => {
    const { container, rerender } = render(<ProgressBar data={progressData} id="model-a" />);

    // Initial state
    await advanceTimerAndUpdateTime();

    // Update progress
    const updatedData = {
      ...progressData,
      completed: 750 * 1024 * 1024, // 750 MB
    };

    rerender(<ProgressBar data={updatedData} id="model-a" />);
    await advanceTimerAndUpdateTime();

    const infoDiv = container.querySelector('div[style*="text-align: right"]');
    expect(infoDiv?.textContent).toContain('750.00 MB');

    const progressBar = container.querySelector('.progress-bar');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('shows estimated time remaining', async () => {
    const { container, rerender } = render(<ProgressBar data={progressData} id="model-a" />);
    await advanceTimerAndUpdateTime();
    rerender(<ProgressBar data={progressData} id="model-a" />);

    const timeDiv = container.querySelector('div[style*="font-size: 12px"]');
    expect(timeDiv?.textContent).toContain('est. time:');
  });

  it('hides when status is success', async () => {
    const successData = {
      ...progressData,
      status: 'success'
    };

    const { container } = render(<ProgressBar data={successData} id="model-a" />);
    await advanceTimerAndUpdateTime();
    expect(container.firstChild).toBeNull();
  });

  it('shows zero progress initially', async () => {
    const initialData = {
      ...progressData,
      completed: 0,
    };

    const { container, rerender } = render(<ProgressBar data={initialData} id="model-a" />);
    await advanceTimerAndUpdateTime();
    rerender(<ProgressBar data={initialData} id="model-a" />);

    const infoDiv = container.querySelector('div[style*="text-align: right"]');
    expect(infoDiv?.textContent).toContain('0.00 MB');

    const progressBar = container.querySelector('.progress-bar');
    expect(progressBar).toHaveStyle({ width: '0%' });
  });

  it('calculates speed correctly', async () => {
    const { container, rerender } = render(<ProgressBar data={{
      ...progressData,
      completed: 400 * 1024 * 1024
    }} id="model-a" />);

    await advanceTimerAndUpdateTime();

    // Update with new progress value
    rerender(<ProgressBar data={progressData} id="model-a" />);
    await advanceTimerAndUpdateTime();

    const infoDiv = container.querySelector('div[style*="text-align: right"]');
    expect(infoDiv?.textContent).toContain('MB/s');
  });
});
