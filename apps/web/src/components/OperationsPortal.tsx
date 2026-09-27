import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  BellRing,
  Bus,
  CheckCircle2,
  Clock3,
  Headphones,
  MapPin,
  MessageCircle,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  Siren,
  TrainFront,
  Users,
  WifiOff,
  Zap,
} from 'lucide-react';
import {
  OPERATIONS_BROADCAST_EVENT,
  publishOperationsBroadcast,
  readOperationsBroadcast,
  type OperationsBroadcast,
  type OperationsBroadcastType,
} from '../lib/operationsBroadcast';

type PortalRole = 'passenger' | 'staff';
type BroadcastType = OperationsBroadcastType;

const initialBroadcast: OperationsBroadcast = {
  id: 'demo-initial-update',
  type: 'minor-delay',
  message: 'Karoo Line Maintenance: Minor delay ahead. You are safe. Enjoy local audio folklore while we clear the track.',
  sentAt: new Date().toISOString(),
  sentAtLabel: '05:32',
};

const broadcastLabels: Record<BroadcastType, string> = {
  'minor-delay': 'Minor delay',
  'service-update': 'Service update',
  'all-clear': 'All clear',
};

const arrivalBase = new Date();
arrivalBase.setHours(arrivalBase.getHours() + 2, 10, 0, 0);

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatCoordinate(value: number): string {
  return value.toFixed(4);
}

