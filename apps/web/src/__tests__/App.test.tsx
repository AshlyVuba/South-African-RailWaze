import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../App';

describe('frontend demo launch route', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('opens the operations portal directly for the demo query parameter', () => {
    window.history.replaceState({}, '', '/?demo=operations');

    render(<App />);

    expect(screen.getByRole('heading', { name: /Operations & Reassurance Portal/i })).toBeInTheDocument();
    expect(screen.getByText('Your journey is in good hands.')).toBeInTheDocument();
  });
});
