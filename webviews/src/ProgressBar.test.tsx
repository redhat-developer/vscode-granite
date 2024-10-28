import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar';
import { ProgressData } from '../../src/commons/progressData';
import '@testing-library/jest-dom';
//import React from 'react';


describe('ProgressBar Component', () => {
  const progressData: ProgressData = {
    key: 'model-a',
    status: 'Downloading',
    completed: 500 * 1024 * 1024, // 500 MB
    total: 1000 * 1024 * 1024,    // 1 GB
    increment: 100 * 1024 * 1024, // 100 MB increment
  };

  it('displays the correct progress information', () => {
    render(<ProgressBar data={progressData} id="model-a" />);
    expect(screen.getByText(/500.00 MB \/ 1.00 GB/i)).toBeInTheDocument();
    expect(screen.getByText(/Downloading/i)).toBeInTheDocument();
  });
});