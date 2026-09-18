import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedViewport } from '../UnifiedViewport';

describe('UnifiedViewport Definition of Done', () => {
  it('renders MapCanvas without opening the Memory Vault initially', () => {
    render(<UnifiedViewport />);

    // MapCanvas is mounted underneath
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument();

    // Drawer is closed initially
    expect(screen.queryByLabelText('Station Memory Vault')).not.toBeInTheDocument();
  });

  it('tapping Pretoria waypoint opens Pretoria card (not any other station)', () => {
    render(<UnifiedViewport />);

    // Tap Pretoria waypoint marker button
    const pretoriaBtn = screen.getByRole('button', { name: /Select Pretoria Station/i });
    fireEvent.click(pretoriaBtn);

    // Verify Pretoria Vault card opens
    const vault = screen.getByLabelText('Station Memory Vault');
    expect(vault).toBeInTheDocument();
    expect(screen.getByText('Pretoria Station Vault')).toBeInTheDocument();
    expect(screen.getByText(/Station ID:\s*pretoria/i)).toBeInTheDocument();

    // Ensure it is NOT showing another station's card
    expect(screen.queryByText('Kimberley Station Vault')).not.toBeInTheDocument();
  });

  it('tapping a different station opens that specific station card', () => {
    render(<UnifiedViewport />);

    // Tap Kimberley waypoint marker button
    const kimberleyBtn = screen.getByRole('button', { name: /Select Kimberley Station/i });
    fireEvent.click(kimberleyBtn);

    // Verify Kimberley Vault card opens
    expect(screen.getByText('Kimberley Station Vault')).toBeInTheDocument();
    expect(screen.getByText(/Station ID:\s*kimberley/i)).toBeInTheDocument();
    expect(screen.queryByText('Pretoria Station Vault')).not.toBeInTheDocument();
  });

  it('closing the card dismisses the drawer while preserving map mount state', () => {
    render(<UnifiedViewport />);

    // Open card
    fireEvent.click(screen.getByRole('button', { name: /Select Pretoria Station/i }));
    expect(screen.getByLabelText('Station Memory Vault')).toBeInTheDocument();

    // Map canvas remains present in DOM
    const mapCanvas = screen.getByTestId('map-canvas');
    expect(mapCanvas).toBeInTheDocument();

    // Close card
    const closeBtn = screen.getByRole('button', { name: /Close card/i });
    fireEvent.click(closeBtn);

    // Drawer is removed
    expect(screen.queryByLabelText('Station Memory Vault')).not.toBeInTheDocument();

    // Map canvas was NOT unmounted, preserving zoom and position
    expect(screen.getByTestId('map-canvas')).toBe(mapCanvas);
  });
});