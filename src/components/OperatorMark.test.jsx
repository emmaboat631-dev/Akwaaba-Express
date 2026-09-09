import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OperatorMark from './OperatorMark';

const STC = { id: 'stc', name: 'STC Intercity', mark: 'STC', color: '#274F9E' };
const VIP = { id: 'vip', name: 'VIP Jeoun', mark: 'VIP', color: '#B5544A' };
const OA = { id: 'oa', name: 'OA Travel', mark: 'OA', color: '#1F6B44' };

describe('OperatorMark', () => {
  it('renders the operator monogram', () => {
    render(<OperatorMark operator={STC} />);
    expect(screen.getByText('STC')).toBeInTheDocument();
  });

  it('exposes the operator colour as a CSS variable', () => {
    const { container } = render(<OperatorMark operator={VIP} />);
    expect(container.querySelector('.op-mark').style.getPropertyValue('--op')).toBe('#B5544A');
  });

  it('defaults to a 44px square', () => {
    const { container } = render(<OperatorMark operator={STC} />);
    expect(container.querySelector('.op-mark')).toHaveStyle({ width: '44px', height: '44px' });
  });

  it('honours a custom size', () => {
    const { container } = render(<OperatorMark operator={STC} size={64} />);
    expect(container.querySelector('.op-mark')).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('scales the corner radius with the size', () => {
    const { container } = render(<OperatorMark operator={STC} size={100} />);
    expect(container.querySelector('.op-mark')).toHaveStyle({ borderRadius: '32px' });
  });

  describe('missing operator', () => {
    it('renders a placeholder instead of throwing when undefined', () => {
      expect(() => render(<OperatorMark operator={undefined} />)).not.toThrow();
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('renders a placeholder when null', () => {
      render(<OperatorMark operator={null} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('falls back to a neutral colour', () => {
      const { container } = render(<OperatorMark operator={null} />);
      expect(container.querySelector('.op-mark').style.getPropertyValue('--op')).toBe('var(--muted)');
    });

    it('tolerates an operator with no mark', () => {
      render(<OperatorMark operator={{ color: '#123456' }} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('keeps the operator colour when only the mark is missing', () => {
      const { container } = render(<OperatorMark operator={{ color: '#123456' }} />);
      expect(container.querySelector('.op-mark').style.getPropertyValue('--op')).toBe('#123456');
    });
  });

  it('shrinks the type for a three-letter mark', () => {
    const { container: three } = render(<OperatorMark operator={STC} size={100} />);
    const { container: two } = render(<OperatorMark operator={OA} size={100} />);
    const size = (c) => parseFloat(c.querySelector('.op-mark').style.fontSize);
    expect(size(three)).toBeLessThan(size(two));
  });
});
