'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Card } from '@/app/marketplace';
import type { Product } from '@/lib/catalog';

type CardPosition = {
  left: number;
  top: number;
  width: number;
  height: number;
  node: HTMLElement;
};

/** Native enter/exit and FLIP movement preserve identity as results refine. */
export function ProductCanvas({
  products,
  numbered = false,
  focusedIds = [],
}: {
  products: Product[];
  numbered?: boolean;
  focusedIds?: string[];
}) {
  const grid = useRef<HTMLDivElement>(null);
  const exitLayer = useRef<HTMLDivElement>(null);
  const previous = useRef(new Map<string, CardPosition>());
  const exits = useRef(new Set<Animation>());
  useEffect(
    () => () => {
      exits.current.forEach((animation) => animation.cancel());
    },
    [],
  );
  useLayoutEffect(() => {
    const nodes = Array.from(
      grid.current?.querySelectorAll<HTMLElement>('[data-product-id]') || [],
    );
    const next = new Map<string, CardPosition>();
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const present = new Set(products.map((p) => p.id));
    if (!reduce && exitLayer.current) {
      previous.current.forEach((old, id) => {
        if (present.has(id) || !old.node.animate) return;
        // Outgoing visuals are inert and never included in the numbered results.
        const clone = old.node.cloneNode(true) as HTMLElement;
        clone.inert = true;
        clone.removeAttribute('data-product-id');
        clone.setAttribute('aria-hidden', 'true');
        Object.assign(clone.style, {
          position: 'absolute',
          left: `${old.left - window.scrollX}px`,
          top: `${old.top - window.scrollY}px`,
          width: `${old.width}px`,
          height: `${old.height}px`,
          margin: '0',
        });
        clone.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
          el.style.viewTransitionName = 'none';
        });
        exitLayer.current!.appendChild(clone);
        const animation = clone.animate(
          [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'translateY(-8px) scale(.96)' },
          ],
          { duration: 170, easing: 'ease-out', fill: 'forwards' },
        );
        exits.current.add(animation);
        void animation.finished
          .catch(() => {})
          .finally(() => {
            clone.remove();
            exits.current.delete(animation);
          });
      });
    }
    nodes.forEach((node, index) => {
      const id = node.dataset.productId!;
      node.getAnimations().forEach((animation) => animation.cancel());
      const rect = node.getBoundingClientRect();
      const position = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
        node,
      };
      const old = previous.current.get(id);
      next.set(id, position);
      if (reduce || !node.animate) return;
      if (old) {
        const x = old.left - position.left,
          y = old.top - position.top;
        if (Math.abs(x) + Math.abs(y) > 1)
          node.animate(
            [
              { transform: `translate(${x}px,${y}px)` },
              { transform: 'translate(0,0)' },
            ],
            { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' },
          );
      } else
        node.animate(
          [
            {
              opacity: 0,
              transform: 'translateY(24px) scale(.97)',
              filter: 'blur(5px)',
            },
            {
              opacity: 1,
              transform: 'translateY(0) scale(1)',
              filter: 'blur(0)',
            },
          ],
          {
            duration: 540,
            delay: Math.min(index, 7) * 45,
            easing: 'cubic-bezier(.22,1,.36,1)',
            fill: 'backwards',
          },
        );
    });
    previous.current = next;
  }, [products]);
  return (
    <>
      <div ref={grid} className="product-grid spatial-grid">
        {products.map((p, index) => (
          <div
            key={p.id}
            data-product-id={p.id}
            className={
              'spatial-card ' + (focusedIds.includes(p.id) ? 'is-focused' : '')
            }
          >
            <Card p={p} ordinal={numbered ? index + 1 : undefined} />
          </div>
        ))}
      </div>
      <div ref={exitLayer} className="canvas-exit-layer" aria-hidden="true" />
    </>
  );
}
