import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { UnifiedViewport } from '../UnifiedViewport';

describe('UnifiedViewport', () => {
    it('renders without crashing', () => {
        const { container } = render(<UnifiedViewport />);
        expect(container).toBeTruthy();
    });
});