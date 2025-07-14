import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders tube sort puzzle game', () => {
  render(<App />);
  const titleElement = screen.getByText(/tube sort puzzle/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders game instructions', () => {
  render(<App />);
  const instructionElement = screen.getByText(/pour the colored liquid so each tube contains only one color/i);
  expect(instructionElement).toBeInTheDocument();
});
