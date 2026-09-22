import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AudioCapsule } from '../AudioCapsule';

describe('AudioCapsule Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    });
  });

  it('renders audio title, metadata, and toggles play state cleanly within act()', async () => {
    const { container } = render(
      <AudioCapsule
        audioCapsuleId="audio-matjiesfontein-ghost"
        audioUrl="/audio/test.mp3"
        title="Legends of Matjiesfontein"
        durationSeconds={120}
        isOpen={true}
      />
    );

    expect(screen.getByText('Legends of Matjiesfontein')).toBeInTheDocument();
    expect(screen.getByText('2:00')).toBeInTheDocument();

    // Trigger metadata load to activate the play button
    const audioElement = container.querySelector('audio');
    expect(audioElement).not.toBeNull();
    if (audioElement) {
      act(() => {
        fireEvent.loadedMetadata(audioElement);
      });
    }

    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(playButton);
    });

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <AudioCapsule
        audioUrl="/audio/test.mp3"
        title="Karoo Star Whisper"
        durationSeconds={90}
        isOpen={true}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /dismiss audio player/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies hidden CSS transform classes when isOpen is false', () => {
    render(
      <AudioCapsule
        audioUrl="/audio/test.mp3"
        title="De Aar Junction"
        durationSeconds={60}
        isOpen={false}
      />
    );

    const aside = screen.getByLabelText('Audio Capsule Player');
    expect(aside.className).toContain('translate-y-24');
    expect(aside.className).toContain('opacity-0');
  });
});