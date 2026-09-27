import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OperationsPortal } from '../OperationsPortal';

describe('RailWaze Operations & Reassurance Portal demo', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows passenger reassurance, saves an offline beacon, and updates the ETA', () => {
    render(<OperationsPortal />);

    expect(screen.getByText(/Karoo Line Maintenance: Minor delay ahead/)).toBeInTheDocument();
    expect(screen.getByText('Updated arrival estimate')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save offline assistance request/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/saved locally/i);
    expect(JSON.parse(localStorage.getItem('railwaze:emergency-beacons') || '[]')).toHaveLength(1);

    const arrivalCard = screen.getByText('Updated arrival estimate').closest('article');
    const originalEstimate = within(arrivalCard as HTMLElement).getByText(/\d{1,2}:\d{2}/).textContent;
    fireEvent.click(screen.getByRole('button', { name: /refresh estimate/i }));
    expect(within(arrivalCard as HTMLElement).getByText(/\d{1,2}:\d{2}/).textContent).not.toBe(originalEstimate);
  });

  it('switches to staff operations, publishes passenger updates, and requests relief transport', () => {
    render(<OperationsPortal />);
    fireEvent.click(screen.getByRole('button', { name: /driver \/ receptionist/i }));

    expect(screen.getByRole('region', { name: /staff operations dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Simulated GPS telemetry/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Passenger message'), {
      target: { value: 'The line is clear. We are moving again and your ETA has improved.' },
    });
    fireEvent.change(screen.getByLabelText('Update category'), { target: { value: 'all-clear' } });
    fireEvent.click(screen.getByRole('button', { name: /publish verified update/i }));
    expect(screen.getByText('The line is clear. We are moving again and your ETA has improved.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('railwaze:operations-broadcast') || '{}')).toMatchObject({
      type: 'all-clear',
      message: 'The line is clear. We are moving again and your ETA has improved.',
    });

    fireEvent.click(screen.getByRole('button', { name: /request auxiliary coaches/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/Two auxiliary coaches requested/);
    expect(screen.getByText('0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /passenger/i }));
    expect(screen.getByText('Your journey is in good hands.')).toBeInTheDocument();
    expect(screen.getByText('The line is clear. We are moving again and your ETA has improved.')).toBeInTheDocument();
    expect(screen.getByText('All clear')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to my journey/i })).toHaveAttribute('href', '/');
  });
});
