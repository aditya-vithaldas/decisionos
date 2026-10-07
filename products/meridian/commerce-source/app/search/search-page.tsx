'use client';
import { LiveEntry, dismissLiveHint } from '@/components/loop/live-entry';
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Search,
  Mic,
  Square,
  ArrowLeft,
  SlidersHorizontal,
  X,
  AudioLines,
  MapPin,
  Heart,
  ArrowUpRight,
  Sparkles,
  LoaderCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ProductDetails } from '@/components/loop/product-details';
import { LiveToolBatches } from '@/lib/gpt-live';
import { Footer } from '../marketplace';
import {
  categories,
  products,
  type Product,
  initialFilters,
  searchProducts,
  money,
  type Filters,
} from '@/lib/catalog';
import {
  distinctProducts,
  resolveProductReferences,
} from '@/lib/product-context';
import { validateFilters } from '@/lib/live';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { LiveWaveform } from '@/components/loop/live-waveform';
import { ProductCanvas } from '@/components/loop/product-canvas';
import { Slider } from '@/components/ui/slider';
function Choice({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {values.map((v) => (
          <SelectItem key={v} value={v}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export default function SearchPage({
  initialLive = false,
  initialProductId,
}: {
  initialLive?: boolean;
  initialProductId?: string;
}) {
  const [f, setF] = useState<Filters>(initialFilters),
    [detailProduct, setDetailProduct] = useState<Product | null>(
      () => products.find((p) => p.id === initialProductId) ?? null,
    ),
    [input, setInput] = useState(''),
    [limit, setLimit] = useState(24),
    [savedOnly, setSavedOnly] = useState(false),
    [savedIds, setSavedIds] = useState<string[]>([]),
    [status, setStatus] = useState('idle'),
    [error, setError] = useState(''),
    [transcript, setTranscript] = useState(''),
    [liveMode, setLiveMode] = useState(initialLive),
    [hasIntent, setHasIntent] = useState(false),
    [assistantText, setAssistantText] = useState(''),
    [answerIds, setAnswerIds] = useState<string[]>([]),
    [muted, setMuted] = useState(false),
    [audioBlocked, setAudioBlocked] = useState(false);
  const peer = useRef<RTCPeerConnection | null>(null),
    stream = useRef<MediaStream | null>(null),
    channel = useRef<RTCDataChannel | null>(null),
    generation = useRef(0),
    sessionStarted = useRef(false),
    abort = useRef<AbortController | null>(null),
    timeout = useRef<ReturnType<typeof setTimeout> | null>(null),
    filters = useRef(f);
  filters.current = f;
  const detailRef = useRef(detailProduct);
  detailRef.current = detailProduct;
  const active = ['listening', 'hearing', 'searching', 'speaking'].includes(
    status,
  );
  const result = useMemo(() => {
    const matches = searchProducts(f).filter(
      (p) => !savedOnly || savedIds.includes(p.id),
    );
    return liveMode ? distinctProducts(matches) : matches;
  }, [f, savedOnly, savedIds, liveMode]);
  const visible = useMemo(
    () =>
      detailProduct
        ? [detailProduct]
        : liveMode && !hasIntent
          ? []
          : result.slice(0, limit),
    [result, limit, liveMode, hasIntent, detailProduct],
  );
  const resultsContext = useRef<Product[]>([]);
  resultsContext.current = hasIntent ? result.slice(0, limit) : [];
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const turnProducts = useRef(visible),
    speaker = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (speaker.current) speaker.current.muted = muted;
  }, [muted]);
  function showProduct(product: Product | null, updateUrl = true) {
    detailRef.current = product;
    setDetailProduct(product);
    const context = product ? [product] : resultsContext.current;
    visibleRef.current = context;
    turnProducts.current = context;
    setAssistantText('');
    setAnswerIds(product ? [product.id] : []);
    if (updateUrl)
      history.pushState(
        null,
        '',
        product ? `/commerce/product/${product.id}?live=1` : '/commerce/search?live=1',
      );
    if (channel.current?.readyState === 'open') {
      channel.current.send(
        JSON.stringify({
          type: 'response.item.create',
          event_id: crypto.randomUUID(),
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text:
                  'Application navigation context: ' +
                  JSON.stringify({
                    view: product ? 'product details' : 'search results',
                    activeProduct: product?.name ?? null,
                    visible: context.map((p, i) => ({
                      position: i + 1,
                      id: p.id,
                      name: p.name,
                    })),
                    note: product
                      ? 'Unqualified follow-up questions refer to this product, number 1. Keep the current live conversation going.'
                      : 'Use these result numbers for follow-up questions.',
                  }),
              },
            ],
          },
        }),
      );
      channel.current.send(
        JSON.stringify({
          type: 'session.thinking.append',
          event_id: crypto.randomUUID(),
          delegation_id: null,
          content: product
            ? `The shopper opened ${product.name}. This is now the only product in the detail view, number 1. Questions about "it" refer to this product. Keep listening.`
            : 'The shopper returned to search results. Keep listening.',
        }),
      );
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  useEffect(() => {
    const onPopState = () => {
      const match = location.pathname.match(/^\/commerce\/product\/([^/]+)$/);
      showProduct(
        match ? (products.find((p) => p.id === match[1]) ?? null) : null,
        false,
      );
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [hasIntent, result, limit]);
  function stop() {
    sessionStarted.current = false;
    generation.current++;
    abort.current?.abort();
    if (timeout.current) clearTimeout(timeout.current);
    const closingChannel = channel.current;
    const closingPeer = peer.current;
    if (closingChannel?.readyState === 'open') {
      const close = () => {
        closingChannel.close();
        closingPeer?.close();
      };
      const deadline = window.setTimeout(close, 2000);
      closingChannel.addEventListener('message', (message) => {
        try {
          if (JSON.parse(message.data).type === 'session.closed') {
            window.clearTimeout(deadline);
            close();
          }
        } catch {}
      });
      closingChannel.send(JSON.stringify({ type: 'session.close' }));
    } else {
      closingChannel?.close();
      closingPeer?.close();
    }
    channel.current = null;
    peer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    speaker.current?.pause();
    if (speaker.current) speaker.current.srcObject = null;
    setStatus('idle');
  }
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    setF({
      ...initialFilters,
      query: q,
      category: categories.includes(params.get('category') || '')
        ? params.get('category')!
        : 'All electronics',
    });
    setInput(q);
    setSavedOnly(params.get('saved') === '1');
    setLiveMode(params.get('live') === '1');
    try {
      setSavedIds(JSON.parse(localStorage.getItem('loop-saved') || '[]'));
    } catch {}
    // Defer until mount completes; Strict Mode cleanup cancels the first attempt.
    const autoStart =
      params.get('live') === '1'
        ? window.setTimeout(() => {
            void start();
          }, 0)
        : undefined;
    return () => {
      window.clearTimeout(autoStart);
      stop();
    };
  }, []);
  useEffect(() => {
    setLimit(24);
  }, [f, savedOnly]);
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (t: unknown, o: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const controller = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: 'search_electronics',
          description:
            'Set catalog filters and return matching electronics listings.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              category: { type: 'string', enum: categories },
              maxPrice: { type: 'number' },
              condition: {
                type: 'string',
                enum: ['All', 'Like new', 'Good', 'Fair'],
              },
            },
            required: ['query', 'category', 'maxPrice', 'condition'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: async (args: unknown) => {
            const next = validateFilters(args);
            setHasIntent(true);
            setF(next);
            setInput(next.query);
            setSavedOnly(false);
            return {
              count: searchProducts(next).length,
              items: searchProducts(next)
                .slice(0, 8)
                .map((p) => ({ id: p.id, name: p.name, price: p.price })),
            };
          },
        },
        { signal: controller.signal },
      ),
    ).catch(() => {});
    return () => controller.abort();
  }, []);
  function change(next: Partial<Filters>) {
    const updated = { ...filters.current, ...next };
    setHasIntent(true);
    setF(updated);
    if (channel.current?.readyState === 'open')
      channel.current.send(
        JSON.stringify({
          type: 'response.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text:
                  'I changed the filters manually. Remember these for my next request: ' +
                  JSON.stringify(updated),
              },
            ],
          },
        }),
      );
  }
  async function start() {
    if (sessionStarted.current) return;
    sessionStarted.current = true;
    dismissLiveHint();
    setError('');
    setTranscript('');
    setStatus('connecting');
    setSavedOnly(false);
    setLiveMode(true);
    setAudioBlocked(false);
    if (!speaker.current) {
      speaker.current = new Audio();
      speaker.current.autoplay = true;
      speaker.current.setAttribute('playsinline', '');
    }
    speaker.current.muted = muted;
    turnProducts.current = visibleRef.current;
    const token = ++generation.current;
    abort.current = new AbortController();
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection)
        throw Error(
          'Voice shopping needs a browser with microphone support, such as Chrome or Safari.',
        );
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (token !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const pc = new RTCPeerConnection();
      peer.current = pc;
      pc.ontrack = (event) => {
        if (token !== generation.current || !speaker.current) return;
        speaker.current.srcObject =
          event.streams[0] || new MediaStream([event.track]);
        void speaker.current.play().catch(() => setAudioBlocked(true));
      };
      media.getTracks().forEach((t) => {
        pc.addTrack(t, media);
        t.onended = () => {
          if (token === generation.current) {
            stop();
            setError(
              'Microphone disconnected. Start again when it is available.',
            );
          }
        };
      });
      const dc = pc.createDataChannel('oai-events');
      channel.current = dc;
      const batches = new LiveToolBatches();
      let lastSpeaker = '';
      const transcriptFragments: {
        role: string;
        delta: string;
        start_ms: number;
        end_ms: number;
      }[] = [];
      dc.onmessage = (e) => {
        if (token !== generation.current) return;
        const send = (value: unknown) => {
          if (dc.readyState === 'open') dc.send(JSON.stringify(value));
        };
        const toolResult = (callId: string, output: unknown) =>
          send({
            type: 'response.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify(output),
            },
          });
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'session.started') {
            if (timeout.current) clearTimeout(timeout.current);
            setStatus('listening');
            send({
              type: 'response.item.create',
              event_id: crypto.randomUUID(),
              item: {
                type: 'message',
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text:
                      'Application context, not a new search request: ' +
                      JSON.stringify({
                        filters: filters.current,
                        activeProduct: detailRef.current?.name ?? null,
                        view: detailRef.current
                          ? 'Product page. Unqualified questions refer to this product, number 1.'
                          : 'Search results',
                        visible: visibleRef.current.map((p, i) => ({
                          position: i + 1,
                          id: p.id,
                          name: p.name,
                        })),
                      }),
                  },
                ],
              },
            });
          }
          if (event.type === 'session.closed') {
            stop();
            return;
          }
          if (
            event.type === 'session.input_transcript.delta' ||
            event.type === 'session.output_transcript.delta'
          ) {
            const role =
              event.type === 'session.input_transcript.delta'
                ? 'user'
                : 'assistant';
            transcriptFragments.push({
              role,
              delta: event.delta,
              start_ms: event.start_ms,
              end_ms: event.end_ms,
            });
            if (transcriptFragments.length > 1000) transcriptFragments.shift();
            // Display grouping only; transcript fragments never trigger catalog mutations.
            if (role === 'user') {
              if (lastSpeaker !== role) {
                turnProducts.current = visibleRef.current;
                setTranscript(event.delta);
                setAssistantText('');
              } else setTranscript((text) => text + event.delta);
            } else {
              if (lastSpeaker !== role) setAssistantText(event.delta);
              else setAssistantText((text) => text + event.delta);
            }
            lastSpeaker = role;
          }
          if (event.type === 'session.delegation.created') {
            turnProducts.current = visibleRef.current;
            setStatus('searching');
          }
          const calls = batches.receive(event);
          for (const event of calls) {
            if (event.name === 'stop_listening') {
              stop();
              return;
            }
            try {
              if (event.name === 'open_product') {
                const args = JSON.parse(event.arguments);
                const details = resolveProductReferences(
                  args,
                  turnProducts.current,
                );
                if (details.items.length !== 1) {
                  toolResult(event.call_id, {
                    error:
                      'Select exactly one product to open. Ask which product number the shopper means.',
                  });
                } else {
                  const selected = products.find(
                    (p) => p.id === details.items[0].id,
                  )!;
                  showProduct(selected);
                  toolResult(event.call_id, {
                    opened: true,
                    view: 'product page',
                    ...resolveProductReferences(
                      { positions: [1], productQuery: '' },
                      [selected],
                    ),
                    note: 'The live session continues. This detail view contains only this product, now number 1.',
                  });
                }
              }
              if (event.name === 'close_product') {
                showProduct(null);
                toolResult(event.call_id, {
                  view: 'search results',
                  items: visibleRef.current.map((p, i) => ({
                    position: i + 1,
                    name: p.name,
                  })),
                });
              }
              if (event.name === 'update_search') {
                if (detailRef.current) showProduct(null);

                const next = {
                  ...validateFilters(JSON.parse(event.arguments)),
                  location: filters.current.location,
                  sort: filters.current.sort,
                };
                const found = distinctProducts(searchProducts(next));
                setHasIntent(true);
                setF(next);
                setInput(next.query);
                setSavedOnly(false);
                setAnswerIds([]);
                setAssistantText('');
                resultsContext.current = found.slice(0, 24);
                turnProducts.current = resultsContext.current;
                visibleRef.current = resultsContext.current;
                toolResult(event.call_id, {
                  count: found.length,
                  items: turnProducts.current.map((p, i) => ({
                    position: i + 1,
                    id: p.id,
                    name: p.name,
                    priceINR: p.price,
                  })),
                  note: 'One representative listing per distinct model. These numbers match the visible canvas.',
                });
              }
              if (event.name === 'get_product_details') {
                const details = resolveProductReferences(
                  (() => {
                    const args = JSON.parse(event.arguments);
                    return detailRef.current &&
                      !args.positions?.length &&
                      !args.productQuery?.trim()
                      ? { positions: [1], productQuery: '' }
                      : args;
                  })(),
                  detailRef.current
                    ? [detailRef.current]
                    : turnProducts.current,
                );
                setAnswerIds(details.items.map((p) => p.id));
                setAssistantText('');
                toolResult(event.call_id, details);
              }
            } catch {
              toolResult(event.call_id, {
                error:
                  'The requested search or product reference is invalid. Ask the user to clarify instead of guessing.',
              });
            }
          }
          if (calls.length) {
            send({ type: 'response.create', event_id: crypto.randomUUID() });
          }
          if (
            event.type === 'response.event' &&
            [
              'response.completed',
              'response.failed',
              'response.incomplete',
            ].includes(event.event?.type)
          ) {
            setStatus('listening');
          }
          if (event.type === 'error') {
            stop();
            setError(
              'The voice session encountered a problem. Please start again.',
            );
          }
        } catch {
          setError(
            'I couldn’t understand that response. Please try your question again.',
          );
        }
      };
      pc.onconnectionstatechange = () => {
        if (
          token === generation.current &&
          ['failed', 'disconnected', 'closed'].includes(pc.connectionState)
        ) {
          stop();
          setError(
            'Voice connection lost. Your results are saved; start again to continue.',
          );
        }
      };
      timeout.current = setTimeout(() => {
        if (token === generation.current) {
          stop();
          setError('Could not establish a voice connection. Please try again.');
        }
      }, 30000);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const response = await fetch('/commerce/api/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
        signal: abort.current.signal,
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw Error(data.error || 'Could not connect to live shopping.');
      }
      const answer = (await response.json()) as { transport: { sdp: string } };
      if (token !== generation.current) return;
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answer.transport.sdp,
      });
    } catch (err) {
      if (token !== generation.current) return;
      stop();
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Allow microphone access in your browser, then try again.'
          : err instanceof Error
            ? err.message
            : 'Could not start live shopping.',
      );
    }
  }
  const filterControls = (
    <div className="filters">
      <div className="filter-title">
        <h2>Filters</h2>
        <button
          onClick={() => {
            change(initialFilters);
            setInput('');
            setSavedOnly(false);
          }}
        >
          Reset
        </button>
      </div>
      <h3>Category</h3>
      {categories.map((c) => (
        <button
          className={'category-filter ' + (f.category === c ? 'selected' : '')}
          key={c}
          onClick={() => change({ category: c })}
        >
          {c}
          <span>{c === f.category ? '✓' : ''}</span>
        </button>
      ))}
      <h3>Budget</h3>
      <p>
        Up to <b>{money(f.maxPrice)}</b>
      </p>
      <Slider
        value={[f.maxPrice]}
        max={150000}
        min={1000}
        step={1000}
        onValueChange={(v) => change({ maxPrice: Array.isArray(v) ? v[0] : v })}
        aria-label="Maximum price"
      />
      <h3>Condition</h3>
      <Choice
        label="Condition"
        value={f.condition}
        values={['All', 'Like new', 'Good', 'Fair']}
        onChange={(v) => change({ condition: v })}
      />
      <h3>Location</h3>
      <Choice
        label="Location"
        value={f.location}
        values={[
          'Bengaluru',
          'Indiranagar',
          'Koramangala',
          'Whitefield',
          'HSR Layout',
          'Jayanagar',
          'Marathahalli',
          'Bellandur',
          'Malleshwaram',
        ]}
        onChange={(v) => change({ location: v })}
      />
    </div>
  );
  const statusLabel =
    status === 'speaking'
      ? 'Loop is answering'
      : status === 'connecting'
        ? 'Connecting'
        : status === 'hearing'
          ? 'Listening to you'
          : status === 'searching'
            ? 'Finding your match'
            : active
              ? 'Listening'
              : hasIntent
                ? 'Paused'
                : 'Ready when you are';
  const errorNotice = error && (
    <div className="error" role="alert">
      {error}
      <button aria-label="Dismiss error" onClick={() => setError('')}>
        <X size={16} />
      </button>
    </div>
  );
  const refinements = (
    <div className="filter-chips">
      {f.category !== 'All electronics' && (
        <button onClick={() => change({ category: 'All electronics' })}>
          {f.category}
          <X size={13} />
        </button>
      )}
      {f.query && (
        <button
          onClick={() => {
            change({ query: '' });
            setInput('');
          }}
        >
          {f.query}
          <X size={13} />
        </button>
      )}
      {f.maxPrice < 150000 && (
        <button onClick={() => change({ maxPrice: 150000 })}>
          Under {money(f.maxPrice)}
          <X size={13} />
        </button>
      )}
      {f.condition !== 'All' && (
        <button onClick={() => change({ condition: 'All' })}>
          {f.condition}
          <X size={13} />
        </button>
      )}
    </div>
  );
  const productResults = result.length ? (
    <>
      <ProductCanvas
        products={visible}
        numbered={liveMode}
        focusedIds={answerIds}
      />
      {limit < result.length && (
        <div className="load-more">
          <button
            className="button outline"
            onClick={() => setLimit((n) => n + 24)}
          >
            More finds <ArrowUpRight size={16} />
          </button>
        </div>
      )}
    </>
  ) : (
    <div className="canvas-no-results">
      <Sparkles size={24} />
      <h2>A little too specific?</h2>
      <p>
        {savedOnly
          ? 'Save a find with the heart, and it’ll be here.'
          : liveMode
            ? 'Try saying “a higher budget” or “any brand”.'
            : 'Try another brand or broaden your budget.'}
      </p>
      {!liveMode && (
        <button
          className="button outline"
          onClick={() => {
            change(initialFilters);
            setInput('');
            setSavedOnly(false);
          }}
        >
          Explore everything
        </button>
      )}
    </div>
  );
  if (liveMode)
    return (
      <div className="live-space">
        <header className="live-band" data-status={status}>
          <a className="logo band-logo" href="/commerce/" aria-label="Loop home">
            loop<span>●</span>
          </a>
          <div className="band-identity">
            <span className={'connection-dot ' + (active ? 'connected' : '')} />
            <span>LIVE</span>
          </div>
          <LiveWaveform
            stream={stream.current}
            active={active}
            speaking={status === 'hearing'}
          />
          <button
            className="band-audio"
            aria-label={muted ? 'Unmute Loop voice' : 'Mute Loop voice'}
            onClick={() => {
              setMuted(!muted);
            }}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <div className="band-conversation">
            <span className="band-status" role="status">
              {statusLabel}
            </span>
            <p className="band-transcript">
              {transcript ||
                (active
                  ? 'Tell me what you’re looking for…'
                  : 'Try “Show me phones under ₹40,000”')}
            </p>
          </div>
          <button
            className={'button band-control ' + (active ? 'is-listening' : '')}
            onClick={status === 'idle' ? start : stop}
          >
            {status === 'idle' ? (
              <>
                <Mic size={17} />
                <span>{hasIntent ? 'Resume' : 'Start talking'}</span>
              </>
            ) : (
              <>
                {status === 'connecting' ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Square size={13} fill="currentColor" />
                )}
                <span>{status === 'connecting' ? 'Cancel' : 'Stop'}</span>
              </>
            )}
          </button>
          <a
            href="/commerce/search"
            className="band-exit"
            aria-label="Leave live shopping"
          >
            <X size={19} />
          </a>
        </header>
        <main
          className={
            'live-canvas ' +
            (detailProduct
              ? 'has-product'
              : hasIntent
                ? 'has-results'
                : 'is-empty')
          }
          onClick={(event) => {
            if (
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey ||
              event.altKey ||
              event.button !== 0
            )
              return;
            const anchor = (event.target as HTMLElement).closest('a');
            if (!anchor || anchor.target === '_blank') return;
            const url = new URL(anchor.href, location.origin);
            const match =
              url.origin === location.origin &&
              url.pathname.match(/^\/commerce\/product\/([^/]+)$/);
            const product = match && products.find((p) => p.id === match[1]);
            if (product) {
              event.preventDefault();
              showProduct(product);
            }
          }}
        >
          {errorNotice}
          {audioBlocked && (
            <button
              className="audio-unlock"
              onClick={() => {
                void speaker.current
                  ?.play()
                  .then(() => setAudioBlocked(false))
                  .catch(() =>
                    setError(
                      'Audio playback is blocked. Check your browser sound permissions.',
                    ),
                  );
              }}
            >
              <Volume2 size={16} /> Enable voice replies
            </button>
          )}
          {assistantText && (
            <section className="product-answer" aria-label="Loop’s answer">
              <div className="answer-mark">
                <AudioLines size={18} />
              </div>
              <div className="answer-content">
                <span className="eyebrow">
                  {answerIds.length
                    ? 'ABOUT ' +
                      answerIds
                        .map((id) =>
                          String(
                            visible.findIndex((p) => p.id === id) + 1,
                          ).padStart(2, '0'),
                        )
                        .join(' + ')
                    : 'LOOP'}
                </span>
                <p>{assistantText}</p>
                {/reviews?|people|like about/i.test(transcript) && (
                  <small className="answer-source">
                    Based on illustrative sample reviews.
                  </small>
                )}
              </div>
            </section>
          )}
          {detailProduct ? (
            <div className="live-product-page">
              <div className="live-product-nav">
                <button
                  className="button outline"
                  onClick={() => showProduct(null)}
                >
                  <ArrowLeft size={16} /> Back to results
                </button>
                <span>LIVE · Ask anything about {detailProduct.name}</span>
              </div>
              <ProductDetails p={detailProduct} />
            </div>
          ) : !hasIntent ? (
            <span className="sr-only">
              Your requested products will appear here.
            </span>
          ) : (
            <>
              <div className="canvas-heading">
                <div>
                  <span className="eyebrow">
                    YOUR CONVERSATION, TAKING SHAPE
                  </span>
                  <h1>
                    {f.query
                      ? f.query
                      : f.category === 'All electronics'
                        ? 'Something for you.'
                        : f.category + '.'}
                  </h1>
                </div>
                <span className="canvas-count">
                  <span className="green-dot" />
                  {result.length} finds
                  {status === 'searching' ? ' · Refining…' : ''}
                </span>
              </div>
              {refinements}
              {productResults}
              <div className="canvas-footnote">
                <span className={active ? 'green-dot' : ''} />
                {active
                  ? 'Keep talking to refine your finds.'
                  : 'Your finds stay here. Resume whenever you like.'}
              </div>
            </>
          )}
        </main>
        <div className="canvas-bottom">
          <span>Bengaluru · Pre-loved electronics</span>
          <a href="/commerce/search">
            Browse instead <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
    );
  return (
    <>
      <header className="header discovery-header">
        <a href="/commerce/" className="logo">
          loop<span>●</span>
        </a>
        <a href="/commerce/" className="back-link">
          <ArrowLeft size={16} /> Discover
        </a>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            change({ query: input });
          }}
        >
          <Search size={17} />
          <input
            aria-label="Search electronics"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What are you looking for?"
          />
          <button aria-label="Search">
            <ArrowUpRight size={19} />
          </button>
        </form>
        <button
          className={'icon-button ' + (savedOnly ? 'saved' : '')}
          aria-label="Show saved items"
          onClick={() => {
            setSavedOnly(!savedOnly);
            try {
              setSavedIds(
                JSON.parse(localStorage.getItem('loop-saved') || '[]'),
              );
            } catch {
              setSavedIds([]);
            }
          }}
        >
          <Heart size={21} fill={savedOnly ? 'currentColor' : 'none'} />
        </button>
        <LiveEntry onStart={start} />
      </header>
      <main className="container discovery-container">
        <div className="discovery-title">
          <div>
            <span className="eyebrow">GOOD TECH. A NEW CHAPTER.</span>
            <h1>
              {savedOnly
                ? 'Worth keeping.'
                : f.query
                  ? `Your kind of ${f.query}.`
                  : 'Find your next thing.'}
            </h1>
            <p>
              {result.length} pre-loved finds in {f.location}
            </p>
          </div>
          <button className="discovery-live" onClick={start}>
            <span>
              <AudioLines size={22} />
            </span>
            <div>
              <b>Just say the word.</b>
              <small>Try a little live shopping</small>
            </div>
            <ArrowUpRight size={19} />
          </button>
        </div>
        <div className="discovery-toolbar">
          <div className="discovery-categories">
            {categories.map((c) => (
              <button
                key={c}
                className={f.category === c ? 'chosen' : ''}
                onClick={() => change({ category: c })}
              >
                {c === 'All electronics' ? 'All finds' : c}
              </button>
            ))}
          </div>
          <Sheet>
            <SheetTrigger className="button refine-trigger">
              <SlidersHorizontal size={16} /> Refine
            </SheetTrigger>
            <SheetContent side="right" className="p-6 overflow-auto">
              <SheetTitle>Make it your kind of find</SheetTitle>
              <SheetDescription>
                Adjust budget, condition, and location.
              </SheetDescription>
              {filterControls}
              <h3>Sort by</h3>
              <Choice
                label="Sort by"
                value={
                  f.sort === 'low'
                    ? 'Price: low to high'
                    : f.sort === 'high'
                      ? 'Price: high to low'
                      : 'Recommended'
                }
                values={[
                  'Recommended',
                  'Price: low to high',
                  'Price: high to low',
                ]}
                onChange={(v) =>
                  change({
                    sort: v.includes('low to')
                      ? 'low'
                      : v.includes('high to')
                        ? 'high'
                        : 'recommended',
                  })
                }
              />
            </SheetContent>
          </Sheet>
        </div>
        {refinements}
        {productResults}
      </main>
      <Footer />
    </>
  );
}