export function OperationsPortal() {
  const [role, setRole] = useState<PortalRole>(() => (
    new URLSearchParams(window.location.search).get('role') === 'staff' ? 'staff' : 'passenger'
  ));
  const [broadcast, setBroadcast] = useState<OperationsBroadcast>(() => (
    readOperationsBroadcast() ?? initialBroadcast
  ));
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('minor-delay');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [arrivalAdjustment, setArrivalAdjustment] = useState(25);
  const [beaconSaved, setBeaconSaved] = useState(false);
  const [trainProgress, setTrainProgress] = useState(68);
  const [reliefUpdate, setReliefUpdate] = useState<string | null>(null);
  const [strandedPassengers, setStrandedPassengers] = useState(18);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTrainProgress((progress) => (progress >= 99 ? 63 : progress + 0.15));
    }, 8000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncBroadcast = () => {
      const latest = readOperationsBroadcast();
      if (latest) setBroadcast(latest);
    };
    window.addEventListener('storage', syncBroadcast);
    window.addEventListener(OPERATIONS_BROADCAST_EVENT, syncBroadcast);
    return () => {
      window.removeEventListener('storage', syncBroadcast);
      window.removeEventListener(OPERATIONS_BROADCAST_EVENT, syncBroadcast);
    };
  }, []);

  const arrivalTime = useMemo(() => {
    const estimate = new Date(arrivalBase);
    estimate.setMinutes(estimate.getMinutes() + arrivalAdjustment);
    return formatTime(estimate);
  }, [arrivalAdjustment]);

  const trainPosition = useMemo(() => {
    const route = [
      { name: 'Pretoria', lat: -25.7565, lng: 28.1895 },
      { name: 'Kimberley', lat: -28.7383, lng: 24.7645 },
      { name: 'Matjiesfontein', lat: -33.2307, lng: 20.5828 },
      { name: 'Cape Town', lat: -33.9249, lng: 18.4241 },
    ];
    const segment = (trainProgress / 100) * (route.length - 1);
    const index = Math.min(Math.floor(segment), route.length - 2);
    const fraction = segment - index;
    const start = route[index];
    const end = route[index + 1];
    return {
      lat: start.lat + (end.lat - start.lat) * fraction,
      lng: start.lng + (end.lng - start.lng) * fraction,
      from: start.name,
      to: end.name,
    };
  }, [trainProgress]);

  function saveOfflineBeacon() {
    const beacon = {
      createdAt: new Date().toISOString(),
      message: 'Passenger requested assistance while offline.',
      location: 'Trans-Karoo corridor',
    };
    try {
      const saved = JSON.parse(localStorage.getItem('railwaze:emergency-beacons') || '[]') as unknown[];
      localStorage.setItem('railwaze:emergency-beacons', JSON.stringify([...saved, beacon]));
      setBeaconSaved(true);
    } catch (error) {
      console.error('Unable to save emergency beacon locally.', error);
      setBeaconSaved(false);
    }
  }

  function publishBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = broadcastMessage.trim();
    if (!message) return;
    try {
      setBroadcast(publishOperationsBroadcast({
        type: broadcastType,
        message,
        sentAtLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setBroadcastError(null);
    } catch (error) {
      console.error('Unable to publish the passenger update.', error);
      setBroadcastError('This update could not be saved for the passenger app. Check that browser storage is available and try again.');
      return;
    }
    setArrivalAdjustment((adjustment) => (
      broadcastType === 'all-clear' ? Math.max(0, adjustment - 20) : adjustment + (broadcastType === 'minor-delay' ? 10 : 5)
    ));
    setBroadcastMessage('');
  }

  function requestRelief(mode: 'coach' | 'road') {
    const message = mode === 'coach'
      ? 'Two auxiliary coaches requested · estimated arrival in 35 minutes.'
      : 'Road transport dispatched · estimated arrival in 50 minutes.';
    setReliefUpdate(message);
    setStrandedPassengers(0);
  }

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/20">
              <TrainFront size={23} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-400">South African RailWaze</p>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Operations &amp; Reassurance Portal</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 sm:inline-flex sm:items-center sm:gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> DEMO SYSTEM LIVE
            </span>
            <a href="/" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white">
              <ArrowLeft size={16} aria-hidden="true" /> <span className="hidden sm:inline">Back to journey</span><span className="sm:hidden">Back</span>
            </a>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-slate-700/80 bg-[#1e293b] p-4 shadow-xl shadow-black/10 sm:p-5" aria-label="Demo role access">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-white">Role-based portal preview</p>
              <p className="mt-1 text-xs text-slate-400">Switch between the passenger experience and staff operations workspace.</p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900/70 p-1" role="group" aria-label="Choose portal role">
              <button
                type="button"
                aria-pressed={role === 'passenger'}
                onClick={() => setRole('passenger')}
                className={`min-h-10 rounded-lg px-4 text-sm font-bold transition ${role === 'passenger' ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/30' : 'text-slate-400 hover:text-white'}`}
              >
                Passenger
              </button>
              <button
                type="button"
                aria-pressed={role === 'staff'}
                onClick={() => setRole('staff')}
                className={`min-h-10 rounded-lg px-4 text-sm font-bold transition ${role === 'staff' ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/30' : 'text-slate-400 hover:text-white'}`}
              >
                Driver / Receptionist
              </button>
            </div>
          </div>
        </section>

        {role === 'passenger' ? (
          <PassengerView
            broadcast={broadcast}
            arrivalTime={arrivalTime}
            arrivalAdjustment={arrivalAdjustment}
            beaconSaved={beaconSaved}
            onSaveBeacon={saveOfflineBeacon}
            onRefreshEta={() => setArrivalAdjustment((adjustment) => adjustment + 3)}
          />
        ) : (
          <StaffView
            broadcast={broadcast}
            broadcastType={broadcastType}
            broadcastMessage={broadcastMessage}
            trainProgress={trainProgress}
            trainPosition={trainPosition}
            arrivalTime={arrivalTime}
            strandedPassengers={strandedPassengers}
            reliefUpdate={reliefUpdate}
            onTypeChange={setBroadcastType}
            onMessageChange={setBroadcastMessage}
            broadcastError={broadcastError}
            onPublish={publishBroadcast}
            onRequestRelief={requestRelief}
          />
        )}

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 py-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-cyan-400" /> Safety updates are verified by RailWaze Operations.</span>
          <span>PRETORIA <span className="text-amber-500">→</span> CAPE TOWN · DEMO MODE</span>
        </footer>
      </div>
    </main>
  );
}

interface PassengerViewProps {
  broadcast: OperationsBroadcast;
  arrivalTime: string;
  arrivalAdjustment: number;
  beaconSaved: boolean;
  onSaveBeacon: () => void;
  onRefreshEta: () => void;
}

function PassengerView({ broadcast, arrivalTime, arrivalAdjustment, beaconSaved, onSaveBeacon, onRefreshEta }: PassengerViewProps) {
  const isAllClear = broadcast.type === 'all-clear';
  return (
    <section aria-label="Passenger reassurance" className="space-y-5">
      <div className={`relative overflow-hidden rounded-3xl border p-5 shadow-2xl sm:p-8 ${isAllClear ? 'border-emerald-400/30 bg-gradient-to-br from-emerald-950/70 via-[#1e293b] to-[#1e293b]' : 'border-amber-400/30 bg-gradient-to-br from-amber-950/70 via-[#1e293b] to-[#1e293b]'}`}>
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isAllClear ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
            {isAllClear ? <CheckCircle2 size={25} /> : <ShieldCheck size={25} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${isAllClear ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
                {broadcastLabels[broadcast.type]}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-400"><BadgeCheck size={14} className="text-cyan-400" /> Verified by RailWaze Operations · {broadcast.sentAtLabel}</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl">Your journey is in good hands.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{broadcast.message}</p>
            <div className="mt-5 flex items-start gap-2 text-sm text-cyan-200">
              <Headphones size={18} className="mt-0.5 shrink-0 text-cyan-400" />
              <span>Stay comfortable with offline-ready local audio folklore while the crew works.</span>
            </div>
          </div>
        </div>
      </div>

      <a href="/" className="group flex flex-col justify-between gap-4 rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-950/60 to-slate-800 px-5 py-4 transition hover:border-cyan-300/50 sm:flex-row sm:items-center sm:px-6">
        <span className="flex items-start gap-3">
          <span className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300"><MessageCircle size={20} /></span>
          <span>
            <span className="block font-bold text-white">You can continue enjoying your journey.</span>
            <span className="mt-1 block text-sm text-slate-400">Your map, station stories, and journey tools are ready whenever you are.</span>
          </span>
        </span>
        <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-bold text-slate-950 transition group-hover:bg-cyan-300">
          <ArrowLeft size={16} className="rotate-180" /> Return to my journey
        </span>
      </a>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-slate-700 bg-[#1e293b] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Updated arrival estimate</p>
              <p className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">{arrivalTime}</p>
              <p className="mt-2 text-sm text-slate-400">Cape Town · Platform information will follow on approach</p>
            </div>
            <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-300"><Clock3 size={24} /></div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-4">
            <span className="inline-flex items-center gap-2 text-sm text-amber-300"><Activity size={16} /> {arrivalAdjustment} min operational adjustment</span>
            <button type="button" onClick={onRefreshEta} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-600 px-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200">
              <RefreshCw size={15} /> Refresh estimate
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-700 bg-[#1e293b] p-5 sm:p-6">
          <div className="flex gap-4">
            <div className="rounded-2xl bg-rose-400/10 p-3 text-rose-300"><WifiOff size={23} /></div>
            <div>
              <h3 className="font-bold text-white">Offline Emergency Beacon</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">No signal? Save an assistance request securely on this device. It can be shared with staff when connectivity returns.</p>
            </div>
          </div>
          <button type="button" onClick={onSaveBeacon} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 font-bold text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300">
            <Siren size={18} /> {beaconSaved ? 'Beacon saved on this device' : 'Save offline assistance request'}
          </button>
          {beaconSaved && <p role="status" className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={16} /> Your request is saved locally for the crew.</p>}
          <p className="mt-3 text-[11px] text-slate-500">This demo stores a local request only; it does not contact emergency services.</p>
        </article>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <JourneyInfo icon={TrainFront} label="Your train" value="Trans-Karoo 401" detail="On the main corridor" />
        <JourneyInfo icon={MapPin} label="Next major stop" value="Matjiesfontein" detail="Approximately 142 km ahead" />
        <JourneyInfo icon={BellRing} label="Next update" value="In 10 minutes" detail="Or sooner if conditions change" />
      </div>
    </section>
  );
}

interface TrainPosition {
  lat: number;
  lng: number;
  from: string;
  to: string;
}

interface StaffViewProps {
  broadcast: OperationsBroadcast;
  broadcastType: BroadcastType;
  broadcastMessage: string;
  broadcastError: string | null;
  trainProgress: number;
  trainPosition: TrainPosition;
  arrivalTime: string;
  strandedPassengers: number;
  reliefUpdate: string | null;
  onTypeChange: (type: BroadcastType) => void;
  onMessageChange: (message: string) => void;
  onPublish: (event: FormEvent<HTMLFormElement>) => void;
  onRequestRelief: (mode: 'coach' | 'road') => void;
}

function StaffView({
  broadcast,
  broadcastType,
  broadcastMessage,
  trainProgress,
  trainPosition,
  arrivalTime,
  strandedPassengers,
  reliefUpdate,
  onTypeChange,
  onMessageChange,
  broadcastError,
  onPublish,
  onRequestRelief,
}: StaffViewProps) {
  return (
    <section aria-label="Staff operations dashboard" className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-700 bg-[#1e293b]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-5 py-4">
            <div>
              <div className="flex items-center gap-2"><Radio size={17} className="text-cyan-400" /><h2 className="font-bold text-white">Live corridor overview</h2></div>
              <p className="mt-1 text-xs text-slate-400">Trans-Karoo 401 · Simulated GPS telemetry</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> GPS LIVE</span>
          </div>
          <div className="relative overflow-hidden bg-slate-950/70 px-5 py-7 sm:px-8">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,.2) 1px, transparent 1px)', backgroundSize: '34px 34px' }} />
            <div className="relative">
              <div className="mb-6 flex justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"><span>Pretoria</span><span>Kimberley</span><span>Matjiesfontein</span><span>Cape Town</span></div>
              <div className="relative h-3 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-cyan-400 to-cyan-300" style={{ width: `${trainProgress}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-700" style={{ left: `calc(${trainProgress}% - 18px)` }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-950 bg-amber-400 text-slate-950 shadow-[0_0_24px_rgba(245,158,11,.5)]"><TrainFront size={18} /></div>
                </div>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <Telemetry label="CURRENT SECTOR" value={`${trainPosition.from} → ${trainPosition.to}`} />
                <Telemetry label="GPS COORDINATES" value={`${formatCoordinate(trainPosition.lat)}°, ${formatCoordinate(trainPosition.lng)}°`} />
                <Telemetry label="CORRIDOR PROGRESS" value={`${trainProgress.toFixed(1)}% complete`} />
              </div>
            </div>
          </div>
          <div className="grid divide-y divide-slate-700 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatusMetric icon={Activity} label="Train status" value="Running · 25 min delay" accent="text-amber-300" />
            <StatusMetric icon={Clock3} label="Cape Town ETA" value={arrivalTime} accent="text-cyan-300" />
            <StatusMetric icon={Users} label="Passengers on board" value="284 travellers" accent="text-white" />
          </div>
        </article>

        <article className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-950/40 to-[#1e293b] p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300"><Radio size={20} /></div>
            <div><h2 className="font-bold text-white">Incident broadcast</h2><p className="text-xs text-slate-400">Verified passenger update channel</p></div>
          </div>
          <form onSubmit={onPublish} className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="broadcast-type">Update category</label>
            <select id="broadcast-type" value={broadcastType} onChange={(event) => onTypeChange(event.target.value as BroadcastType)} className="min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400">
              <option value="minor-delay">Minor delay</option>
              <option value="service-update">Service update</option>
              <option value="all-clear">All clear</option>
            </select>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="broadcast-message">Passenger message</label>
            <textarea id="broadcast-message" required rows={4} maxLength={240} value={broadcastMessage} onChange={(event) => onMessageChange(event.target.value)} placeholder="Write a clear, reassuring update for passengers…" className="w-full resize-y rounded-xl border border-slate-600 bg-slate-950/60 p-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400" />
            <div className="flex items-center justify-between text-[11px] text-slate-500"><span>Keep it clear, calm, and factual.</span><span>{broadcastMessage.length}/240</span></div>
            <button type="submit" disabled={!broadcastMessage.trim()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"><Send size={17} /> Publish verified update</button>
          </form>
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/40 p-3">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300"><BadgeCheck size={13} /> Last passenger update · {broadcast.sentAtLabel}</div>
            <p className="text-xs leading-5 text-slate-300">{broadcast.message}</p>
          </div>
          {broadcastError && <p role="alert" className="mt-3 text-sm text-rose-300">{broadcastError}</p>}
        </article>
      </div>

      <article className="rounded-2xl border border-slate-700 bg-[#1e293b] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-xl bg-amber-400/10 p-2.5 text-amber-300"><Users size={21} /></div>
            <div><h2 className="font-bold text-white">Relief transport manifest</h2><p className="mt-1 text-sm text-slate-400">Support travellers affected by the line hold near Matjiesfontein.</p></div>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-right">
            <p className="text-2xl font-black text-amber-300">{strandedPassengers}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/70">Passengers awaiting relief</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <ReliefOption icon={TrainFront} title="Auxiliary coaches" detail="Request 2 coaches · capacity 108 · approx. 35 min" button="Request auxiliary coaches" onClick={() => onRequestRelief('coach')} />
          <ReliefOption icon={Bus} title="Road transport" detail="Dispatch 3 shuttle buses · capacity 54 · approx. 50 min" button="Dispatch road transport" onClick={() => onRequestRelief('road')} />
        </div>
        {reliefUpdate && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 size={17} /> {reliefUpdate}</p>}
      </article>
    </section>
  );
}

function JourneyInfo({ icon: Icon, label, value, detail }: { icon: typeof TrainFront; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-[#1e293b] p-4">
      <div className="mb-3 flex items-center gap-2 text-cyan-300"><Icon size={17} /><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span></div>
      <p className="font-bold text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function Telemetry({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"><p className="text-[9px] font-bold tracking-widest text-slate-500">{label}</p><p className="mt-1 font-mono text-xs text-cyan-200">{value}</p></div>;
}

function StatusMetric({ icon: Icon, label, value, accent }: { icon: typeof Activity; label: string; value: string; accent: string }) {
  return <div className="flex items-center gap-3 p-4"><Icon size={18} className={accent} /><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p><p className={`mt-1 text-sm font-semibold ${accent}`}>{value}</p></div></div>;
}

function ReliefOption({ icon: Icon, title, detail, button, onClick }: { icon: typeof TrainFront; title: string; detail: string; button: string; onClick: () => void }) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/40 p-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3"><div className="rounded-lg bg-slate-800 p-2 text-cyan-300"><Icon size={19} /></div><div><p className="font-semibold text-white">{title}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div></div>
      <button type="button" onClick={onClick} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 text-xs font-bold text-slate-200 transition hover:border-amber-400/50 hover:bg-amber-400/10 hover:text-amber-200"><Zap size={14} />{button}</button>
    </div>
  );
}
