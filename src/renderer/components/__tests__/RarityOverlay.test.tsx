import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  RarityOverlay, 
  RarityBorder, 
  RarityGlow, 
  RarityText,
  getRarityClassName,
  getRarityCSSVariables
} from '../RarityOverlay';
import { CS2_RARITY_LEVELS } from '../../../types';

describe('RarityOverlay Components', () => {
  const testContent = <div>Test Content</div>;

  describe('RarityOverlay', () => {
    test('renders with valid rarity', () => {
      render(
        <RarityOverlay rarity="consumer">
          {testContent}
        </RarityOverlay>
      );

      const overlay = screen.getByText('Test Content').closest('.rarity-overlay');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('rarity-consumer');
      expect(overlay).toHaveAttribute('data-rarity', 'consumer');
      expect(overlay).toHaveAttribute('data-rarity-name', 'Consumer Grade');
    });

    test('renders without rarity effects for invalid rarity', () => {
      render(
        <RarityOverlay rarity="invalid">
          {testContent}
        </RarityOverlay>
      );

      const container = screen.getByText('Test Content').parentElement;
      expect(container).not.toHaveClass('rarity-overlay');
      expect(container).not.toHaveAttribute('data-rarity');
    });

    test('applies custom className and style', () => {
      const customStyle = { margin: '10px' };
      render(
        <RarityOverlay 
          rarity="industrial" 
          className="custom-class"
          style={customStyle}
        >
          {testContent}
        </RarityOverlay>
      );

      const overlay = screen.getByText('Test Content').closest('.rarity-overlay');
      expect(overlay).toHaveClass('custom-class');
      expect(overlay).toHaveStyle('margin: 10px');
    });

    test('shows rarity badge', () => {
      render(
        <RarityOverlay rarity="milspec">
          {testContent}
        </RarityOverlay>
      );

      const badge = document.querySelector('.rarity-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('title', 'Mil-Spec');
      expect(badge).toHaveStyle('background-color: #4B69FF');
    });

    test('applies correct intensity settings', () => {
      const { rerender } = render(
        <RarityOverlay rarity="restricted" intensity="subtle">
          {testContent}
        </RarityOverlay>
      );

      let overlay = screen.getByText('Test Content').closest('.rarity-overlay');
      expect(overlay).toHaveStyle('border: 2px solid rgba(136, 71, 255, 0.3)');

      rerender(
        <RarityOverlay rarity="restricted" intensity="intense">
          {testContent}
        </RarityOverlay>
      );

      overlay = screen.getByText('Test Content').closest('.rarity-overlay');
      expect(overlay).toHaveStyle('border: 2px solid rgba(136, 71, 255, 0.8)');
    });

    test('can disable glow effect', () => {
      render(
        <RarityOverlay rarity="classified" showGlow={false}>
          {testContent}
        </RarityOverlay>
      );

      const overlay = screen.getByText('Test Content').closest('.rarity-overlay');
      expect(overlay).toHaveStyle('box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1)');
    });

    test('shows tooltip with rarity information', () => {
      render(
        <RarityOverlay rarity="covert">
          {testContent}
        </RarityOverlay>
      );

      const overlay = screen.getByText('Test Content').closest('.rarity-overlay');
      expect(overlay).toHaveAttribute('title', 'Covert (0.200%)');
    });
  });

  describe('RarityBorder', () => {
    test('renders with rarity border', () => {
      render(
        <RarityBorder rarity="exceedinglyRare">
          {testContent}
        </RarityBorder>
      );

      const border = screen.getByText('Test Content').closest('.rarity-border');
      expect(border).toBeInTheDocument();
      expect(border).toHaveClass('rarity-exceedinglyRare');
      expect(border).toHaveAttribute('data-rarity', 'exceedinglyRare');
      expect(border).toHaveAttribute('title', 'Exceedingly Rare');
      expect(border).toHaveStyle('border: 2px solid #FFD700');
    });

    test('applies custom thickness', () => {
      render(
        <RarityBorder rarity="consumer" thickness={5}>
          {testContent}
        </RarityBorder>
      );

      const border = screen.getByText('Test Content').closest('.rarity-border');
      expect(border).toHaveStyle('border: 5px solid #B0C3D9');
    });

    test('handles invalid rarity gracefully', () => {
      render(
        <RarityBorder rarity="invalid">
          {testContent}
        </RarityBorder>
      );

      const container = screen.getByText('Test Content').parentElement;
      expect(container).not.toHaveClass('rarity-border');
    });
  });

  describe('RarityGlow', () => {
    test('renders with glow effect', () => {
      render(
        <RarityGlow rarity="industrial">
          {testContent}
        </RarityGlow>
      );

      const glow = screen.getByText('Test Content').closest('.rarity-glow');
      expect(glow).toBeInTheDocument();
      expect(glow).toHaveClass('rarity-industrial');
      expect(glow).toHaveAttribute('data-rarity', 'industrial');
      expect(glow).toHaveStyle('filter: drop-shadow(0 0 10px #5E98D9)');
    });

    test('applies different intensity levels', () => {
      const { rerender } = render(
        <RarityGlow rarity="milspec" intensity="subtle">
          {testContent}
        </RarityGlow>
      );

      let glow = screen.getByText('Test Content').closest('.rarity-glow');
      expect(glow).toHaveStyle('filter: drop-shadow(0 0 5px #4B69FF)');

      rerender(
        <RarityGlow rarity="milspec" intensity="intense">
          {testContent}
        </RarityGlow>
      );

      glow = screen.getByText('Test Content').closest('.rarity-glow');
      expect(glow).toHaveStyle('filter: drop-shadow(0 0 20px #4B69FF)');
    });
  });

  describe('RarityText', () => {
    test('renders with rarity color', () => {
      render(
        <RarityText rarity="restricted">
          Rare Item
        </RarityText>
      );

      const text = screen.getByText('Rare Item');
      expect(text).toHaveClass('rarity-text');
      expect(text).toHaveClass('rarity-restricted');
      expect(text).toHaveAttribute('data-rarity', 'restricted');
      expect(text).toHaveStyle('color: #8847FF');
    });

    test('applies gradient variant', () => {
      render(
        <RarityText rarity="classified" variant="gradient">
          Gradient Text
        </RarityText>
      );

      const text = screen.getByText('Gradient Text');
      expect(text).toHaveStyle('background: linear-gradient(45deg, #D32CE6, rgb(255, 94, 255))');
      // Note: webkit styles may not be testable in jsdom environment
      expect(text).toHaveStyle('background-clip: text');
    });

    test('applies outline variant', () => {
      render(
        <RarityText rarity="covert" variant="outline">
          Outline Text
        </RarityText>
      );

      const text = screen.getByText('Outline Text');
      expect(text).toHaveStyle('color: rgba(0, 0, 0, 0)');
      expect(text).toHaveStyle('-webkit-text-stroke: 1px #EB4B4B');
    });

    test('handles invalid rarity', () => {
      render(
        <RarityText rarity="invalid">
          Invalid Rarity
        </RarityText>
      );

      const text = screen.getByText('Invalid Rarity');
      expect(text).not.toHaveClass('rarity-text');
      expect(text).not.toHaveAttribute('data-rarity');
    });
  });

  describe('Utility Functions', () => {
    test('getRarityClassName returns correct class name', () => {
      expect(getRarityClassName('consumer')).toBe('rarity-consumer');
      expect(getRarityClassName('exceedinglyRare')).toBe('rarity-exceedinglyRare');
    });

    test('getRarityCSSVariables returns correct CSS variables', () => {
      const variables = getRarityCSSVariables('consumer');
      expect(variables).toEqual({
        '--rarity-color': '#B0C3D9',
        '--rarity-rgb': '176, 195, 217',
        '--rarity-name': 'Consumer Grade',
        '--rarity-chance': '0.79695'
      });
    });

    test('getRarityCSSVariables handles invalid rarity', () => {
      const variables = getRarityCSSVariables('invalid');
      expect(variables).toEqual({});
    });

    test('getRarityCSSVariables works for all valid rarities', () => {
      Object.keys(CS2_RARITY_LEVELS).forEach(rarity => {
        const variables = getRarityCSSVariables(rarity);
        expect(variables['--rarity-color']).toBeDefined();
        expect(variables['--rarity-rgb']).toBeDefined();
        expect(variables['--rarity-name']).toBeDefined();
        expect(variables['--rarity-chance']).toBeDefined();
      });
    });
  });

  describe('Accessibility', () => {
    test('components have proper ARIA attributes', () => {
      render(
        <RarityOverlay rarity="consumer">
          <button>Test Button</button>
        </RarityOverlay>
      );

      const overlay = screen.getByRole('button').closest('.rarity-overlay');
      expect(overlay).toHaveAttribute('title');
      expect(overlay).toHaveAttribute('data-rarity-name');
    });

    test('rarity badge has proper title attribute', () => {
      render(
        <RarityOverlay rarity="milspec">
          {testContent}
        </RarityOverlay>
      );

      const badge = document.querySelector('.rarity-badge');
      expect(badge).toHaveAttribute('title', 'Mil-Spec');
    });
  });

  describe('Color Calculations', () => {
    test('components handle all CS2 rarity colors correctly', () => {
      Object.entries(CS2_RARITY_LEVELS).forEach(([key, rarity]) => {
        const { container } = render(
          <RarityBorder rarity={key}>
            Test
          </RarityBorder>
        );

        const border = container.querySelector('.rarity-border');
        expect(border).toHaveStyle(`border: 2px solid ${rarity.color}`);
      });
    });

    test('gradient calculations work for all rarities', () => {
      Object.keys(CS2_RARITY_LEVELS).forEach(rarity => {
        const variables = getRarityCSSVariables(rarity);
        const rgbMatch = variables['--rarity-rgb'].match(/^(\d+), (\d+), (\d+)$/);
        expect(rgbMatch).toBeTruthy();
        
        if (rgbMatch) {
          const [, r, g, b] = rgbMatch;
          expect(parseInt(r)).toBeGreaterThanOrEqual(0);
          expect(parseInt(r)).toBeLessThanOrEqual(255);
          expect(parseInt(g)).toBeGreaterThanOrEqual(0);
          expect(parseInt(g)).toBeLessThanOrEqual(255);
          expect(parseInt(b)).toBeGreaterThanOrEqual(0);
          expect(parseInt(b)).toBeLessThanOrEqual(255);
        }
      });
    });
  });
});